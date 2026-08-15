import { summarizeDeviceObservations } from "./selectors";
import {
  DEFAULT_TRACKER_PREFERENCES,
  type DeviceObservation,
  type LocationQuality,
  type LocationSnapshot,
  type MotionSnapshot,
  type PermissionStatus,
  type ScanLifecycle,
  type ScanSession,
  type TrackerPreferences,
  type TrackerSnapshot,
} from "./types";

/** 仅保存在设备上的数据；运行状态绝不写入持久化。 */
export interface PersistedTrackerState {
  sessions: ScanSession[];
  observations: DeviceObservation[];
  preferences: TrackerPreferences;
}

/** UI 与应用服务共享的内存状态。 */
export interface TrackerState extends PersistedTrackerState, TrackerSnapshot {
  hydrated: boolean;
}

export type TrackerAction =
  | { type: "hydrate"; payload: PersistedTrackerState }
  | { type: "start"; session: ScanSession }
  | { type: "stop"; stoppedAt: number }
  | { type: "setLifecycle"; lifecycle: ScanLifecycle; error?: string | null }
  | { type: "setPermissions"; permissions: Partial<PermissionStatus> }
  | { type: "setLocation"; location: LocationSnapshot | null }
  | { type: "setLocationQuality"; quality: LocationQuality }
  | { type: "setMotion"; motion: MotionSnapshot | null }
  | { type: "recordObservation"; observation: DeviceObservation }
  | { type: "setPreferences"; preferences: TrackerPreferences }
  | { type: "deleteSession"; sessionId: string }
  | { type: "clear" };

const INITIAL_PERMISSIONS: PermissionStatus = {
  bluetooth: "unknown",
  locationForeground: "unknown",
  locationBackground: "unknown",
  notifications: "unknown",
};

export function createInitialTrackerState(): TrackerState {
  return {
    hydrated: false,
    lifecycle: "idle",
    activeSession: null,
    latestLocation: null,
    locationQuality: "waiting",
    latestMotion: null,
    permissions: INITIAL_PERMISSIONS,
    devices: [],
    lastError: null,
    sessions: [],
    observations: [],
    preferences: DEFAULT_TRACKER_PREFERENCES,
  };
}

export function trackerReducer(state: TrackerState, action: TrackerAction): TrackerState {
  switch (action.type) {
    case "hydrate": {
      const preferences = { ...DEFAULT_TRACKER_PREFERENCES, ...action.payload.preferences };
      return {
        ...state,
        ...action.payload,
        preferences,
        devices: summarizeDeviceObservations(action.payload.observations),
        hydrated: true,
      };
    }
    case "start":
      return {
        ...state,
        lifecycle: "scanning",
        locationQuality: "waiting",
        activeSession: action.session,
        sessions: [action.session, ...state.sessions],
        lastError: null,
      };
    case "stop": {
      const sessions = state.sessions.map((session) =>
        session.id === state.activeSession?.id ? { ...session, stoppedAt: action.stoppedAt, lifecycle: "idle" as const } : session,
      );
      return { ...state, lifecycle: "idle", activeSession: null, sessions };
    }
    case "setLifecycle":
      return { ...state, lifecycle: action.lifecycle, lastError: action.error ?? null };
    case "setPermissions":
      return { ...state, permissions: { ...state.permissions, ...action.permissions } };
    case "setLocation":
      return { ...state, latestLocation: action.location };
    case "setLocationQuality":
      return { ...state, locationQuality: action.quality };
    case "setMotion":
      return { ...state, latestMotion: action.motion };
    case "recordObservation": {
      const observations = [...state.observations, action.observation];
      const sessions = state.sessions.map((session) =>
        session.id === action.observation.sessionId ? { ...session, observationCount: session.observationCount + 1 } : session,
      );
      const activeSession = state.activeSession
        ? sessions.find((session) => session.id === state.activeSession?.id) ?? state.activeSession
        : null;
      return { ...state, observations, sessions, activeSession, devices: summarizeDeviceObservations(observations) };
    }
    case "setPreferences":
      return { ...state, preferences: action.preferences };
    case "deleteSession": {
      const sessions = state.sessions.filter((session) => session.id !== action.sessionId);
      const observations = state.observations.filter((observation) => observation.sessionId !== action.sessionId);
      return { ...state, sessions, observations, devices: summarizeDeviceObservations(observations) };
    }
    case "clear":
      return { ...createInitialTrackerState(), hydrated: true };
  }
}
