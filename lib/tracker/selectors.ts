import { estimateDirection, estimateSignalBearing } from "./estimation";
import type { DeviceObservation, ScanSession, TrackedDeviceSummary } from "./types";

/**
 * 追踪领域的只读查询函数。
 *
 * 选择器只接收领域对象并返回派生视图模型，不接触 React、AsyncStorage 或原生 API，
 * 因而可被 Provider、路由页面和测试共享。
 */
export function observationsForSession(observations: DeviceObservation[], sessionId: string): DeviceObservation[] {
  return observations.filter((observation) => observation.sessionId === sessionId);
}

export function summarizeDeviceObservations(observations: DeviceObservation[]): TrackedDeviceSummary[] {
  const grouped = new Map<string, DeviceObservation[]>();
  for (const observation of observations) {
    const entries = grouped.get(observation.device.id) ?? [];
    entries.push(observation);
    grouped.set(observation.device.id, entries);
  }

  return Array.from(grouped.values())
    .map((entries) => {
      const last = entries[entries.length - 1];
      return {
        device: last.device,
        lastRssi: last.rssi,
        lastSeenAt: last.observedAt,
        observationCount: entries.length,
        estimate: estimateDirection(entries),
        signalBearing: estimateSignalBearing(entries),
      };
    })
    .sort((left, right) => right.lastSeenAt - left.lastSeenAt);
}

export function sessionById(sessions: ScanSession[], sessionId: string): ScanSession | null {
  return sessions.find((session) => session.id === sessionId) ?? null;
}

export function deviceSummariesForSession(observations: DeviceObservation[], sessionId: string): TrackedDeviceSummary[] {
  return summarizeDeviceObservations(observationsForSession(observations, sessionId));
}
