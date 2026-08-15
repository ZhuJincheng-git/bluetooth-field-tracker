import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";

import { saveLatestBackgroundLocation } from "@/lib/tracker/storage";
import type { LocationSnapshot } from "@/lib/tracker/types";

export const BACKGROUND_LOCATION_TASK = "bluetooth-field-tracker/background-location";

/**
 * Expo 在应用不在前台时会单独唤起这个任务文件。任务必须定义在模块顶层，
 * 不能放在 React 组件或 Hook 中，否则锁屏后的 JavaScript 运行时找不到它。
 */
function toSnapshot(location: Location.LocationObject): LocationSnapshot {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracyM: location.coords.accuracy,
    altitudeM: location.coords.altitude,
    speedMps: location.coords.speed,
    speedSource: location.coords.speed != null ? "gps" : "unknown",
    headingDegrees: location.coords.heading,
    capturedAt: location.timestamp,
  };
}

if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  // 避免热更新或重新导入时重复注册同名任务。
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data) return;
    const locations = (data as { locations?: Location.LocationObject[] }).locations ?? [];
    const latest = locations.at(-1);
    if (latest) {
      // 批次可能包含多个位置。采集记录只需最近快照，保留它可降低后台 I/O。
      await saveLatestBackgroundLocation<LocationSnapshot>(toSnapshot(latest));
    }
  });
}

export { toSnapshot };
