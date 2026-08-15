import type {
  DeviceObservation,
  LocationQuality,
  LocationSnapshot,
  MotionSnapshot,
  PermissionStatus,
  TrackerPreferences,
} from "./types";

/** 原生层推送给应用层的事件契约。 */
export interface NativeTrackerCallbacks {
  onLocation: (location: LocationSnapshot) => void;
  onLocationQuality: (quality: LocationQuality) => void;
  onMotion: (motion: MotionSnapshot) => void;
  onObservation: (observation: Omit<DeviceObservation, "id" | "sessionId">) => void;
}

/**
 * 应用层需要的最小原生能力。
 *
 * 任何 BLE/定位实现都必须满足该端口；控制器不依赖具体的 Expo 或 React Native 模块。
 */
export interface NativeTrackingPort {
  requestRequiredPermissions: (requestBackgroundTracking: boolean) => Promise<PermissionStatus>;
  start: (preferences: TrackerPreferences, callbacks: NativeTrackerCallbacks) => Promise<void>;
  stop: () => Promise<void>;
  updatePreferences: (preferences: TrackerPreferences) => void;
}
