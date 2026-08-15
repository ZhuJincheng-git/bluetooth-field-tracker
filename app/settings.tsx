import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconAction, ScreenTitle } from "@/components/tracker/ui";
import { useColors } from "@/hooks/use-colors";
import { useTracker } from "@/lib/tracker/TrackerProvider";

export default function SettingsScreen() {
  const colors = useColors();
  const { state, setPreferences } = useTracker();
  const toggleBackground = (value: boolean) => setPreferences({ ...state.preferences, requestBackgroundTracking: value });

  return (
    <ScreenContainer className="px-5" safeAreaClassName="pt-3">
      <ScreenTitle title="扫描设置" subtitle="控制记录节流与后台运行偏好" action={<IconAction icon="close" label="关闭设置" onPress={() => router.back()} />} />
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SettingRow icon="notifications-active" title="尝试后台采集" description="开始采集时请求所需权限，并显示持续通知。" control={<Switch value={state.preferences.requestBackgroundTracking} onValueChange={toggleBackground} trackColor={{ false: colors.border, true: "#006C5F" }} />} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow icon="location-on" title="定位节流" description={`至少每 ${state.preferences.locationIntervalMs / 1000} 秒或移动 ${state.preferences.locationDistanceIntervalM} 米更新。`} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow icon="tune" title="设备记录节流" description={`同一台设备至少间隔 ${state.preferences.observationThrottleMs / 1000} 秒写入一次。`} />
      </View>
      <View style={[styles.notice, { backgroundColor: "#E9F2FF" }]}>
        <MaterialIcons name="info-outline" size={20} color="#234E8A" />
        <Text style={[styles.noticeText, { color: "#234E8A" }]}>RSSI 会受墙体、人体遮挡和设备发射功率影响。相对方位只作为趋势线索，不能用于安全或导航决策。</Text>
      </View>
      <Pressable onPress={() => router.push("/(tabs)/history" as never)} style={({ pressed }) => [styles.historyLink, pressed && styles.pressed]}>
        <Text style={{ color: "#006C5F", fontSize: 15, fontWeight: "700" }}>前往历史与导出</Text>
        <MaterialIcons name="chevron-right" size={22} color="#006C5F" />
      </Pressable>
    </ScreenContainer>
  );
}

function SettingRow({ icon, title, description, control }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; title: string; description: string; control?: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <MaterialIcons name={icon} size={21} color="#006C5F" style={styles.rowIcon} />
      <View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.rowDescription, { color: colors.tabIconDefault }]}>{description}</Text></View>
      {control}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  row: { alignItems: "center", flexDirection: "row", minHeight: 88, paddingHorizontal: 16, paddingVertical: 14 },
  rowIcon: { marginRight: 14 },
  rowCopy: { flex: 1, gap: 4, paddingRight: 8 },
  rowTitle: { fontSize: 16, fontWeight: "700" },
  rowDescription: { fontSize: 13, lineHeight: 18 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 51 },
  notice: { alignItems: "flex-start", borderRadius: 18, flexDirection: "row", gap: 10, marginTop: 18, padding: 15 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19 },
  historyLink: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 18, minHeight: 48, paddingHorizontal: 8 },
  pressed: { opacity: 0.65 },
});
