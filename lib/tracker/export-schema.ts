import type { DeviceObservation, ScanSession } from "@/lib/tracker/types";

export interface TrackerExport {
  schemaVersion: 1;
  exportedAt: string;
  disclaimer: string;
  sessions: ScanSession[];
  observations: DeviceObservation[];
}

export function createTrackerExport(sessions: ScanSession[], observations: DeviceObservation[]): TrackerExport {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    disclaimer: "RSSI 与轨迹只能产生低至中等置信度的相对趋势，不能表示精确距离、绝对位置或安全级导航结论。",
    sessions,
    observations,
  };
}
