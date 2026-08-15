import AsyncStorage from "@react-native-async-storage/async-storage";

const TRACKER_STATE_KEY = "bluetooth-field-tracker/v1";
const BACKGROUND_LOCATION_KEY = "bluetooth-field-tracker/latest-background-location";

export async function loadTrackerState<T>(): Promise<T | null> {
  // 存储读取可能因旧版本 JSON 损坏而失败。返回 null 让应用从安全空状态开始，
  // 而不是因 JSON.parse 抛错导致整个启动页崩溃。
  try {
    const serialized = await AsyncStorage.getItem(TRACKER_STATE_KEY);
    return serialized ? (JSON.parse(serialized) as T) : null;
  } catch {
    return null;
  }
}

export async function saveTrackerState<T>(state: T): Promise<void> {
  // 泛型让存储层不认识业务模型；业务层决定什么是可持久化状态。
  await AsyncStorage.setItem(TRACKER_STATE_KEY, JSON.stringify(state));
}

export async function clearTrackerState(): Promise<void> {
  await AsyncStorage.removeItem(TRACKER_STATE_KEY);
}

export async function saveLatestBackgroundLocation<T>(location: T): Promise<void> {
  // 后台任务不能直接访问 React Context，因此将“最后位置”作为一个小型交接点保存。
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
