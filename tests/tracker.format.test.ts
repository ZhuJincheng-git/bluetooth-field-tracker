import { describe, expect, it } from "vitest";

import { formatLocationAge, formatSpeed, formatSpeedSource } from "../lib/tracker/format";

describe("tracker display formatting", () => {
  it("keeps walking speed in meters per second", () => {
    expect(formatSpeed(1.4)).toBe("1.4 m/s");
    expect(formatSpeed(null)).toBe("—");
  });

  it("distinguishes GPS speed from coordinate-based fallback speed", () => {
    expect(formatSpeedSource("gps")).toBe("系统 GPS 速度");
    expect(formatSpeedSource("coordinate")).toBe("坐标位移补全");
    expect(formatSpeedSource(undefined)).toBe("等待定位速度");
  });

  it("makes location freshness legible in the UI", () => {
    expect(formatLocationAge(10_000, 11_000)).toBe("刚刚更新");
    expect(formatLocationAge(10_000, 27_000)).toBe("17 秒前更新");
  });
});
