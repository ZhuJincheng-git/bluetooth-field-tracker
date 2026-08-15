import type { DeviceObservation, DirectionEstimate, DistanceBand } from "@/lib/tracker/types";

const EARTH_RADIUS_M = 6_371_000;

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function distanceMeters(
  left: NonNullable<DeviceObservation["location"]>,
  right: NonNullable<DeviceObservation["location"]>,
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(right.latitude - left.latitude);
  const longitudeDelta = toRadians(right.longitude - left.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(left.latitude)) * Math.cos(toRadians(right.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toDistanceBand(rssi: number | null): DistanceBand {
  if (rssi == null) return "unknown";
  if (rssi >= -60) return "near";
  if (rssi >= -75) return "medium";
  return "far";
}

/**
 * 输出保守的趋势估算，而非坐标定位。
 *
 * 单次 RSSI 不足以判定方向。仅在设备存在多次带位置的观测且手机确实发生移动时，
 * RSSI 的明显增减才会被解释为沿行进方向“可能接近 / 可能远离”的线索。
 */
export function estimateDirection(observations: DeviceObservation[]): DirectionEstimate {
  const ordered = [...observations].sort((left, right) => left.observedAt - right.observedAt);
  const rssiSamples = ordered.map((item) => item.rssi).filter((item): item is number => item != null);
  const positioned = ordered.filter((item): item is DeviceObservation & { location: NonNullable<DeviceObservation["location"]> } => item.location != null);
  const latest = ordered.at(-1);
  const base: Omit<DirectionEstimate, "direction" | "confidence" | "rationale"> = {
    distanceBand: toDistanceBand(latest?.rssi ?? null),
    samplesUsed: ordered.length,
    updatedAt: latest?.observedAt ?? Date.now(),
  };

  if (rssiSamples.length < 3 || positioned.length < 2) {
    return { ...base, direction: "unknown", confidence: "low", rationale: "至少需要三条 RSSI 样本和两条带位置的观测。" };
  }

  const travelled = distanceMeters(positioned[0].location, positioned.at(-1)!.location);
  const deltaRssi = rssiSamples.at(-1)! - rssiSamples[0];
  const medianAccuracy = median(positioned.map((item) => item.location.accuracyM).filter((item): item is number => item != null));

  if (travelled < 10 || Math.abs(deltaRssi) < 6) {
    return { ...base, direction: "unknown", confidence: "low", rationale: "移动距离或信号变化不足，无法区分真实趋势与无线环境波动。" };
  }

  const confidence = rssiSamples.length >= 6 && travelled >= 20 && (medianAccuracy == null || medianAccuracy <= 25) ? "medium" : "low";
  return {
    ...base,
    direction: deltaRssi > 0 ? "ahead" : "behind",
    confidence,
    rationale: deltaRssi > 0
      ? "沿当前移动轨迹的 RSSI 整体增强，设备可能位于行进前方或接近路径上。"
      : "沿当前移动轨迹的 RSSI 整体减弱，设备可能位于行进后方或远离路径上。",
  };
}
