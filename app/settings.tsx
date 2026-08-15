import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconAction, ScreenTitle } from "@/components/tracker/ui";
import { useColors } from "@/hooks/use-colors";
import { useTracker } from "@/lib/tracker/TrackerProvider";
import type { TrackerPreferences } from "@/lib/tracker/types";

const LOCATION_PROFILES = [
  { label: "实时", interval: 1_000, distance: 1 },
  { label: "均衡", interval: 2_000, distance: 1 },
  { label: "省电", interval: 5_000, distance: 3 },
  { label: "低频", interval: 10_000, distance: 10 },
] as const;

export default function SettingsScreen() {
  const colors = useColors();
  const { state, setPreferences } = useTracker();
  const update = (patch: Partial<TrackerPreferences>) => setPreferences({ ...state.preferences, ...patch });
  const activeProfile = LOCATION_PROFILES.find((item) => item.interval === state.preferences.locationIntervalMs && item.distance === state.preferences.locationDistanceIntervalM)?.label ?? "自定义";

  return (
    <ScreenContainer className="px-5" safeAreaClassName="pt-3">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenTitle title="采集设置" subtitle="修改后将在下一次扫描开始时生效" action={<IconAction icon="close" label="关闭设置" onPress={() => router.back()} />} />
        {state.lifecycle === "scanning" ? <View style={styles.activeBanner}><MaterialIcons name="sync" size={19} color="#234E8A" /><Text style={styles.activeBannerText}>扫描正在进行：最低 RSSI、命名设备过滤、记录上限和显示诊断会立即生效；定位模式、更新频率、后台采集将在下一次扫描开始时生效。</Text></View> : null}
        <Section title="运行方式">
          <SettingRow icon="notifications-active" title="尝试后台采集" description="通过持续通知在后台维持蓝牙和位置记录。" control={<Switch value={state.preferences.requestBackgroundTracking} onValueChange={(value) => update({ requestBackgroundTracking: value })} trackColor={{ false: colors.border, true: "#006C5F" }} />} />
        </Section>
        <Section title="定位稳定性">
          <ChoiceRow label="更新频率" value={activeProfile} options={LOCATION_PROFILES.map((item) => ({ label: item.label, value: item.label }))} selected={activeProfile} onSelect={(label) => { const profile = LOCATION_PROFILES.find((item) => item.label === label); if (profile) update({ locationIntervalMs: profile.interval, locationDistanceIntervalM: profile.distance }); }} />
          <ChoiceRow label="定位模式" value={state.preferences.locationAccuracyMode === "high" ? "高精度" : "均衡"} options={[{ label: "高精度", value: "high" }, { label: "均衡", value: "balanced" }]} selected={state.preferences.locationAccuracyMode} onSelect={(value) => update({ locationAccuracyMode: value as TrackerPreferences["locationAccuracyMode"] })} />
          <ChoiceRow label="最大精度半径" value={`±${state.preferences.maxLocationAccuracyM} m`} options={[30, 50, 80, 120].map((value) => ({ label: `${value} m`, value: String(value) }))} selected={String(state.preferences.maxLocationAccuracyM)} onSelect={(value) => update({ maxLocationAccuracyM: Number(value) })} />
        </Section>
        <Section title="扫描过滤">
          <ChoiceRow label="记录节流" value={`${state.preferences.observationThrottleMs / 1000} 秒`} options={[500, 1_000, 2_000, 5_000].map((value) => ({ label: value < 1_000 ? "0.5 秒" : `${value / 1_000} 秒`, value: String(value) }))} selected={String(state.preferences.observationThrottleMs)} onSelect={(value) => update({ observationThrottleMs: Number(value) })} />
          <ChoiceRow label="最低信号强度" value={`${state.preferences.minimumRssiDbm} dBm`} options={[-95, -85, -75, -65].map((value) => ({ label: `${value} dBm`, value: String(value) }))} selected={String(state.preferences.minimumRssiDbm)} onSelect={(value) => update({ minimumRssiDbm: Number(value) })} />
          <SettingRow icon="label-outline" title="仅记录命名设备" description="忽略未广播名称的设备，降低随机广播噪声。" control={<Switch value={state.preferences.onlyNamedDevices} onValueChange={(value) => update({ onlyNamedDevices: value })} trackColor={{ false: colors.border, true: "#006C5F" }} />} />
        </Section>
        <Section title="记录与显示">
          <ChoiceRow label="每次扫描最多记录" value={`${state.preferences.maxRecordsPerSession} 条`} options={[1000, 5000, 10000].map((value) => ({ label: `${value} 条`, value: String(value) }))} selected={String(state.preferences.maxRecordsPerSession)} onSelect={(value) => update({ maxRecordsPerSession: Number(value) })} />
          <SettingRow icon="speed" title="显示运动诊断" description="显示行进航向、罗盘来源与运动强度；运动强度不等于移动速度。" control={<Switch value={state.preferences.showMotionDiagnostics} onValueChange={(value) => update({ showMotionDiagnostics: value })} trackColor={{ false: colors.border, true: "#006C5F" }} />} />
        </Section>
        <View style={styles.notice}><MaterialIcons name="info-outline" size={20} color="#234E8A" /><Text style={styles.noticeText}>定位质量会过滤精度超限或不合理跳变的位置。RSSI 方位仍只表示低至中等置信度的趋势，不能用于安全或导航决策。</Text></View>
      </ScrollView>
    </ScreenContainer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return <View style={styles.sectionWrap}><Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text><View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View></View>;
}

function SettingRow({ icon, title, description, control }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; title: string; description: string; control: React.ReactNode }) {
  const colors = useColors();
  return <View style={styles.row}><MaterialIcons name={icon} size={21} color="#006C5F" style={styles.rowIcon} /><View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.rowDescription, { color: colors.tabIconDefault }]}>{description}</Text></View>{control}</View>;
}

