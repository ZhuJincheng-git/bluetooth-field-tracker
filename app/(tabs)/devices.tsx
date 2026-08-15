import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { ScreenTitle, StatusPill } from "@/components/tracker/ui";
import { useColors } from "@/hooks/use-colors";
import { distanceBandLabel, rssiLabel } from "@/lib/tracker/format";
import { relativePositionLabel } from "@/lib/tracker/estimation";
import { summarizeDeviceObservations, useTracker } from "@/lib/tracker/TrackerProvider";
import type { TrackedDeviceSummary } from "@/lib/tracker/types";

function deviceName(device: TrackedDeviceSummary): string {
  return device.device.name ?? device.device.localName ?? "未命名 BLE 设备";
}

export default function DevicesScreen() {
  const colors = useColors();
  const { state } = useTracker();
  const activeSessionId = state.activeSession?.id;
  const devices = activeSessionId ? summarizeDeviceObservations(state.observations.filter((item) => item.sessionId === activeSessionId)) : [];

  return (
    <ScreenContainer className="px-5" safeAreaClassName="pt-3">
      <ScreenTitle
        title="设备"
        subtitle={activeSessionId ? (devices.length ? `本次扫描已发现 ${devices.length} 台设备` : "本次扫描尚未发现设备") : "启动新扫描后显示本次会话的设备"}
        action={<StatusPill active={state.lifecycle === "scanning"} label={state.lifecycle === "scanning" ? "采集中" : "未采集"} />}
      />
      <FlatList
        data={devices}
        contentContainerStyle={devices.length ? styles.list : styles.emptyList}
        keyExtractor={(item) => item.device.id}
        renderItem={({ item }) => <DeviceRow item={item} sessionId={activeSessionId} />}
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="bluetooth-searching" size={38} color="#006C5F" />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{activeSessionId ? "本次扫描暂无设备" : "没有进行中的扫描"}</Text>
            <Text style={[styles.emptyBody, { color: colors.tabIconDefault }]}>{activeSessionId ? "蓝牙设备会在当前会话内持续更新；历史会话请到“历史”页查看。" : "设备页只展示当前扫描会话，开始采集后即可查看。"}</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

function DeviceRow({ item, sessionId }: { item: TrackedDeviceSummary; sessionId: string | undefined }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`查看 ${deviceName(item)} 详情`}
      onPress={() => router.push({ pathname: "/device/[id]" as never, params: { id: item.device.id, sessionId: sessionId ?? "" } } as never)}
      style={({ pressed }) => [styles.deviceRow, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
    >
      <View style={styles.signalIcon}>
        <MaterialIcons name="bluetooth" size={22} color="#006C5F" />
      </View>
      <View style={styles.deviceCopy}>
        <Text style={[styles.deviceName, { color: colors.text }]} numberOfLines={1}>{deviceName(item)}</Text>
        <Text style={[styles.deviceId, { color: colors.tabIconDefault }]} numberOfLines={1}>{item.device.id}</Text>
        <Text style={[styles.deviceEstimate, { color: colors.tabIconDefault }]}>{distanceBandLabel(item.estimate.distanceBand)} · {relativePositionLabel(item.signalBearing.relativePosition)} · {item.signalBearing.samplesUsed} 个方位样本</Text>
      </View>
      <View style={styles.rssi}>
        <Text style={[styles.rssiValue, { color: colors.text }]}>{rssiLabel(item.lastRssi)}</Text>
        <Text style={[styles.rssiMeta, { color: colors.tabIconDefault }]}>{item.observationCount} 次记录</Text>
        <MaterialIcons name="chevron-right" size={22} color={colors.tabIconDefault} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10, paddingBottom: 24 },
  emptyList: { flexGrow: 1, justifyContent: "center", paddingBottom: 80 },
  empty: { alignItems: "center", borderRadius: 24, borderWidth: 1, gap: 10, padding: 28 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 2 },
  emptyBody: { fontSize: 14, lineHeight: 21, maxWidth: 270, textAlign: "center" },
  deviceRow: { alignItems: "center", borderRadius: 18, borderWidth: 1, flexDirection: "row", minHeight: 96, padding: 13 },
  pressed: { opacity: 0.72 },
  signalIcon: { alignItems: "center", backgroundColor: "#E1F5ED", borderRadius: 16, height: 44, justifyContent: "center", marginRight: 12, width: 44 },
  deviceCopy: { flex: 1, gap: 3, minWidth: 0 },
  deviceName: { fontSize: 16, fontWeight: "700" },
  deviceId: { fontSize: 12 },
  deviceEstimate: { fontSize: 12, marginTop: 2 },
  rssi: { alignItems: "flex-end", gap: 2, marginLeft: 8 },
  rssiValue: { fontSize: 13, fontWeight: "700" },
  rssiMeta: { fontSize: 11 },
});
