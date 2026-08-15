import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";

export function ScreenTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.titleRow}>
      <View style={styles.titleCopy}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function StatusPill({ active, label }: { active: boolean; label: string }) {
  const colors = useColors();
  return (
    <View style={[styles.pill, { backgroundColor: active ? "#A4F2DF" : colors.surface }]}>
      <View style={[styles.pillDot, { backgroundColor: active ? "#006C5F" : colors.tabIconDefault }]} />
      <Text style={[styles.pillText, { color: active ? "#003731" : colors.tabIconDefault }]}>{label}</Text>
    </View>
  );
}

export function IconAction({ icon, label, onPress }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}>
      <MaterialIcons name={icon} size={22} color={colors.text} />
    </Pressable>
  );
}

export function MetricTile({ icon, label, value }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.metric, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <MaterialIcons name={icon} size={18} color="#006C5F" />
      <Text style={[styles.metricLabel, { color: colors.tabIconDefault }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  titleCopy: { flex: 1, gap: 3 },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5, lineHeight: 34 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  pill: { alignItems: "center", borderRadius: 999, flexDirection: "row", gap: 7, paddingHorizontal: 11, paddingVertical: 7 },
  pillDot: { borderRadius: 5, height: 8, width: 8 },
  pillText: { fontSize: 12, fontWeight: "700" },
  iconAction: { alignItems: "center", borderRadius: 24, height: 48, justifyContent: "center", width: 48 },
  pressed: { opacity: 0.65, transform: [{ scale: 0.97 }] },
  metric: { borderRadius: 16, borderWidth: 1, flex: 1, gap: 5, minHeight: 96, padding: 12 },
  metricLabel: { fontSize: 12, fontWeight: "500" },
  metricValue: { fontSize: 15, fontWeight: "700", lineHeight: 20 },
});
