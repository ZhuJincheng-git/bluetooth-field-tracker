import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconAction, ScreenTitle } from "@/components/tracker/ui";
import { useColors } from "@/hooks/use-colors";
import { exportTrackerData } from "@/lib/tracker/exporter";
import { useTracker } from "@/lib/tracker/TrackerProvider";
import type { ScanSession } from "@/lib/tracker/types";

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

export default function HistoryScreen() {
  const colors = useColors();
  const { state, clearHistory } = useTracker();
  const handleClear = () => {
    Alert.alert("清除本地历史？", "此操作会清除本机保存的所有扫描会话与观测记录，且无法恢复。", [
      { text: "取消", style: "cancel" },
      { text: "清除", style: "destructive", onPress: () => void clearHistory() },
    ]);
  };
  const handleExport = async () => {
    if (!state.observations.length) {
      Alert.alert("暂无可导出数据", "请先完成至少一次带有设备观测的采集。");
      return;
    }
    try {
      const result = await exportTrackerData(state.sessions, state.observations);
      Alert.alert("JSON 已创建", `已准备 ${result.fileName}，请在系统面板中选择保存或分享位置。`);
    } catch (error) {
      Alert.alert("导出未完成", error instanceof Error ? error.message : "无法创建导出文件。");
    }
  };

  return (
    <ScreenContainer className="px-5" safeAreaClassName="pt-3">
      <View style={styles.headerActions}>
        <View style={styles.headerCopy}><ScreenTitle title="历史" subtitle={`${state.sessions.length} 个会话 · ${state.observations.length} 条观测`} /></View>
        <IconAction icon="ios-share" label="导出 JSON" onPress={() => void handleExport()} />
        <IconAction icon="delete-outline" label="清除本地历史" onPress={handleClear} />
      </View>
      <FlatList
        data={state.sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={state.sessions.length ? styles.list : styles.emptyList}
        renderItem={({ item }) => <SessionCard session={item} />}
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="history" size={38} color="#006C5F" />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>没有本地记录</Text>
            <Text style={[styles.emptyBody, { color: colors.tabIconDefault }]}>完成一次采集后，扫描会话与设备观测会安全地保存在本机。</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

function SessionCard({ session }: { session: ScanSession }) {
  const colors = useColors();
  const durationMs = (session.stoppedAt ?? Date.now()) - session.startedAt;
  const minutes = Math.max(1, Math.round(durationMs / 60_000));
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardTop}>
        <View style={styles.calendarIcon}><MaterialIcons name="radar" size={20} color="#006C5F" /></View>
        <View style={styles.cardCopy}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{formatDate(session.startedAt)}</Text>
          <Text style={[styles.cardSubtitle, { color: colors.tabIconDefault }]}>{session.stoppedAt ? "已结束" : "正在采集"} · {minutes} 分钟</Text>
        </View>
      </View>
      <View style={styles.cardMetrics}>
        <Text style={[styles.metricText, { color: colors.tabIconDefault }]}>{session.observationCount} 条观测</Text>
        <Text style={[styles.metricText, { color: colors.tabIconDefault }]}>{session.backgroundTrackingRequested ? "已请求后台采集" : "仅前台采集"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerActions: { alignItems: "flex-start", flexDirection: "row", gap: 2 },
  headerCopy: { flex: 1 },
  list: { gap: 10, paddingBottom: 24 },
  emptyList: { flexGrow: 1, justifyContent: "center", paddingBottom: 80 },
  empty: { alignItems: "center", borderRadius: 24, borderWidth: 1, gap: 10, padding: 28 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 2 },
  emptyBody: { fontSize: 14, lineHeight: 21, maxWidth: 270, textAlign: "center" },
  card: { borderRadius: 18, borderWidth: 1, gap: 14, padding: 15 },
  cardTop: { alignItems: "center", flexDirection: "row" },
  calendarIcon: { alignItems: "center", backgroundColor: "#E1F5ED", borderRadius: 14, height: 42, justifyContent: "center", marginRight: 12, width: 42 },
  cardCopy: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardSubtitle: { fontSize: 13 },
  cardMetrics: { borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 16, paddingTop: 12 },
  metricText: { fontSize: 12 },
});
