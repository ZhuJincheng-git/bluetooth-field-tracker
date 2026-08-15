import { describe, expect, it } from "vitest";

import { createInitialTrackerState, trackerReducer } from "../lib/tracker/state";
import { createObservation, createSession } from "./helpers/tracker-fixtures";

describe("trackerReducer", () => {
  it("keeps a session's observation count and global device summary in sync", () => {
    const session = createSession();
    const started = trackerReducer(createInitialTrackerState(), { type: "start", session });
    const recorded = trackerReducer(started, { type: "recordObservation", observation: createObservation() });

    expect(recorded.activeSession?.observationCount).toBe(1);
    expect(recorded.sessions[0].observationCount).toBe(1);
    expect(recorded.devices).toHaveLength(1);
    expect(recorded.devices[0].device.id).toBe("device-a");
  });

  it("deletes a completed session and only its observations", () => {
    const sessionA = createSession({ id: "session-a", stoppedAt: 2, lifecycle: "idle" });
    const sessionB = createSession({ id: "session-b", stoppedAt: 3, lifecycle: "idle" });
    const state = {
      ...createInitialTrackerState(),
      sessions: [sessionA, sessionB],
      observations: [createObservation({ sessionId: "session-a" }), createObservation({ id: "observation-b", sessionId: "session-b" })],
    };

    const next = trackerReducer(state, { type: "deleteSession", sessionId: "session-a" });
    expect(next.sessions.map((session) => session.id)).toEqual(["session-b"]);
    expect(next.observations.map((observation) => observation.sessionId)).toEqual(["session-b"]);
  });
});
