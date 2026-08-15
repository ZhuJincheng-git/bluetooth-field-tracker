import { describe, expect, it } from "vitest";

import { formatLocationAge, formatSpeed } from "../lib/tracker/format";

describe("tracker display formatting", () => {
  it("keeps walking speed in meters per second", () => {
    expect(formatSpeed(1.4)).toBe("1.4 m/s");
    expect(formatSpeed(null)).toBe("—");
  });

  it("makes location freshness legible in the UI", () => {
    expect(formatLocationAge(10_000, 11_000)).toBe("刚刚更新");
    expect(formatLocationAge(10_000, 27_000)).toBe("17 秒前更新");
  });
});
