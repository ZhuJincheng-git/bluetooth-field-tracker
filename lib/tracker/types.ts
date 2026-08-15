/**
 * Bluetooth Field Tracker 的领域模型。
 *
 * 这些类型不依赖 UI 或任意原生实现，因此扫描器、位置适配器、存储层和视图层
 * 可以围绕同一份不可变数据契约演进。
 */

export type ScanLifecycle = "idle" | "starting" | "scanning" | "stopping" | "error";

export type DirectionHint = "ahead" | "behind" | "unknown";

export type ConfidenceLevel = "low" | "medium" | "high";

export type DistanceBand = "near" | "medium" | "far" | "unknown";

export interface LocationSnapshot {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  altitudeM: number | null;
  speedMps: number | null;
  headingDegrees: number | null;
  capturedAt: number;
}

export interface BluetoothDeviceIdentity {
  /** 由 Android BLE 栈提供的稳定设备标识；导出时仅在用户明确选择时保留原始值。 */
  id: string;
  name: string | null;
  localName: string | null;
  serviceUuids: string[] | null;
}

export interface DeviceObservation {
  id: string;
  sessionId: string;
  device: BluetoothDeviceIdentity;
  rssi: number | null;
  txPowerLevel: number | null;
  observedAt: number;
  location: LocationSnapshot | null;
}

export interface ScanSession {
  id: string;
  startedAt: number;
  stoppedAt: number | null;
  lifecycle: ScanLifecycle;
  backgroundTrackingRequested: boolean;
  observationCount: number;
}

export interface DirectionEstimate {
  direction: DirectionHint;
  confidence: ConfidenceLevel;
  distanceBand: DistanceBand;
  rationale: string;
  samplesUsed: number;
  updatedAt: number;
}

export interface TrackedDeviceSummary {
  device: BluetoothDeviceIdentity;
  lastRssi: number | null;
  lastSeenAt: number;
  observationCount: number;
  estimate: DirectionEstimate;
}

export interface PermissionStatus {
  bluetooth: "unknown" | "granted" | "denied";
  locationForeground: "unknown" | "granted" | "denied";
  locationBackground: "unknown" | "granted" | "denied";
  notifications: "unknown" | "granted" | "denied";
}

export interface TrackerPreferences {
  observationThrottleMs: number;
  locationIntervalMs: number;
  locationDistanceIntervalM: number;
  requestBackgroundTracking: boolean;
}

export const DEFAULT_TRACKER_PREFERENCES: TrackerPreferences = {
  observationThrottleMs: 2_000,
  locationIntervalMs: 10_000,
  locationDistanceIntervalM: 10,
  requestBackgroundTracking: true,
};

export interface TrackerSnapshot {
  lifecycle: ScanLifecycle;
  activeSession: ScanSession | null;
  latestLocation: LocationSnapshot | null;
  permissions: PermissionStatus;
  devices: TrackedDeviceSummary[];
  lastError: string | null;
}
