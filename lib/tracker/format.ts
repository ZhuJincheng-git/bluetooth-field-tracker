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
  return `${(speedMps * 3.6).toFixed(1)} km/h`;
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
