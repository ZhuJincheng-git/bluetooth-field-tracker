import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import type { DeviceObservation, LocationSnapshot } from "@/lib/tracker/types";

const CHART_WIDTH = 312;
const CHART_HEIGHT = 102;
const CHART_PADDING = 10;

function sampleSeries<T>(items: T[], limit = 60): T[] {
  if (items.length <= limit) return items;
  const step = Math.ceil(items.length / limit);
  return items.filter((_, index) => index % step === 0).slice(-limit);
}

function linePoints(values: number[], min: number, max: number): string {
  const range = Math.max(1, max - min);
  return values.map((value, index) => {
    const x = CHART_PADDING + (index / Math.max(1, values.length - 1)) * (CHART_WIDTH - CHART_PADDING * 2);
    const y = CHART_HEIGHT - CHART_PADDING - ((value - min) / range) * (CHART_HEIGHT - CHART_PADDING * 2);
    return `${x},${y}`;
  }).join(" ");
}

function coordinatePoints(locations: LocationSnapshot[]): string {
  const latitudes = locations.map((location) => location.latitude);
  const longitudes = locations.map((location) => location.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const latitudeRange = Math.max(0.00001, maxLatitude - minLatitude);
  const longitudeRange = Math.max(0.00001, maxLongitude - minLongitude);
  return locations.map((location) => {
    const x = CHART_PADDING + ((location.longitude - minLongitude) / longitudeRange) * (CHART_WIDTH - CHART_PADDING * 2);
    const y = CHART_HEIGHT - CHART_PADDING - ((location.latitude - minLatitude) / latitudeRange) * (CHART_HEIGHT - CHART_PADDING * 2);
    return `${x},${y}`;
  }).join(" ");
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const colors = useColors();
  return <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.panelHeader}><Text style={[styles.panelTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.panelSubtitle, { color: colors.tabIconDefault }]}>{subtitle}</Text></View>{children}</View>;
}

export function SessionRssiChart({ observations }: { observations: DeviceObservation[] }) {
  const colors = useColors();
  const samples = sampleSeries(observations.filter((item) => item.rssi != null));
  const values = samples.map((item) => item.rssi as number);
  if (values.length < 2) return <Panel title="RSSI 信号变化" subtitle="样本不足"><EmptyChart message="至少需要两条带 RSSI 的观测记录" /></Panel>;
  const minimum = Math.min(...values) - 3;
  const maximum = Math.max(...values) + 3;
  return <Panel title="RSSI 信号变化" subtitle={`${values.length} 个抽样点 · ${Math.min(...values)} 至 ${Math.max(...values)} dBm`}><Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}><Line x1={CHART_PADDING} y1={CHART_HEIGHT / 2} x2={CHART_WIDTH - CHART_PADDING} y2={CHART_HEIGHT / 2} stroke={colors.border} strokeWidth="1" /><Polyline points={linePoints(values, minimum, maximum)} fill="none" stroke="#006C5F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><Circle cx={CHART_PADDING} cy={Number(linePoints([values[0]], minimum, maximum).split(",")[1])} r="3" fill="#006C5F" /></Svg></Panel>;
}

export function SessionPathChart({ observations }: { observations: DeviceObservation[] }) {
  const colors = useColors();
  const locations = sampleSeries(observations.map((item) => item.location).filter((item): item is LocationSnapshot => item != null));
  if (locations.length < 2) return <Panel title="位置轨迹概览" subtitle="本机坐标快照"><EmptyChart message="至少需要两条定位快照才能绘制轨迹" /></Panel>;
  const points = coordinatePoints(locations);
  const [first, last] = points.split(" ");
  const [firstX, firstY] = first.split(",").map(Number);
  const [lastX, lastY] = last.split(",").map(Number);
  return <Panel title="位置轨迹概览" subtitle={`${locations.length} 个位置点 · 仅表示相对变化`}><Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}><Line x1={CHART_PADDING} y1={CHART_HEIGHT - CHART_PADDING} x2={CHART_WIDTH - CHART_PADDING} y2={CHART_HEIGHT - CHART_PADDING} stroke={colors.border} strokeWidth="1" /><Polyline points={points} fill="none" stroke="#4D5F7B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><Circle cx={firstX} cy={firstY} r="4" fill="#006C5F" /><Circle cx={lastX} cy={lastY} r="4" fill="#C2382B" /></Svg><View style={styles.legend}><Text style={[styles.legendText, { color: colors.tabIconDefault }]}>绿色：起点</Text><Text style={[styles.legendText, { color: colors.tabIconDefault }]}>红色：终点</Text></View></Panel>;
}

function EmptyChart({ message }: { message: string }) {
  const colors = useColors();
  return <View style={styles.empty}><Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>{message}</Text></View>;
}

const styles = StyleSheet.create({
  panel: { borderRadius: 18, borderWidth: 1, gap: 10, padding: 14 },
  panelHeader: { gap: 3 },
  panelTitle: { fontSize: 15, fontWeight: "700" },
  panelSubtitle: { fontSize: 11 },
  empty: { alignItems: "center", height: CHART_HEIGHT, justifyContent: "center" },
  emptyText: { fontSize: 12, textAlign: "center" },
  legend: { flexDirection: "row", gap: 16, justifyContent: "flex-end" },
  legendText: { fontSize: 11 },
});
