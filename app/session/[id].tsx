import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconAction, ScreenTitle, StatusPill } from "@/components/tracker/ui";
import { SessionPathChart, SessionRssiChart } from "@/components/tracker/session-visualization";
import { useColors } from "@/hooks/use-colors";
import { rssiLabel } from "@/lib/tracker/format";
import { summarizeDeviceObservations, useTracker } from "@/lib/tracker/TrackerProvider";

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { state } = useTracker();
  const session = state.sessions.find((item) => item.id === id);
  const observations = state.observations.filter((item) => item.sessionId === id).sort((left, right) => left.observedAt - right.observedAt);
  const devices = summarizeDeviceObservations(observations);

  if (!session) {
    return <ScreenContainer className="px-5" safeAreaClassName="pt-3"><ScreenTitle title="扫描记录" action={<IconAction icon="close" label="返回历史" onPress={() => router.back()} />} /><View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons name="error-outline" size={34} color="#B3261E" /><Text style={[styles.emptyTitle, { color: colors.text }]}>扫描记录不存在</Text><Text style={[styles.emptyBody, { color: colors.tabIconDefault }]}>这条记录可能已经被删除。</Text></View></ScreenContainer>;
  }

  const locatedCount = observations.filter((item) => item.location != null).length;
  return (
    <ScreenContainer className="px-5" safeAreaClassName="pt-3">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenTitle title="扫描详情" subtitle={formatDate(session.startedAt)} action={<IconAction icon="close" label="返回历史" onPress={() => router.back()} />} />
        <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View><Text style={[styles.summaryValue, { color: colors.text }]}>{observations.length}</Text><Text style={[styles.summaryLabel, { color: colors.tabIconDefault }]}>设备观测</Text></View>
          <View><Text style={[styles.summaryValue, { color: colors.text }]}>{devices.length}</Text><Text style={[styles.summaryLabel, { color: colors.tabIconDefault }]}>发现设备</Text></View>
          <View><Text style={[styles.summaryValue, { color: colors.text }]}>{locatedCount}</Text><Text style={[styles.summaryLabel, { color: colors.tabIconDefault }]}>位置快照</Text></View>
          <StatusPill active={Boolean(session.stoppedAt)} label={session.stoppedAt ? "已完成" : "进行中"} />
        </View>
        <View style={styles.charts}><SessionRssiChart observations={observations} /><SessionPathChart observations={observations} /></View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>本次扫描的设备</Text>
        <View style={styles.deviceList}>{devices.length ? devices.map((device) => <Pressable key={device.device.id} onPress={() => router.push({ pathname: "/device/[id]" as never, params: { id: device.device.id, sessionId: id } } as never)} style={({ pressed }) => [styles.deviceRow, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}><View style={styles.deviceIcon}><MaterialIcons name="bluetooth" size={20} color="#006C5F" /></View><View style={styles.deviceCopy}><Text style={[styles.deviceName, { color: colors.text }]} numberOfLines={1}>{device.device.name ?? device.device.localName ?? "未命名 BLE 设备"}</Text><Text style={[styles.deviceMeta, { color: colors.tabIconDefault }]}>{device.observationCount} 条观测 · {device.signalBearing.samplesUsed} 个方位样本</Text></View><Text style={[styles.deviceRssi, { color: colors.text }]}>{rssiLabel(device.lastRssi)}</Text><MaterialIcons name="chevron-right" size={20} color={colors.tabIconDefault} /></Pressable>) : <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.emptyBody, { color: colors.tabIconDefault }]}>这次扫描没有保留可展示的设备观测。</Text></View>}</View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 32 },
  summary: { alignItems: "center", borderRadius: 18, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 14 },
  summaryValue: { fontSize: 22, fontVariant: ["tabular-nums"], fontWeight: "700", textAlign: "center" },
  summaryLabel: { fontSize: 11, marginTop: 2, textAlign: "center" },
  charts: { gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginTop: 6 },
  deviceList: { gap: 8 },
  deviceRow: { alignItems: "center", borderRadius: 16, borderWidth: 1, flexDirection: "row", minHeight: 70, padding: 11 },
  deviceIcon: { alignItems: "center", backgroundColor: "#E1F5ED", borderRadius: 13, height: 38, justifyContent: "center", marginRight: 10, width: 38 },
  deviceCopy: { flex: 1, gap: 3 },
  deviceName: { fontSize: 15, fontWeight: "700" },
  deviceMeta: { fontSize: 11 },
  deviceRssi: { fontSize: 12, fontWeight: "700", marginRight: 5 },
  empty: { alignItems: "center", borderRadius: 18, borderWidth: 1, gap: 8, padding: 22 },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptyBody: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  pressed: { opacity: 0.7 },
});
