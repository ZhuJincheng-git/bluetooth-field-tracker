import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconAction, ScreenTitle, StatusPill } from "@/components/tracker/ui";
import { useColors } from "@/hooks/use-colors";
import { formatCoordinate, formatHeading, rssiLabel } from "@/lib/tracker/format";
import { relativePositionLabel } from "@/lib/tracker/estimation";
import { summarizeDeviceObservations, useTracker } from "@/lib/tracker/TrackerProvider";

export default function DeviceDetailScreen() {
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId?: string }>();
  const colors = useColors();
  const { state } = useTracker();
  const observations = state.observations.filter((item) => item.device.id === id && (!sessionId || item.sessionId === sessionId)).sort((a, b) => b.observedAt - a.observedAt);
  const device = summarizeDeviceObservations(observations).find((item) => item.device.id === id);
  const label = device?.device.name ?? device?.device.localName ?? "BLE 设备";
  const estimate = device?.estimate;
  const signalBearing = device?.signalBearing;

  return (
    <ScreenContainer className="px-5" safeAreaClassName="pt-3">
      <ScreenTitle title={label} subtitle={id} action={<IconAction icon="close" label="返回设备列表" onPress={() => router.back()} />} />
      <View style={[styles.estimate, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.estimateIcon}><MaterialIcons name="explore" size={26} color="#006C5F" /></View>
        <View style={styles.estimateCopy}>
          <Text style={[styles.estimateTitle, { color: colors.text }]}>手机相对方位：{relativePositionLabel(signalBearing?.relativePosition ?? "unknown")}</Text>
          <Text style={[styles.estimateBody, { color: colors.tabIconDefault }]}>{signalBearing?.rationale ?? "转动手机并持续采样后，系统会基于较强 RSSI 所在扇区显示粗略方位。"}</Text>
          {signalBearing?.absoluteBearingDegrees != null ? <Text style={[styles.bearingMeta, { color: colors.tabIconDefault }]}>扫描峰值方位约 {signalBearing.absoluteBearingDegrees}° · 覆盖 {Math.round(signalBearing.coverageDegrees)}° · RSSI 波动 {signalBearing.rssiRangeDb} dB</Text> : null}
        </View>
        <StatusPill active={signalBearing?.confidence === "medium"} label={`${signalBearing?.confidence === "medium" ? "中" : "低"}置信度`} />
      </View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>观测记录</Text>
      <FlatList
        data={observations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={observations.length ? styles.list : styles.emptyList}
        renderItem={({ item }) => (
          <View style={[styles.observation, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View><Text style={[styles.rssi, { color: colors.text }]}>{rssiLabel(item.rssi)}</Text><Text style={[styles.time, { color: colors.tabIconDefault }]}>{new Intl.DateTimeFormat("zh-CN", { timeStyle: "medium" }).format(item.observedAt)}</Text><Text style={[styles.motion, { color: colors.tabIconDefault }]}>{formatHeading(item.motion?.phoneHeadingDegrees ?? null)} · {item.motion?.headingSource === "magnetometer" ? "罗盘" : item.motion?.headingSource === "location" ? "定位" : "朝向未知"}</Text></View>
            <View style={styles.observationRight}><Text style={[styles.location, { color: colors.tabIconDefault }]} numberOfLines={1}>{formatCoordinate(item.location)}</Text><Text style={[styles.motion, { color: colors.tabIconDefault }]}>{item.motion?.movementIntensityMps2 == null ? "运动未知" : `${item.motion.movementIntensityMps2.toFixed(1)} m/s²`}</Text></View>
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
  bearingMeta: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  list: { gap: 8, paddingBottom: 24 },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  empty: { alignItems: "center", padding: 28 },
  observation: { alignItems: "center", borderRadius: 16, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 14 },
  observationRight: { alignItems: "flex-end", gap: 4, maxWidth: 170 },
  rssi: { fontSize: 15, fontWeight: "700" },
  time: { fontSize: 12, marginTop: 3 },
  location: { fontSize: 12, maxWidth: 160, textAlign: "right" },
  motion: { fontSize: 11, marginTop: 4 },
});
