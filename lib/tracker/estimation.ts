import type { DeviceObservation, DirectionEstimate, DistanceBand, RelativePosition, SignalBearingEstimate } from "@/lib/tracker/types";

const EARTH_RADIUS_M = 6_371_000;

function median(values: number[]): number | null {
  // 中位数比平均值更不容易被一两个离群 GPS 精度值拉偏。
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function distanceMeters(
  left: NonNullable<DeviceObservation["location"]>,
  right: NonNullable<DeviceObservation["location"]>,
): number {
  // Haversine 公式：把经纬度转换为球面上的两点距离，适合这里的短距离移动判断。
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

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function coverageDegrees(angles: number[]): number {
  // 最大“未覆盖扇区”越小，说明用户转动手机覆盖的方向越完整。
  if (angles.length < 2) return 0;
  const sorted = angles.map(normalizeDegrees).sort((left, right) => left - right);
  const gaps = sorted.map((angle, index) => normalizeDegrees(sorted[(index + 1) % sorted.length] - angle));
  return 360 - Math.max(...gaps);
}

function circularWeightedMean(samples: Array<{ angle: number; weight: number }>): number {
  // 角度不能直接求平均：359° 和 1° 的平均应接近 0°，而不是 180°。
  // 所以先转成单位圆向量，相加后再用 atan2 还原角度。
  const vector = samples.reduce((current, sample) => {
    const radians = (sample.angle * Math.PI) / 180;
    return { x: current.x + Math.cos(radians) * sample.weight, y: current.y + Math.sin(radians) * sample.weight };
  }, { x: 0, y: 0 });
  return normalizeDegrees((Math.atan2(vector.y, vector.x) * 180) / Math.PI);
}

function positionForRelativeBearing(relativeBearingDegrees: number): RelativePosition {
  const index = Math.round(normalizeDegrees(relativeBearingDegrees) / 45) % 8;
  return ["front", "frontRight", "right", "rearRight", "rear", "rearLeft", "left", "frontLeft"][index] as RelativePosition;
}

export function relativePositionLabel(position: RelativePosition): string {
  return {
    front: "前方", frontRight: "右前方", right: "右侧", rearRight: "右后方",
    rear: "后方", rearLeft: "左后方", left: "左侧", frontLeft: "左前方", unknown: "采样不足",
  }[position];
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

/**
 * 在用户转动手机时，以平滑后的 RSSI 峰值关联当时的手机罗盘朝向。
 * 这是用于“指向性扫描”的粗略扇区法，绝不等同于设备坐标或精确距离。
 */
export function estimateSignalBearing(observations: DeviceObservation[]): SignalBearingEstimate {
  // 只看最近 45 秒，避免很早以前手机朝向造成“历史残影”。
  const newestTimestamp = Math.max(...observations.map((item) => item.observedAt), 0);
  const ordered = observations
    .filter((item) => item.observedAt >= newestTimestamp - 45_000)
    .sort((left, right) => left.observedAt - right.observedAt);
  const samples = ordered
    .filter((item): item is DeviceObservation & { rssi: number; motion: NonNullable<DeviceObservation["motion"]> } => item.rssi != null && item.motion?.phoneHeadingDegrees != null)
    .map((item) => ({ heading: item.motion.phoneHeadingDegrees!, rssi: item.rssi }));
  const latest = ordered.at(-1);
  const base = {
    samplesUsed: samples.length,
    coverageDegrees: coverageDegrees(samples.map((sample) => sample.heading)),
    rssiRangeDb: samples.length ? Math.max(...samples.map((sample) => sample.rssi)) - Math.min(...samples.map((sample) => sample.rssi)) : 0,
    updatedAt: latest?.observedAt ?? Date.now(),
  };

  if (samples.length < 6 || base.coverageDegrees < 70 || base.rssiRangeDb < 4) {
    return { ...base, relativePosition: "unknown", absoluteBearingDegrees: null, relativeBearingDegrees: null, confidence: "low", rationale: "请缓慢转动手机覆盖更大角度，并持续收集稳定的 RSSI 样本。" };
  }

  const minRssi = Math.min(...samples.map((sample) => sample.rssi));
  // RSSI 越强，权重越高；加 1 可保证最弱样本仍作为方向覆盖的微小证据。
  const peakBearing = circularWeightedMean(samples.map((sample) => ({ angle: sample.heading, weight: sample.rssi - minRssi + 1 })));
  const currentHeading = samples.at(-1)!.heading;
  const relativeBearing = normalizeDegrees(peakBearing - currentHeading);
  return {
    ...base,
    relativePosition: positionForRelativeBearing(relativeBearing),
    absoluteBearingDegrees: Math.round(peakBearing),
    relativeBearingDegrees: Math.round(relativeBearing),
    confidence: samples.length >= 12 && base.coverageDegrees >= 120 && base.rssiRangeDb >= 8 ? "medium" : "low",
    rationale: "依据手机转动过程中 RSSI 较强的扫描扇区推导；人体、遮挡与反射会影响结果。",
  };
}
