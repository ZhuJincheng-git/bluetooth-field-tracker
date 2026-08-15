import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import BackgroundService from "react-native-background-actions";
import { BleManager, State, type Device } from "react-native-ble-plx";
import { PermissionsAndroid, Platform } from "react-native";

import { BACKGROUND_LOCATION_TASK, toSnapshot } from "@/lib/tracker/background-location-task";
import type { BluetoothDeviceIdentity, DeviceObservation, LocationSnapshot, PermissionStatus, TrackerPreferences } from "@/lib/tracker/types";

const delay = (durationMs: number) => new Promise<void>((resolve) => setTimeout(resolve, durationMs));

async function foregroundKeepAliveTask(): Promise<void> {
  while (BackgroundService.isRunning()) {
    await delay(15_000);
  }
}

function granted(value: string): boolean {
  return value === PermissionsAndroid.RESULTS.GRANTED;
}

function toIdentity(device: Device): BluetoothDeviceIdentity {
  return {
    id: device.id,
    name: device.name ?? null,
    localName: device.localName ?? null,
    serviceUuids: device.serviceUUIDs ?? null,
  };
}

function backgroundError(error: unknown): Error {
  return error instanceof Error ? error : new Error("无法启动采集服务。");
}

export interface NativeTrackerCallbacks {
  onLocation: (location: LocationSnapshot) => void;
  onObservation: (observation: Omit<DeviceObservation, "id" | "sessionId">) => void;
}

export class NativeTrackerService {
  private bleManager: BleManager | null = null;
  private latestLocation: LocationSnapshot | null = null;
  private locationSubscription: Location.LocationSubscription | null = null;
  private lastRecordedAtByDevice = new Map<string, number>();
  private isScanning = false;

  async requestRequiredPermissions(requestBackgroundTracking: boolean): Promise<PermissionStatus> {
    if (Platform.OS !== "android") {
      return { bluetooth: "denied", locationForeground: "denied", locationBackground: "denied", notifications: "denied" };
    }

    await Notifications.setNotificationChannelAsync("tracker", {
      name: "持续采集",
      description: "显示 Bluetooth Field Tracker 正在进行后台采集。",
      importance: Notifications.AndroidImportance.LOW,
      sound: undefined,
      vibrationPattern: [],
    });
    const notification = await Notifications.requestPermissionsAsync();

    const bluetoothResults = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    const bluetooth = granted(bluetoothResults[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]) && granted(bluetoothResults[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]) ? "granted" : "denied";

    const foregroundLocation = await Location.requestForegroundPermissionsAsync();
    let background: "unknown" | "granted" | "denied" = "unknown";
    if (requestBackgroundTracking && foregroundLocation.status === "granted") {
      const backgroundLocation = await Location.requestBackgroundPermissionsAsync();
      background = backgroundLocation.status === "granted" ? "granted" : "denied";
    }

    return {
      bluetooth,
      locationForeground: foregroundLocation.status === "granted" ? "granted" : "denied",
      locationBackground: background,
      notifications: notification.status === "granted" ? "granted" : "denied",
    };
  }

  async start(preferences: TrackerPreferences, callbacks: NativeTrackerCallbacks): Promise<void> {
    if (Platform.OS !== "android") {
      throw new Error("BLE 连续扫描仅支持 Android 开发构建或发布构建。浏览器预览不具备蓝牙扫描能力。");
    }
    if (this.isScanning) return;

    try {
      if (preferences.requestBackgroundTracking) {
        await BackgroundService.start(foregroundKeepAliveTask, {
          taskName: "Bluetooth Field Tracker",
          taskTitle: "正在采集蓝牙与位置",
          taskDesc: "点按可返回应用并停止采集。",
          taskIcon: { name: "ic_launcher", type: "mipmap" },
          color: "#006C5F",
          foregroundServiceType: ["location", "connectedDevice"],
        });
      }

      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: preferences.locationIntervalMs,
          distanceInterval: preferences.locationDistanceIntervalM,
          mayShowUserSettingsDialog: true,
        },
        (location) => {
          this.latestLocation = toSnapshot(location);
          callbacks.onLocation(this.latestLocation);
        },
      );

      if (preferences.requestBackgroundTracking) {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        if (!hasStarted) {
          await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: preferences.locationIntervalMs,
            distanceInterval: preferences.locationDistanceIntervalM,
            foregroundService: {
              notificationTitle: "Bluetooth Field Tracker 正在记录位置",
              notificationBody: "此通知用于在后台记录每条蓝牙观测的当前位置。",
              notificationColor: "#006C5F",
            },
          });
        }
      }

      this.bleManager = new BleManager();
      const adapterState = await this.bleManager.state();
      if (adapterState !== State.PoweredOn) {
        throw new Error("蓝牙未开启。请打开系统蓝牙后重试。");
      }

      this.isScanning = true;
      await this.bleManager.startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
        if (error) {
          this.isScanning = false;
          return;
        }
        if (!device || !this.isScanning) return;
        const previous = this.lastRecordedAtByDevice.get(device.id) ?? 0;
        if (Date.now() - previous < preferences.observationThrottleMs) return;
        this.lastRecordedAtByDevice.set(device.id, Date.now());
        callbacks.onObservation({
          device: toIdentity(device),
          rssi: device.rssi ?? null,
          txPowerLevel: device.txPowerLevel ?? null,
          observedAt: Date.now(),
          location: this.latestLocation,
        });
      });
    } catch (error) {
      await this.stop();
      throw backgroundError(error);
    }
  }

  async stop(): Promise<void> {
    this.isScanning = false;
    this.lastRecordedAtByDevice.clear();
    await this.bleManager?.stopDeviceScan();
    this.bleManager?.destroy();
    this.bleManager = null;
    this.locationSubscription?.remove();
    this.locationSubscription = null;

    if (Platform.OS === "android") {
      const locationUpdatesRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (locationUpdatesRunning) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (BackgroundService.isRunning()) await BackgroundService.stop();
    }
  }
}

export const nativeTrackerService = new NativeTrackerService();
