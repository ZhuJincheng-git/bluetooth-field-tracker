import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconAction, ScreenTitle } from "@/components/tracker/ui";
import { useColors } from "@/hooks/use-colors";
import { exportSessionData } from "@/lib/tracker/exporter";
import { useTracker } from "@/lib/tracker/TrackerProvider";
import type { ScanSession } from "@/lib/tracker/types";

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

export default function HistoryScreen() {
  const colors = useColors();
  const { state, clearHistory, deleteSession } = useTracker();
  const handleClear = () => {
    Alert.alert("清除本地历史？", "此操作会清除本机保存的所有扫描会话与观测记录，且无法恢复。", [
      { text: "取消", style: "cancel" },
      { text: "清除", style: "destructive", onPress: () => void clearHistory() },
    ]);
  };
  const handleExport = async (session: ScanSession) => {
    const observations = state.observations.filter((observation) => observation.sessionId === session.id);
    try {
      const result = await exportSessionData(session, observations);
      Alert.alert("本次扫描 JSON 已创建", `此文件仅包含该次扫描会话和 ${observations.length} 条观测。请在系统面板中选择保存或分享位置。`);
    } catch (error) {
      Alert.alert("导出未完成", error instanceof Error ? error.message : "无法创建导出文件。");
    }
  };
  const handleDelete = (session: ScanSession) => {
    if (!session.stoppedAt) {
      Alert.alert("正在采集", "请先停止当前扫描，再删除这条扫描记录。");
      return;
    }
    Alert.alert("删除本次扫描？", "将只删除该会话及其设备观测，其他扫描记录不会受影响。", [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: () => deleteSession(session.id) },
    ]);
  };

  return (
    <ScreenContainer className="px-5" safeAreaClassName="pt-3">
      <View style={styles.headerActions}>
        <View style={styles.headerCopy}><ScreenTitle title="扫描历史" subtitle={`${state.sessions.length} 次扫描 · ${state.observations.length} 条观测`} /></View>
        <IconAction icon="delete-outline" label="清空全部扫描记录" onPress={handleClear} />
      </View>
      <FlatList
        data={state.sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={state.sessions.length ? styles.list : styles.emptyList}
        renderItem={({ item }) => <SessionCard session={item} onExport={() => void handleExport(item)} onDelete={() => handleDelete(item)} />}
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

function SessionCard({ session, onExport, onDelete }: { session: ScanSession; onExport: () => void; onDelete: () => void }) {
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
      <View style={styles.cardActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="导出本次扫描 JSON" onPress={onExport} style={({ pressed }) => [styles.exportButton, pressed && styles.pressed]}>
          <MaterialIcons name="ios-share" size={18} color="#006C5F" />
          <Text style={styles.exportText}>导出本次 JSON</Text>
        </Pressable>
        {session.stoppedAt ? (
          <Pressable accessibilityRole="button" accessibilityLabel="删除本次扫描" onPress={onDelete} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
            <MaterialIcons name="delete-outline" size={18} color="#B3261E" />
            <Text style={styles.deleteText}>删除</Text>
          </Pressable>
        ) : <Text style={[styles.activeHint, { color: colors.tabIconDefault }]}>结束后可删除</Text>}
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
  cardActions: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  exportButton: { alignItems: "center", backgroundColor: "#E1F5ED", borderRadius: 999, flexDirection: "row", gap: 6, minHeight: 38, paddingHorizontal: 13 },
  exportText: { color: "#006C5F", fontSize: 13, fontWeight: "700" },
  deleteButton: { alignItems: "center", borderRadius: 999, flexDirection: "row", gap: 5, minHeight: 38, paddingHorizontal: 8 },
  deleteText: { color: "#B3261E", fontSize: 13, fontWeight: "700" },
  activeHint: { fontSize: 12 },
  pressed: { opacity: 0.65, transform: [{ scale: 0.98 }] },
});
