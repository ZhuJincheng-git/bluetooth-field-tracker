import { describe, expect, it } from "vitest";

import { assessLocationQuality, distanceBetweenMeters, shouldPublishLocation } from "../lib/tracker/location-quality";
import type { LocationSnapshot } from "../lib/tracker/types";

function location(latitude: number, longitude: number, capturedAt: number, accuracyM = 12): LocationSnapshot {
  return { latitude, longitude, accuracyM, altitudeM: null, speedMps: null, headingDegrees: null, capturedAt };
}

describe("location quality", () => {
  it("accepts nearby accurate samples", () => {
    const previous = location(22.7779, 113.2317, 1_000);
    const next = location(22.77791, 113.23172, 3_000);
    expect(assessLocationQuality(previous, next, 80)).toBe("stable");
    expect(distanceBetweenMeters(previous, next)).toBeGreaterThan(0);
  });

  it("filters samples whose reported accuracy exceeds the user threshold", () => {
    expect(assessLocationQuality(null, location(22.7779, 113.2317, 1_000, 120), 80)).toBe("lowAccuracy");
  });

  it("filters a rapid long-distance jump when its accuracy worsens", () => {
    const previous = location(22.7779, 113.2317, 1_000, 10);
    const jump = location(22.7909, 113.2417, 2_000, 50);
    expect(assessLocationQuality(previous, jump, 80)).toBe("outlier");
  });

  it("publishes low-accuracy positions so the first useful coordinates are not hidden", () => {
    expect(shouldPublishLocation("lowAccuracy")).toBe(true);
    expect(shouldPublishLocation("stable")).toBe(true);
    expect(shouldPublishLocation("outlier")).toBe(false);
  });
});
