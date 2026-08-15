import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";

import { clearTrackerState, loadTrackerState, saveTrackerState } from "@/lib/tracker/storage";
import { summarizeDeviceObservations } from "@/lib/tracker/selectors";
import {
  createInitialTrackerState,
  trackerReducer,
  type PersistedTrackerState,
  type TrackerState,
} from "@/lib/tracker/state";
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
} from "@/lib/tracker/types";

/** @deprecated 从 `selectors.ts` 导入；为现有路由提供过渡兼容。 */
export { summarizeDeviceObservations } from "@/lib/tracker/selectors";

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface TrackerContextValue {
  state: TrackerState;
  startSession: () => ScanSession;
  stopSession: () => void;
  setLifecycle: (lifecycle: ScanLifecycle, error?: string | null) => void;
  setPermissions: (permissions: Partial<PermissionStatus>) => void;
  setLatestLocation: (location: LocationSnapshot | null) => void;
  setLocationQuality: (quality: LocationQuality) => void;
  setLatestMotion: (motion: MotionSnapshot | null) => void;
  recordObservation: (observation: Omit<DeviceObservation, "id" | "sessionId">) => void;
  setPreferences: (preferences: TrackerPreferences) => void;
  deleteSession: (sessionId: string) => void;
  clearHistory: () => Promise<void>;
}

const TrackerContext = createContext<TrackerContextValue | null>(null);

/**
 * React 适配层：负责把纯状态机连接到 AsyncStorage 与原生扫描回调。
 *
 * 领域规则位于 `state.ts` / `selectors.ts`；这里不实现估算、汇总或业务决策。
 */
export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(trackerReducer, undefined, createInitialTrackerState);
  const activeSessionRef = useRef<ScanSession | null>(null);
  const observationsRef = useRef<DeviceObservation[]>([]);
  const preferencesRef = useRef<TrackerPreferences>(DEFAULT_TRACKER_PREFERENCES);

  useEffect(() => {
    activeSessionRef.current = state.activeSession;
    observationsRef.current = state.observations;
    preferencesRef.current = state.preferences;
  }, [state.activeSession, state.observations, state.preferences]);

  useEffect(() => {
    void loadTrackerState<PersistedTrackerState>().then((stored) => {
      dispatch({
        type: "hydrate",
        payload: stored ?? { sessions: [], observations: [], preferences: DEFAULT_TRACKER_PREFERENCES },
      });
    });
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    const payload: PersistedTrackerState = {
      sessions: state.sessions,
      observations: state.observations,
      preferences: state.preferences,
    };
    void saveTrackerState(payload);
  }, [state.hydrated, state.observations, state.preferences, state.sessions]);

  const startSession = useCallback(() => {
    const session: ScanSession = {
      id: createId("session"),
      startedAt: Date.now(),
      stoppedAt: null,
      lifecycle: "scanning",
      backgroundTrackingRequested: preferencesRef.current.requestBackgroundTracking,
      observationCount: 0,
    };
    activeSessionRef.current = session;
    dispatch({ type: "start", session });
    return session;
  }, []);

  const stopSession = useCallback(() => {
    activeSessionRef.current = null;
    dispatch({ type: "stop", stoppedAt: Date.now() });
  }, []);

  const recordObservation = useCallback((observation: Omit<DeviceObservation, "id" | "sessionId">) => {
    const activeSession = activeSessionRef.current;
    if (!activeSession) return;
    const sessionRecordCount = observationsRef.current.filter((item) => item.sessionId === activeSession.id).length;
    if (sessionRecordCount >= preferencesRef.current.maxRecordsPerSession) return;

    const complete: DeviceObservation = {
      ...observation,
      id: createId("observation"),
      sessionId: activeSession.id,
    };
    observationsRef.current = [...observationsRef.current, complete];
    dispatch({ type: "recordObservation", observation: complete });
  }, []);

  const value = useMemo<TrackerContextValue>(
    () => ({
      state,
      startSession,
      stopSession,
      setLifecycle: (lifecycle, error) => dispatch({ type: "setLifecycle", lifecycle, error }),
      setPermissions: (permissions) => dispatch({ type: "setPermissions", permissions }),
      setLatestLocation: (location) => dispatch({ type: "setLocation", location }),
      setLocationQuality: (quality) => dispatch({ type: "setLocationQuality", quality }),
      setLatestMotion: (motion) => dispatch({ type: "setMotion", motion }),
      recordObservation,
      setPreferences: (preferences) => dispatch({ type: "setPreferences", preferences }),
      deleteSession: (sessionId) => {
        if (activeSessionRef.current?.id === sessionId) return;
        observationsRef.current = observationsRef.current.filter((observation) => observation.sessionId !== sessionId);
        dispatch({ type: "deleteSession", sessionId });
      },
      clearHistory: async () => {
        await clearTrackerState();
        activeSessionRef.current = null;
        observationsRef.current = [];
        dispatch({ type: "clear" });
      },
    }),
    [recordObservation, startSession, state, stopSession],
  );

  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>;
}

export function useTracker(): TrackerContextValue {
  const value = useContext(TrackerContext);
  if (!value) throw new Error("useTracker must be used inside TrackerProvider");
  return value;
}
