import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";

import { saveLatestBackgroundLocation } from "@/lib/tracker/storage";
import type { LocationSnapshot } from "@/lib/tracker/types";

export const BACKGROUND_LOCATION_TASK = "bluetooth-field-tracker/background-location";
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
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data) return;
    const locations = (data as { locations?: Location.LocationObject[] }).locations ?? [];
    const latest = locations.at(-1);
    if (latest) {
      await saveLatestBackgroundLocation<LocationSnapshot>(toSnapshot(latest));
    }
  });
}

export { toSnapshot };
