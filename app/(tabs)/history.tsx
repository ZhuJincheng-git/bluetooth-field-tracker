import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useState } from "react";
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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingDeleteSessionId, setPendingDeleteSessionId] = useState<string | null>(null);
  const handleExport = async (session: ScanSession) => {
    const observations = state.observations.filter((observation) => observation.sessionId === session.id);
    try {
      const result = await exportSessionData(session, observations);
      setFeedback(`已准备 ${result.fileName}：仅包含本次扫描及 ${observations.length} 条观测。`);
    } catch (error) {
      setFeedback(`导出未完成：${error instanceof Error ? error.message : "无法创建导出文件。"}`);
    }
  };
  const handleDelete = (session: ScanSession) => {
    if (!session.stoppedAt) {
      setFeedback("当前扫描正在运行；请先停止采集后再删除该记录。");
      return;
    }
    setPendingDeleteSessionId(session.id);
  };
  const handleClearAll = () => {
    Alert.alert("清空全部扫描记录？", "将永久删除本机保存的所有扫描会话与观测，且无法恢复。", [
      { text: "取消", style: "cancel" },
      { text: "清空全部", style: "destructive", onPress: () => { setFeedback(null); void clearHistory(); } },
    ]);
  };

  return (
    <ScreenContainer className="px-5" safeAreaClassName="pt-3">
      <View style={styles.headerActions}>
        <View style={styles.headerCopy}><ScreenTitle title="扫描历史" subtitle={`${state.sessions.length} 次扫描 · ${state.observations.length} 条观测`} /></View>
        <IconAction icon="delete-outline" label="清空全部扫描记录" onPress={handleClearAll} />
      </View>
      {feedback ? <View style={[styles.feedback, { backgroundColor: "#E1F5ED" }]}><MaterialIcons name="info-outline" size={18} color="#006C5F" /><Text style={styles.feedbackText}>{feedback}</Text><Pressable onPress={() => setFeedback(null)} style={styles.feedbackClose}><MaterialIcons name="close" size={18} color="#006C5F" /></Pressable></View> : null}
      <FlatList
        data={state.sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={state.sessions.length ? styles.list : styles.emptyList}
        renderItem={({ item }) => <SessionCard session={item} isPendingDelete={pendingDeleteSessionId === item.id} onOpen={() => router.push({ pathname: "/session/[id]" as never, params: { id: item.id } } as never)} onExport={() => void handleExport(item)} onDelete={() => handleDelete(item)} onCancelDelete={() => setPendingDeleteSessionId(null)} onConfirmDelete={() => { deleteSession(item.id); setPendingDeleteSessionId(null); }} />}
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

function SessionCard({ session, onOpen, onExport, onDelete, onCancelDelete, onConfirmDelete, isPendingDelete }: { session: ScanSession; onOpen: () => void; onExport: () => void; onDelete: () => void; onCancelDelete: () => void; onConfirmDelete: () => void; isPendingDelete: boolean }) {
  const colors = useColors();
  const durationMs = (session.stoppedAt ?? Date.now()) - session.startedAt;
  const minutes = Math.max(1, Math.round(durationMs / 60_000));
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel="查看本次扫描详情" style={({ pressed }) => [styles.cardTop, pressed && styles.pressed]}>
        <View style={styles.calendarIcon}><MaterialIcons name="radar" size={20} color="#006C5F" /></View>
        <View style={styles.cardCopy}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{formatDate(session.startedAt)}</Text>
          <Text style={[styles.cardSubtitle, { color: colors.tabIconDefault }]}>{session.stoppedAt ? "已结束" : "正在采集"} · {minutes} 分钟</Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={colors.tabIconDefault} />
      </Pressable>
      <View style={styles.cardMetrics}>
        <Text style={[styles.metricText, { color: colors.tabIconDefault }]}>{session.observationCount} 条观测</Text>
        <Text style={[styles.metricText, { color: colors.tabIconDefault }]}>{session.backgroundTrackingRequested ? "已请求后台采集" : "仅前台采集"}</Text>
      </View>
      <Pressable onPress={onOpen} style={({ pressed }) => [styles.detailLink, pressed && styles.pressed]}><Text style={styles.detailLinkText}>查看设备、位置轨迹与 RSSI 可视化</Text><MaterialIcons name="insights" size={18} color="#006C5F" /></Pressable>
      <View style={styles.cardActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="导出本次扫描 JSON" onPress={onExport} style={({ pressed }) => [styles.exportButton, pressed && styles.pressed]}>
          <MaterialIcons name="ios-share" size={18} color="#006C5F" />
          <Text style={styles.exportText}>导出本次 JSON</Text>
        </Pressable>
        {isPendingDelete ? <View style={styles.inlineDelete}><Text style={styles.inlineDeleteText}>删除此会话？</Text><Pressable onPress={onCancelDelete}><Text style={styles.cancelText}>取消</Text></Pressable><Pressable onPress={onConfirmDelete}><Text style={styles.confirmDeleteText}>确认</Text></Pressable></View> : session.stoppedAt ? (
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
  detailLink: { alignItems: "center", flexDirection: "row", gap: 6 },
  detailLinkText: { color: "#006C5F", fontSize: 12, fontWeight: "700" },
  cardActions: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  feedback: { alignItems: "center", borderRadius: 14, flexDirection: "row", gap: 8, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 10 },
  feedbackText: { color: "#003731", flex: 1, fontSize: 12, lineHeight: 17 },
  feedbackClose: { padding: 2 },
  exportButton: { alignItems: "center", backgroundColor: "#E1F5ED", borderRadius: 999, flexDirection: "row", gap: 6, minHeight: 38, paddingHorizontal: 13 },
  exportText: { color: "#006C5F", fontSize: 13, fontWeight: "700" },
  deleteButton: { alignItems: "center", borderRadius: 999, flexDirection: "row", gap: 5, minHeight: 38, paddingHorizontal: 8 },
  deleteText: { color: "#B3261E", fontSize: 13, fontWeight: "700" },
  inlineDelete: { alignItems: "center", flexDirection: "row", gap: 8 },
  inlineDeleteText: { color: "#5F2120", fontSize: 12 },
  cancelText: { color: "#5B625F", fontSize: 12, fontWeight: "700" },
  confirmDeleteText: { color: "#B3261E", fontSize: 12, fontWeight: "700" },
  activeHint: { fontSize: 12 },
  pressed: { opacity: 0.65, transform: [{ scale: 0.98 }] },
});
