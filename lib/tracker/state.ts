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
  /**
   * Action 是状态变化的唯一入口。页面和原生回调不应直接改 state，
   * 因为集中入口才能在测试中验证一次动作影响了哪些字段。
   */
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
  // 这个函数而非共享对象字面量，避免 reset 后意外复用可变对象引用。
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
  // Reducer 必须保持纯净：不能在这里请求权限、写 AsyncStorage 或调用 BLE。
  // 这样相同输入永远产生相同输出，适合用单元测试覆盖。
  switch (action.type) {
    case "hydrate": {
      // 合并默认值是简易迁移策略：旧版本没有的新偏好会自然得到安全默认值。
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
      // 先更新“事实表”，再由同一份 observations 推导摘要，避免计数和列表不一致。
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
      // 会话是观测的所有者。删除会话必须级联删除该会话的观测，但绝不能影响其他会话。
      const sessions = state.sessions.filter((session) => session.id !== action.sessionId);
      const observations = state.observations.filter((observation) => observation.sessionId !== action.sessionId);
      return { ...state, sessions, observations, devices: summarizeDeviceObservations(observations) };
    }
    case "clear":
      return { ...createInitialTrackerState(), hydrated: true };
  }
}
