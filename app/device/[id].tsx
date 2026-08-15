import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconAction, ScreenTitle, StatusPill } from "@/components/tracker/ui";
import { useColors } from "@/hooks/use-colors";
import { formatCoordinate, rssiLabel } from "@/lib/tracker/format";
import { useTracker } from "@/lib/tracker/TrackerProvider";

export default function DeviceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { state } = useTracker();
  const observations = state.observations.filter((item) => item.device.id === id).sort((a, b) => b.observedAt - a.observedAt);
  const device = state.devices.find((item) => item.device.id === id);
  const label = device?.device.name ?? device?.device.localName ?? "BLE 设备";
  const estimate = device?.estimate;

  return (
    <ScreenContainer className="px-5" safeAreaClassName="pt-3">
      <ScreenTitle title={label} subtitle={id} action={<IconAction icon="close" label="返回设备列表" onPress={() => router.back()} />} />
      <View style={[styles.estimate, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.estimateIcon}><MaterialIcons name="explore" size={26} color="#006C5F" /></View>
        <View style={styles.estimateCopy}>
          <Text style={[styles.estimateTitle, { color: colors.text }]}>相对方位：{estimate?.direction === "ahead" ? "可能在前方" : estimate?.direction === "behind" ? "可能在后方" : "等待估算"}</Text>
          <Text style={[styles.estimateBody, { color: colors.tabIconDefault }]}>{estimate?.rationale ?? "需要在不同位置获得足够的稳定样本后，才会显示趋势线索。"}</Text>
        </View>
        <StatusPill active={estimate?.confidence === "medium"} label={`${estimate?.confidence === "medium" ? "中" : "低"}置信度`} />
      </View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>观测记录</Text>
      <FlatList
        data={observations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={observations.length ? styles.list : styles.emptyList}
        renderItem={({ item }) => (
          <View style={[styles.observation, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View><Text style={[styles.rssi, { color: colors.text }]}>{rssiLabel(item.rssi)}</Text><Text style={[styles.time, { color: colors.tabIconDefault }]}>{new Intl.DateTimeFormat("zh-CN", { timeStyle: "medium" }).format(item.observedAt)}</Text></View>
            <Text style={[styles.location, { color: colors.tabIconDefault }]} numberOfLines={1}>{formatCoordinate(item.location)}</Text>
          </View>
        )}
        ListEmptyComponent={<View style={styles.empty}><Text style={{ color: colors.tabIconDefault }}>这台设备尚无可显示的观测记录。</Text></View>}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  estimate: { alignItems: "flex-start", borderRadius: 20, borderWidth: 1, flexDirection: "row", gap: 12, marginBottom: 24, padding: 16 },
  estimateIcon: { alignItems: "center", backgroundColor: "#E1F5ED", borderRadius: 16, height: 48, justifyContent: "center", width: 48 },
  estimateCopy: { flex: 1, gap: 4 },
  estimateTitle: { fontSize: 16, fontWeight: "700" },
  estimateBody: { fontSize: 12, lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  list: { gap: 8, paddingBottom: 24 },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  empty: { alignItems: "center", padding: 28 },
  observation: { alignItems: "center", borderRadius: 16, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 14 },
  rssi: { fontSize: 15, fontWeight: "700" },
  time: { fontSize: 12, marginTop: 3 },
  location: { fontSize: 12, maxWidth: 160, textAlign: "right" },
});
