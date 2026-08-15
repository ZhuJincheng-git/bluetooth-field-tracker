import AsyncStorage from "@react-native-async-storage/async-storage";

const TRACKER_STATE_KEY = "bluetooth-field-tracker/v1";
const BACKGROUND_LOCATION_KEY = "bluetooth-field-tracker/latest-background-location";

export async function loadTrackerState<T>(): Promise<T | null> {
  try {
    const serialized = await AsyncStorage.getItem(TRACKER_STATE_KEY);
    return serialized ? (JSON.parse(serialized) as T) : null;
  } catch {
    return null;
  }
}

export async function saveTrackerState<T>(state: T): Promise<void> {
  await AsyncStorage.setItem(TRACKER_STATE_KEY, JSON.stringify(state));
}

export async function clearTrackerState(): Promise<void> {
  await AsyncStorage.removeItem(TRACKER_STATE_KEY);
}

export async function saveLatestBackgroundLocation<T>(location: T): Promise<void> {
  await AsyncStorage.setItem(BACKGROUND_LOCATION_KEY, JSON.stringify(location));
}

export async function loadLatestBackgroundLocation<T>(): Promise<T | null> {
  try {
    const serialized = await AsyncStorage.getItem(BACKGROUND_LOCATION_KEY);
    return serialized ? (JSON.parse(serialized) as T) : null;
  } catch {
    return null;
  }
}
