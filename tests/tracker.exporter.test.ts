import { describe, expect, it } from "vitest";

import { createTrackerExport } from "../lib/tracker/export-schema";

describe("createTrackerExport", () => {
  it("produces a versioned, self-describing export payload", () => {
    const result = createTrackerExport([], []);
    expect(result.schemaVersion).toBe(1);
    expect(result.sessions).toEqual([]);
    expect(result.observations).toEqual([]);
    expect(result.disclaimer).toContain("RSSI");
    expect(new Date(result.exportedAt).toString()).not.toBe("Invalid Date");
  });
});
