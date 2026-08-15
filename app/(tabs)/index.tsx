import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconAction, MetricTile, ScreenTitle, StatusPill } from "@/components/tracker/ui";
import { useColors } from "@/hooks/use-colors";
import { formatAccuracy, formatCoordinate, formatElapsed, formatHeading, formatLocationAge, formatSpeed, formatSpeedSource } from "@/lib/tracker/format";
import { nativeTrackerService } from "@/lib/tracker/NativeTrackerService";
import { locationQualityLabel } from "@/lib/tracker/location-quality";
import { useTracker } from "@/lib/tracker/TrackerProvider";

export default function ScanScreen() {
  const colors = useColors();
  const { state, startSession, stopSession, recordObservation, setLatestLocation, setLatestMotion, setLifecycle, setLocationQuality, setPermissions } = useTracker();
  const [now, setNow] = useState(Date.now());
  const isScanning = state.lifecycle === "scanning";
  const locationAge = state.latestLocation ? now - state.latestLocation.capturedAt : null;
  const hasFreshLocation = locationAge != null && locationAge <= Math.max(state.preferences.locationIntervalMs * 2, 20_000);

  useEffect(() => {
    if (!isScanning) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isScanning]);

  useEffect(() => {
    if (isScanning) nativeTrackerService.updatePreferences(state.preferences);
  }, [isScanning, state.preferences]);

  const handleStart = async () => {
    setLifecycle("starting");
    try {
      const permissions = await nativeTrackerService.requestRequiredPermissions(state.preferences.requestBackgroundTracking);
      setPermissions(permissions);
      if (permissions.bluetooth !== "granted" || permissions.locationForeground !== "granted") {
        throw new Error("需要蓝牙扫描和精确位置权限才能创建采集记录。请在系统设置中允许后重试。");
      }
      if (state.preferences.requestBackgroundTracking && permissions.locationBackground !== "granted") {
        throw new Error("后台采集需要“始终允许”位置权限。请在系统设置完成授权，或在设置中关闭后台采集后重试。");
      }
      startSession();
      await nativeTrackerService.start(state.preferences, { onLocation: setLatestLocation, onLocationQuality: setLocationQuality, onMotion: setLatestMotion, onObservation: recordObservation });
    } catch (error) {
      await nativeTrackerService.stop();
      stopSession();
      setLifecycle("error", error instanceof Error ? error.message : "无法开始采集。");
    }
  };

  const handleStop = async () => {
    setLifecycle("stopping");
    await nativeTrackerService.stop();
    stopSession();
  };

  return (
    <ScreenContainer className="px-5" safeAreaClassName="pt-3">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenTitle title="采集" subtitle="周边 BLE 与运动状态" action={<IconAction icon="settings" label="打开扫描设置" onPress={() => router.push("/settings" as never)} />} />
      <View style={[styles.hero, { backgroundColor: isScanning ? "#E1F5ED" : colors.surface, borderColor: isScanning ? "#A4F2DF" : colors.border }]}>
        <View style={styles.heroTop}>
          <View style={[styles.radar, { backgroundColor: isScanning ? "#A4F2DF" : "#EDF0EE" }]}><MaterialIcons name="radar" size={34} color="#006C5F" /></View>
          <StatusPill active={isScanning} label={isScanning ? "正在采集" : "准备就绪"} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.text }]}>{isScanning ? formatElapsed(state.activeSession?.startedAt ?? now, now) : "开始一次采集"}</Text>
        <Text style={[styles.heroBody, { color: colors.tabIconDefault }]}>{isScanning ? (state.locationQuality === "servicesOff" ? "系统定位服务未开启；蓝牙会继续采集，但观测不会附带坐标。" : hasFreshLocation ? "蓝牙与位置数据正在独立更新；异常或低精度位置会被自动过滤。" : "蓝牙已开始采集，正在等待符合精度要求的首个位置更新。") : state.lastError ?? "开始后将先检查蓝牙、位置和通知权限，再创建本机扫描会话。"}</Text>
        <Pressable onPress={() => void (isScanning ? handleStop() : handleStart())} accessibilityRole="button" accessibilityLabel={isScanning ? "停止采集" : "开始采集"} style={({ pressed }) => [styles.primaryButton, { backgroundColor: isScanning ? "#C2382B" : "#006C5F" }, pressed && styles.buttonPressed]}>
          <MaterialIcons name={isScanning ? "stop-circle" : "play-circle"} size={22} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>{isScanning ? "停止采集" : "开始采集"}</Text>
        </Pressable>
      </View>
      <View style={[styles.locationCard, { backgroundColor: colors.surface, borderColor: hasFreshLocation ? "#A4F2DF" : colors.border }]}>
        <View style={styles.locationHeader}>
          <View style={styles.locationLabel}><MaterialIcons name="my-location" size={19} color="#006C5F" /><Text style={[styles.locationTitle, { color: colors.text }]}>实时位置</Text></View>
          <View style={[styles.locationLive, { backgroundColor: hasFreshLocation && state.locationQuality === "stable" ? "#E1F5ED" : "#EDF0EE" }]}><View style={[styles.locationDot, { backgroundColor: hasFreshLocation && state.locationQuality === "stable" ? "#006C5F" : colors.tabIconDefault }]} /><Text style={[styles.locationLiveText, { color: hasFreshLocation && state.locationQuality === "stable" ? "#003731" : colors.tabIconDefault }]}>{state.locationQuality === "stable" ? formatLocationAge(state.latestLocation?.capturedAt ?? null, now) : locationQualityLabel(state.locationQuality)}</Text></View>
        </View>
        <Text style={[styles.coordinate, { color: state.latestLocation ? colors.text : colors.tabIconDefault }]}>{formatCoordinate(state.latestLocation)}</Text>
        <Text style={[styles.locationMeta, { color: colors.tabIconDefault }]}>{formatAccuracy(state.latestLocation?.accuracyM ?? null)} · 最大容许 ±{state.preferences.maxLocationAccuracyM} m · 每 {state.preferences.locationIntervalMs / 1000} 秒或移动 {state.preferences.locationDistanceIntervalM} m 更新</Text>
      </View>
      <View style={styles.metrics}>
        <MetricTile icon="speed" label="移动速度" value={formatSpeed(state.latestLocation?.speedMps ?? null)} />
        <MetricTile icon="explore" label="手机朝向" value={formatHeading(state.latestMotion?.phoneHeadingDegrees ?? null)} />
      </View>
      <Text style={[styles.speedSourceHint, { color: colors.tabIconDefault }]}>移动速度来源：{formatSpeedSource(state.latestLocation?.speedSource)}。优先使用系统 GPS；GPS 未给出有效速度且坐标移动至少 1 m 时，以位移/时间补全。</Text>
      {state.preferences.showMotionDiagnostics ? <Text style={[styles.motionHint, { color: colors.tabIconDefault }]}>行进航向：{formatHeading(state.latestLocation?.headingDegrees ?? null)} · 朝向传感器：{state.latestMotion?.headingSource === "magnetometer" ? "罗盘" : state.latestMotion?.headingSource === "location" ? "定位航向" : "等待"} · 运动强度：{state.latestMotion?.movementIntensityMps2 == null ? "等待" : `${state.latestMotion.movementIntensityMps2.toFixed(1)} m/s²`}（运动强度不是速度）</Text> : null}
      <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.text }]}>最近发现</Text><Pressable onPress={() => router.push("/(tabs)/devices" as never)} style={({ pressed }) => pressed && styles.buttonPressed}><Text style={styles.allLink}>查看全部</Text></Pressable></View>
      {state.devices.length ? (
        <View style={[styles.latestDevice, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.deviceIcon}><MaterialIcons name="bluetooth" size={22} color="#006C5F" /></View>
          <View style={styles.deviceCopy}><Text style={[styles.deviceName, { color: colors.text }]} numberOfLines={1}>{state.devices[0].device.name ?? state.devices[0].device.localName ?? "未命名 BLE 设备"}</Text><Text style={[styles.deviceMeta, { color: colors.tabIconDefault }]}>{state.devices[0].lastRssi ?? "—"} dBm · {state.devices[0].observationCount} 次记录</Text></View>
          <MaterialIcons name="chevron-right" size={22} color={colors.tabIconDefault} />
        </View>
      ) : (
        <View style={[styles.emptyNotice, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons name="sensors" size={20} color="#006C5F" /><Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>尚未写入设备观测。开始采集后，符合条件的 BLE 广播会显示在这里。</Text></View>
      )}
      <View style={[styles.privacy, { borderColor: colors.border }]}><MaterialIcons name="privacy-tip" size={18} color={colors.tabIconDefault} /><Text style={[styles.privacyText, { color: colors.tabIconDefault }]}>采集数据默认仅保存在本机。RSSI 方位仅作估算提示，不表示精确定位。</Text></View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 32 },
  hero: { borderRadius: 24, borderWidth: 1, gap: 12, padding: 20 },
  heroTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  radar: { alignItems: "center", borderRadius: 18, height: 56, justifyContent: "center", width: 56 },
  heroTitle: { fontSize: 25, fontWeight: "700", letterSpacing: -0.3, marginTop: 4 },
  heroBody: { fontSize: 14, lineHeight: 21, minHeight: 42 },
  primaryButton: { alignItems: "center", borderRadius: 999, flexDirection: "row", gap: 9, justifyContent: "center", marginTop: 6, minHeight: 52 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  buttonPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  locationCard: { borderRadius: 18, borderWidth: 1, gap: 8, marginTop: 16, padding: 15 },
  locationHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  locationLabel: { alignItems: "center", flexDirection: "row", gap: 7 },
  locationTitle: { fontSize: 15, fontWeight: "700" },
  locationLive: { alignItems: "center", borderRadius: 999, flexDirection: "row", gap: 6, paddingHorizontal: 9, paddingVertical: 5 },
  locationDot: { borderRadius: 4, height: 7, width: 7 },
  locationLiveText: { fontSize: 11, fontWeight: "700" },
  coordinate: { fontSize: 22, fontVariant: ["tabular-nums"], fontWeight: "700", letterSpacing: -0.2, lineHeight: 28 },
  locationMeta: { fontSize: 12, lineHeight: 18 },
  metrics: { flexDirection: "row", gap: 8, marginTop: 8 },
  speedSourceHint: { fontSize: 12, lineHeight: 18, marginTop: 8, paddingHorizontal: 3 },
  motionHint: { fontSize: 12, lineHeight: 18, marginTop: 7, paddingHorizontal: 3 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10, marginTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  allLink: { color: "#006C5F", fontSize: 14, fontWeight: "700", padding: 6 },
  latestDevice: { alignItems: "center", borderRadius: 18, borderWidth: 1, flexDirection: "row", minHeight: 72, padding: 12 },
  deviceIcon: { alignItems: "center", backgroundColor: "#E1F5ED", borderRadius: 14, height: 42, justifyContent: "center", marginRight: 12, width: 42 },
  deviceCopy: { flex: 1, gap: 3 },
  deviceName: { fontSize: 15, fontWeight: "700" },
  deviceMeta: { fontSize: 12 },
  emptyNotice: { alignItems: "center", borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 76, padding: 14 },
  emptyText: { flex: 1, fontSize: 13, lineHeight: 19 },
  privacy: { alignItems: "flex-start", borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 9, marginTop: 22, paddingHorizontal: 4, paddingTop: 16 },
  privacyText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
