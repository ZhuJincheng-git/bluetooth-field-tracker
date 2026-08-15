import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { DeviceMotion, Magnetometer } from "expo-sensors";
import BackgroundService from "react-native-background-actions";
import { BleManager, State, type Device } from "react-native-ble-plx";
import { PermissionsAndroid, Platform } from "react-native";

import { BACKGROUND_LOCATION_TASK, toSnapshot } from "@/lib/tracker/background-location-task";
import { assessLocationQuality, shouldPublishLocation } from "@/lib/tracker/location-quality";
import type { NativeTrackerCallbacks } from "@/lib/tracker/ports";
import type { BluetoothDeviceIdentity, DeviceObservation, LocationSnapshot, MotionSnapshot, PermissionStatus, TrackerPreferences } from "@/lib/tracker/types";

const delay = (durationMs: number) => new Promise<void>((resolve) => setTimeout(resolve, durationMs));

function magneticHeadingDegrees(x: number, y: number): number {
  const angle = (Math.atan2(y, x) * 180) / Math.PI;
  return ((360 - angle) % 360 + 360) % 360;
}

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

export class NativeTrackerService {
  private bleManager: BleManager | null = null;
  private latestLocation: LocationSnapshot | null = null;
  private latestMotion: MotionSnapshot | null = null;
  private locationSubscription: Location.LocationSubscription | null = null;
  private headingSubscription: Location.LocationSubscription | null = null;
  private motionSubscription: { remove: () => void } | null = null;
  private magnetometerSubscription: { remove: () => void } | null = null;
  private lastRecordedAtByDevice = new Map<string, number>();
  private activePreferences: TrackerPreferences | null = null;
  private isScanning = false;

  /**
   * 仅更新无需重建 Android 订阅的运行时选项。
   * 定位模式、刷新频率与后台服务需要在下一次扫描启动时重新创建原生订阅。
   */
  updatePreferences(preferences: TrackerPreferences): void {
    this.activePreferences = preferences;
  }

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
    this.activePreferences = preferences;

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

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) callbacks.onLocationQuality("servicesOff");
      const locationAccuracy = preferences.locationAccuracyMode === "high" ? Location.Accuracy.High : Location.Accuracy.Balanced;
      const updateLocation = (location: Location.LocationObject) => {
        const next = toSnapshot(location);
        const previous = this.latestLocation;
        const quality = assessLocationQuality(previous, next, (this.activePreferences ?? preferences).maxLocationAccuracyM);
        if (!shouldPublishLocation(quality)) {
          callbacks.onLocationQuality(quality);
          return;
        }
        if (previous) {
          const elapsedSeconds = Math.max(0.001, (next.capturedAt - previous.capturedAt) / 1_000);
          const latitudeDelta = (next.latitude - previous.latitude) * 111_320;
          const longitudeDelta = (next.longitude - previous.longitude) * 111_320 * Math.cos((next.latitude * Math.PI) / 180);
          const distance = Math.hypot(latitudeDelta, longitudeDelta);
          if (distance >= 1) {
            const inferredHeading = (Math.atan2(longitudeDelta, latitudeDelta) * 180) / Math.PI;
            if (next.speedMps == null || next.speedMps <= 0) {
              next.speedMps = distance / elapsedSeconds;
              next.speedSource = "coordinate";
            }
            if (next.headingDegrees == null || next.headingDegrees < 0 || (next.headingDegrees === 0 && inferredHeading > 5)) {
              next.headingDegrees = inferredHeading < 0 ? inferredHeading + 360 : inferredHeading;
            }
          }
        }
        this.latestLocation = next;
        callbacks.onLocation(next);
        callbacks.onLocationQuality(quality);
      };

      const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 30_000, requiredAccuracy: preferences.maxLocationAccuracyM });
      if (lastKnown) updateLocation(lastKnown);
      void Location.getCurrentPositionAsync({ accuracy: locationAccuracy, mayShowUserSettingsDialog: false })
        .then(updateLocation)
        .catch(() => undefined);

      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: locationAccuracy,
          timeInterval: Math.max(1_000, preferences.locationIntervalMs),
          distanceInterval: preferences.locationDistanceIntervalM,
          mayShowUserSettingsDialog: false,
        },
        updateLocation,
        () => callbacks.onLocationQuality("servicesOff"),
      );

      this.headingSubscription = await Location.watchHeadingAsync((heading) => {
        const phoneHeadingDegrees = heading.trueHeading >= 0 ? heading.trueHeading : heading.magHeading;
        this.latestMotion = { ...this.latestMotion, phoneHeadingDegrees, headingSource: "location", movementIntensityMps2: this.latestMotion?.movementIntensityMps2 ?? null, magneticFieldUt: this.latestMotion?.magneticFieldUt ?? null, capturedAt: Date.now() };
        callbacks.onMotion(this.latestMotion);
      });

      if (await DeviceMotion.isAvailableAsync()) {
        DeviceMotion.setUpdateInterval(200);
        this.motionSubscription = DeviceMotion.addListener((motion) => {
          const acceleration = motion.acceleration;
          const movementIntensityMps2 = acceleration ? Math.hypot(acceleration.x, acceleration.y, acceleration.z) : null;
          this.latestMotion = { ...this.latestMotion, phoneHeadingDegrees: this.latestMotion?.phoneHeadingDegrees ?? null, headingSource: this.latestMotion?.headingSource ?? "unknown", movementIntensityMps2, magneticFieldUt: this.latestMotion?.magneticFieldUt ?? null, capturedAt: Date.now() };
          callbacks.onMotion(this.latestMotion);
        });
      }

      if (await Magnetometer.isAvailableAsync()) {
        Magnetometer.setUpdateInterval(200);
        this.magnetometerSubscription = Magnetometer.addListener((field) => {
          const magneticFieldUt = Math.hypot(field.x, field.y, field.z);
          this.latestMotion = {
            ...this.latestMotion,
            phoneHeadingDegrees: magneticHeadingDegrees(field.x, field.y),
            headingSource: "magnetometer",
            movementIntensityMps2: this.latestMotion?.movementIntensityMps2 ?? null,
            magneticFieldUt,
            capturedAt: Date.now(),
          };
          callbacks.onMotion(this.latestMotion);
        });
      }

      if (preferences.requestBackgroundTracking) {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        if (!hasStarted) {
          await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
            accuracy: locationAccuracy,
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
        const runtimePreferences = this.activePreferences ?? preferences;
        if (runtimePreferences.onlyNamedDevices && !device.name && !device.localName) return;
        if (device.rssi != null && device.rssi < runtimePreferences.minimumRssiDbm) return;
        const previous = this.lastRecordedAtByDevice.get(device.id) ?? 0;
        if (Date.now() - previous < runtimePreferences.observationThrottleMs) return;
        this.lastRecordedAtByDevice.set(device.id, Date.now());
        callbacks.onObservation({
          device: toIdentity(device),
          rssi: device.rssi ?? null,
          txPowerLevel: device.txPowerLevel ?? null,
          observedAt: Date.now(),
          location: this.latestLocation,
          motion: this.latestMotion,
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
    this.headingSubscription?.remove();
    this.headingSubscription = null;
    this.motionSubscription?.remove();
    this.motionSubscription = null;
    this.magnetometerSubscription?.remove();
    this.magnetometerSubscription = null;
    this.latestMotion = null;
    this.activePreferences = null;

    if (Platform.OS === "android") {
      const locationUpdatesRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (locationUpdatesRunning) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (BackgroundService.isRunning()) await BackgroundService.stop();
    }
  }
}

export const nativeTrackerService = new NativeTrackerService();
