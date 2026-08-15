import type { LocationSnapshot, LocationQuality } from "@/lib/tracker/types";

const EARTH_RADIUS_M = 6_371_000;

export function distanceBetweenMeters(left: LocationSnapshot, right: LocationSnapshot): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(right.latitude - left.latitude);
  const longitudeDelta = toRadians(right.longitude - left.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(left.latitude)) * Math.cos(toRadians(right.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function assessLocationQuality(previous: LocationSnapshot | null, next: LocationSnapshot, maxAccuracyM: number): LocationQuality {
  if (next.accuracyM != null && next.accuracyM > maxAccuracyM) return "lowAccuracy";
  if (!previous) return "stable";

  const elapsedSeconds = Math.max(0.001, (next.capturedAt - previous.capturedAt) / 1_000);
  const distanceM = distanceBetweenMeters(previous, next);
  const estimatedSpeed = distanceM / elapsedSeconds;
  const accuracyWorsened = (next.accuracyM ?? 0) > (previous.accuracyM ?? 0);
  if (elapsedSeconds < 5 && distanceM > 350 && accuracyWorsened) return "outlier";
  if (estimatedSpeed > 55 && accuracyWorsened) return "outlier";
  return "stable";
}

export function locationQualityLabel(quality: LocationQuality): string {
  return {
    waiting: "等待首个定位",
    stable: "定位稳定",
    lowAccuracy: "已过滤低精度定位",
    outlier: "已过滤异常位置跳变",
    servicesOff: "系统定位服务未开启",
  }[quality];
}