function ChoiceRow({ label, value, options, selected, onSelect }: { label: string; value: string; options: { label: string; value: string }[]; selected: string; onSelect: (value: string) => void }) {
  const colors = useColors();
  return <View style={styles.choiceRow}><View style={styles.choiceHeader}><Text style={[styles.choiceLabel, { color: colors.text }]}>{label}</Text><Text style={[styles.choiceValue, { color: colors.tabIconDefault }]}>{value}</Text></View><View style={styles.chips}>{options.map((option) => <Pressable key={option.value} onPress={() => onSelect(option.value)} style={({ pressed }) => [styles.chip, { backgroundColor: selected === option.value ? "#A4F2DF" : colors.background, borderColor: selected === option.value ? "#006C5F" : colors.border }, pressed && styles.pressed]}><Text style={[styles.chipText, { color: selected === option.value ? "#003731" : colors.tabIconDefault }]}>{option.label}</Text></Pressable>)}</View></View>;
}

const styles = StyleSheet.create({
  content: { gap: 18, paddingBottom: 32 },
  sectionWrap: { gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginLeft: 2 },
  section: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  row: { alignItems: "center", flexDirection: "row", minHeight: 88, paddingHorizontal: 16, paddingVertical: 14 },
  rowIcon: { marginRight: 14 },
  rowCopy: { flex: 1, gap: 4, paddingRight: 8 },
  rowTitle: { fontSize: 16, fontWeight: "700" },
  rowDescription: { fontSize: 13, lineHeight: 18 },
  choiceRow: { gap: 10, padding: 16 },
  choiceHeader: { flexDirection: "row", justifyContent: "space-between" },
  choiceLabel: { fontSize: 15, fontWeight: "700" },
  choiceValue: { fontSize: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, minHeight: 34, paddingHorizontal: 11, paddingVertical: 8 },
  chipText: { fontSize: 12, fontWeight: "700" },
  notice: { alignItems: "flex-start", backgroundColor: "#E9F2FF", borderRadius: 18, flexDirection: "row", gap: 10, padding: 15 },
  noticeText: { color: "#234E8A", flex: 1, fontSize: 13, lineHeight: 19 },
  activeBanner: { alignItems: "flex-start", backgroundColor: "#E9F2FF", borderRadius: 16, flexDirection: "row", gap: 9, padding: 14 },
  activeBannerText: { color: "#234E8A", flex: 1, fontSize: 12, lineHeight: 18 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.98 }] },
});
