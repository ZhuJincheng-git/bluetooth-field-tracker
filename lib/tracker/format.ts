import type { DistanceBand, LocationSnapshot } from "@/lib/tracker/types";

export function formatElapsed(startedAt: number, now: number): string {
  const totalSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function formatCoordinate(location: LocationSnapshot | null): string {
  if (!location) return "等待定位";
  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
}

export function formatSpeed(speedMps: number | null): string {
  if (speedMps == null || speedMps < 0) return "—";
  return `${speedMps.toFixed(1)} m/s`;
}

export function formatLocationAge(capturedAt: number | null, now: number): string {
  if (capturedAt == null) return "等待首个定位";
  const ageSeconds = Math.max(0, Math.floor((now - capturedAt) / 1_000));
  if (ageSeconds < 2) return "刚刚更新";
  if (ageSeconds < 60) return `${ageSeconds} 秒前更新`;
  return `${Math.floor(ageSeconds / 60)} 分钟前更新`;
}

export function formatAccuracy(accuracyM: number | null): string {
  if (accuracyM == null) return "精度未知";
  return `精度 ±${Math.round(accuracyM)} m`;
}

export function formatHeading(heading: number | null): string {
  if (heading == null || heading < 0) return "—";
  const labels = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  return `${labels[Math.round(heading / 45) % labels.length]} ${Math.round(heading)}°`;
}

export function rssiLabel(rssi: number | null): string {
  if (rssi == null) return "未知";
  return `${rssi} dBm`;
}

export function distanceBandLabel(band: DistanceBand): string {
  return { near: "近距离", medium: "中距离", far: "较远", unknown: "等待估算" }[band];
}
