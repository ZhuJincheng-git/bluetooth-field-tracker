import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { ScreenTitle, StatusPill } from "@/components/tracker/ui";
import { useColors } from "@/hooks/use-colors";
import { distanceBandLabel, rssiLabel } from "@/lib/tracker/format";
import { relativePositionLabel } from "@/lib/tracker/estimation";
import { useTracker } from "@/lib/tracker/TrackerProvider";
import type { TrackedDeviceSummary } from "@/lib/tracker/types";

function deviceName(device: TrackedDeviceSummary): string {
  return device.device.name ?? device.device.localName ?? "未命名 BLE 设备";
}

export default function DevicesScreen() {
  const colors = useColors();
  const { state } = useTracker();

  return (
    <ScreenContainer className="px-5" safeAreaClassName="pt-3">
      <ScreenTitle
        title="设备"
        subtitle={state.devices.length ? `已发现 ${state.devices.length} 台设备` : "开始采集后会显示附近设备"}
        action={<StatusPill active={state.lifecycle === "scanning"} label={state.lifecycle === "scanning" ? "采集中" : "未采集"} />}
      />
      <FlatList
        data={state.devices}
        contentContainerStyle={state.devices.length ? styles.list : styles.emptyList}
        keyExtractor={(item) => item.device.id}
        renderItem={({ item }) => <DeviceRow item={item} />}
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="bluetooth-searching" size={38} color="#006C5F" />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>尚未发现设备</Text>
            <Text style={[styles.emptyBody, { color: colors.tabIconDefault }]}>返回“采集”页启动一次扫描。已记录的设备会按最近发现时间排序。</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

function DeviceRow({ item }: { item: TrackedDeviceSummary }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`查看 ${deviceName(item)} 详情`}
      onPress={() => router.push({ pathname: "/device/[id]" as never, params: { id: item.device.id } } as never)}
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
