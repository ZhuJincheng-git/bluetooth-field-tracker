import { describe, expect, it } from "vitest";

import { createSessionExport, createTrackerExport } from "../lib/tracker/export-schema";
import type { DeviceObservation, ScanSession } from "../lib/tracker/types";

describe("createTrackerExport", () => {
  it("produces a versioned, self-describing export payload", () => {
    const result = createTrackerExport([], []);
    expect(result.schemaVersion).toBe(1);
    expect(result.sessions).toEqual([]);
    expect(result.observations).toEqual([]);
    expect(result.disclaimer).toContain("RSSI");
    expect(new Date(result.exportedAt).toString()).not.toBe("Invalid Date");
  });

  it("isolates a single scan session and its own observations", () => {
    const firstSession: ScanSession = { id: "session-1", startedAt: 1, stoppedAt: 2, lifecycle: "idle", backgroundTrackingRequested: false, observationCount: 1 };
    const secondSession: ScanSession = { ...firstSession, id: "session-2", observationCount: 1 };
    const observations = [
      { id: "observation-1", sessionId: "session-1" },
      { id: "observation-2", sessionId: "session-2" },
    ] as DeviceObservation[];

    const result = createSessionExport(firstSession, observations);
    expect(result.sessions).toEqual([firstSession]);
    expect(result.observations).toEqual([observations[0]]);
    expect(result.observations).not.toContain(observations[1]);
    expect(secondSession.id).toBe("session-2");
  });
});
