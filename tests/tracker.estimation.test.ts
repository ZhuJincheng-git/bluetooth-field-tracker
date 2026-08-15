import { describe, expect, it } from "vitest";

import { estimateDirection } from "../lib/tracker/estimation";
import type { DeviceObservation } from "../lib/tracker/types";

function observation(index: number, rssi: number, latitudeDelta = index * 0.00012): DeviceObservation {
  return {
    id: `observation-${index}`,
    sessionId: "session-1",
    device: { id: "device-1", name: "Test device", localName: null, serviceUuids: null },
    rssi,
    txPowerLevel: null,
    observedAt: 1_700_000_000_000 + index * 5_000,
    location: { latitude: 31.2304 + latitudeDelta, longitude: 121.4737, accuracyM: 10, altitudeM: null, speedMps: 1.5, headingDegrees: 0, capturedAt: 1_700_000_000_000 + index * 5_000 },
  };
}

describe("estimateDirection", () => {
  it("requires adequate location and RSSI evidence before producing a trend", () => {
    const result = estimateDirection([observation(0, -72), observation(1, -68)]);
    expect(result.direction).toBe("unknown");
    expect(result.confidence).toBe("low");
  });

  it("reports an ahead trend only after meaningful movement and strengthening RSSI", () => {
    const result = estimateDirection([observation(0, -84), observation(1, -77), observation(2, -69), observation(3, -61), observation(4, -56), observation(5, -52)]);
    expect(result.direction).toBe("ahead");
    expect(result.confidence).toBe("medium");
    expect(result.distanceBand).toBe("near");
  });

  it("reports a behind trend when RSSI weakens along a mobile trajectory", () => {
    const result = estimateDirection([observation(0, -55), observation(1, -63), observation(2, -69), observation(3, -77)]);
    expect(result.direction).toBe("behind");
    expect(result.distanceBand).toBe("far");
  });
});
