import type { DeviceObservation, ScanSession } from "../../lib/tracker/types";

export function createSession(overrides: Partial<ScanSession> = {}): ScanSession {
  return {
    id: "session-a",
    startedAt: 1_700_000_000_000,
    stoppedAt: null,
    lifecycle: "scanning",
    backgroundTrackingRequested: true,
    observationCount: 0,
    ...overrides,
  };
}

export function createObservation(overrides: Partial<DeviceObservation> = {}): DeviceObservation {
  return {
    id: "observation-a",
    sessionId: "session-a",
    device: { id: "device-a", name: "Beacon A", localName: null, serviceUuids: null },
    rssi: -65,
    txPowerLevel: null,
    observedAt: 1_700_000_000_500,
    location: null,
    motion: null,
    ...overrides,
  };
}
