import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";

import { clearTrackerState, loadTrackerState, saveTrackerState } from "@/lib/tracker/storage";
import { estimateDirection, estimateSignalBearing } from "@/lib/tracker/estimation";
import {
  DEFAULT_TRACKER_PREFERENCES,
  type DeviceObservation,
  type LocationSnapshot,
  type MotionSnapshot,
  type PermissionStatus,
  type ScanLifecycle,
  type ScanSession,
  type TrackerPreferences,
  type TrackerSnapshot,
  type TrackedDeviceSummary,
} from "@/lib/tracker/types";

interface PersistedTrackerState {
  sessions: ScanSession[];
  observations: DeviceObservation[];
  preferences: TrackerPreferences;
}

interface TrackerState extends PersistedTrackerState, TrackerSnapshot {
  hydrated: boolean;
}

type TrackerAction =
  | { type: "hydrate"; payload: PersistedTrackerState }
  | { type: "start"; session: ScanSession }
  | { type: "stop"; stoppedAt: number }
  | { type: "setLifecycle"; lifecycle: ScanLifecycle; error?: string | null }
  | { type: "setPermissions"; permissions: Partial<PermissionStatus> }
  | { type: "setLocation"; location: LocationSnapshot | null }
  | { type: "setMotion"; motion: MotionSnapshot | null }
  | { type: "recordObservation"; observation: DeviceObservation; devices: TrackedDeviceSummary[] }
  | { type: "setPreferences"; preferences: TrackerPreferences }
  | { type: "deleteSession"; sessionId: string }
  | { type: "clear" };

const INITIAL_PERMISSIONS: PermissionStatus = {
  bluetooth: "unknown",
  locationForeground: "unknown",
  locationBackground: "unknown",
  notifications: "unknown",
};

const initialState: TrackerState = {
  hydrated: false,
  lifecycle: "idle",
  activeSession: null,
  latestLocation: null,
  latestMotion: null,
  permissions: INITIAL_PERMISSIONS,
  devices: [],
  lastError: null,
  sessions: [],
  observations: [],
  preferences: DEFAULT_TRACKER_PREFERENCES,
};

function summarizeDevices(observations: DeviceObservation[]): TrackedDeviceSummary[] {
  const grouped = new Map<string, DeviceObservation[]>();
  observations.forEach((item) => {
    const items = grouped.get(item.device.id) ?? [];
    items.push(item);
    grouped.set(item.device.id, items);
  });

  return Array.from(grouped.values())
    .map((items) => {
      const last = items[items.length - 1];
      return {
        device: last.device,
        lastRssi: last.rssi,
        lastSeenAt: last.observedAt,
        observationCount: items.length,
        estimate: estimateDirection(items),
        signalBearing: estimateSignalBearing(items),
      };
    })
    .sort((left, right) => right.lastSeenAt - left.lastSeenAt);
}

function reducer(state: TrackerState, action: TrackerAction): TrackerState {
  switch (action.type) {
    case "hydrate":
      return {
        ...state,
        ...action.payload,
        devices: summarizeDevices(action.payload.observations),
        hydrated: true,
      };
    case "start":
      return {
        ...state,
        lifecycle: "scanning",
        activeSession: action.session,
        sessions: [action.session, ...state.sessions],
        lastError: null,
      };
    case "stop": {
      const activeSession = state.activeSession;
      const sessions = state.sessions.map((session) =>
        session.id === activeSession?.id
          ? { ...session, stoppedAt: action.stoppedAt, lifecycle: "idle" as const }
          : session,
      );
      return { ...state, lifecycle: "idle", activeSession: null, sessions };
    }
    case "setLifecycle":
      return { ...state, lifecycle: action.lifecycle, lastError: action.error ?? null };
    case "setPermissions":
      return { ...state, permissions: { ...state.permissions, ...action.permissions } };
    case "setLocation":
      return { ...state, latestLocation: action.location };
    case "setMotion":
      return { ...state, latestMotion: action.motion };
    case "recordObservation": {
      const observations = [...state.observations, action.observation];
      const sessions = state.sessions.map((session) =>
        session.id === action.observation.sessionId
          ? { ...session, observationCount: session.observationCount + 1 }
          : session,
      );
      const activeSession = state.activeSession
        ? sessions.find((session) => session.id === state.activeSession?.id) ?? state.activeSession
        : null;
      return { ...state, observations, sessions, activeSession, devices: action.devices };
    }
    case "setPreferences":
      return { ...state, preferences: action.preferences };
    case "deleteSession": {
      const sessions = state.sessions.filter((session) => session.id !== action.sessionId);
      const observations = state.observations.filter((observation) => observation.sessionId !== action.sessionId);
      return { ...state, sessions, observations, devices: summarizeDevices(observations) };
    }
    case "clear":
      return { ...initialState, hydrated: true };
  }
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface TrackerContextValue {
  state: TrackerState;
  startSession: () => ScanSession;
  stopSession: () => void;
  setLifecycle: (lifecycle: ScanLifecycle, error?: string | null) => void;
  setPermissions: (permissions: Partial<PermissionStatus>) => void;
  setLatestLocation: (location: LocationSnapshot | null) => void;
  setLatestMotion: (motion: MotionSnapshot | null) => void;
  recordObservation: (observation: Omit<DeviceObservation, "id" | "sessionId">) => void;
  setPreferences: (preferences: TrackerPreferences) => void;
  deleteSession: (sessionId: string) => void;
  clearHistory: () => Promise<void>;
}

const TrackerContext = createContext<TrackerContextValue | null>(null);

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const activeSessionRef = useRef<ScanSession | null>(null);
  const observationsRef = useRef<DeviceObservation[]>([]);

  useEffect(() => {
    activeSessionRef.current = state.activeSession;
    observationsRef.current = state.observations;
  }, [state.activeSession, state.observations]);

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
      backgroundTrackingRequested: state.preferences.requestBackgroundTracking,
      observationCount: 0,
    };
    activeSessionRef.current = session;
    dispatch({ type: "start", session });
    return session;
  }, [state.preferences.requestBackgroundTracking]);

  const stopSession = useCallback(() => {
    activeSessionRef.current = null;
    dispatch({ type: "stop", stoppedAt: Date.now() });
  }, []);

  const recordObservation = useCallback((observation: Omit<DeviceObservation, "id" | "sessionId">) => {
    const activeSession = activeSessionRef.current;
    if (!activeSession) return;
    const complete: DeviceObservation = {
      ...observation,
      id: createId("observation"),
      sessionId: activeSession.id,
    };
    const allObservations = [...observationsRef.current, complete];
    observationsRef.current = allObservations;
    dispatch({ type: "recordObservation", observation: complete, devices: summarizeDevices(allObservations) });
  }, []);

  const value = useMemo<TrackerContextValue>(
    () => ({
      state,
      startSession,
      stopSession,
      setLifecycle: (lifecycle, error) => dispatch({ type: "setLifecycle", lifecycle, error }),
      setPermissions: (permissions) => dispatch({ type: "setPermissions", permissions }),
      setLatestLocation: (location) => dispatch({ type: "setLocation", location }),
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
  if (!value) {
    throw new Error("useTracker must be used inside TrackerProvider");
  }
  return value;
}
