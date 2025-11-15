import { ScrollView, StyleSheet, Text, View } from "react-native";

const metrics = [
  {
    label: "Active projects",
    value: "12",
    trend: "+3 this week",
    color: "#38bdf8",
  },
  {
    label: "Realtime checks",
    value: "98%",
    trend: "Healthy",
    color: "#a78bfa",
  },
  {
    label: "Team online",
    value: "24",
    trend: "8 collaborating now",
    color: "#34d399",
  },
];

const securityTasks = [
  "Approve 2 new device sign-ins",
  "Rotate workspace API keys",
  "Review anomaly report for Growth squad",
];

export default function OverviewScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Pulse Workspace</Text>
        <Text style={styles.heading}>Welcome back, Avery.</Text>
        <Text style={styles.subtitle}>
          Here is what your teams shipped overnight.
        </Text>
      </View>

      <View style={styles.metricsRow}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={[styles.metricValue, { color: metric.color }]}>
              {metric.value}
            </Text>
            <Text style={styles.metricTrend}>{metric.trend}</Text>
          </View>
        ))}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Security queue</Text>
        {securityTasks.map((task) => (
          <View key={task} style={styles.taskRow}>
            <View style={styles.taskBullet} />
            <Text style={styles.taskText}>{task}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030712",
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 24,
  },
  hero: {
    gap: 6,
  },
  eyebrow: {
    color: "rgba(248,250,252,0.6)",
    fontSize: 13,
    letterSpacing: 1,
  },
  heading: {
    color: "#f8fafc",
    fontSize: 30,
    fontWeight: "700",
  },
  subtitle: {
    color: "rgba(248,250,252,0.75)",
    fontSize: 15,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  metricCard: {
    flexBasis: "30%",
    flexGrow: 1,
    borderRadius: 20,
    backgroundColor: "rgba(15,23,42,0.85)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    padding: 18,
  },
  metricLabel: {
    color: "rgba(226,232,240,0.85)",
    fontSize: 13,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 6,
  },
  metricTrend: {
    color: "rgba(148,163,184,0.8)",
    marginTop: 4,
    fontSize: 12,
  },
  panel: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
    backgroundColor: "rgba(15,23,42,0.9)",
    padding: 22,
    gap: 12,
  },
  panelTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "600",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  taskBullet: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#38bdf8",
    opacity: 0.8,
  },
  taskText: {
    color: "rgba(226,232,240,0.92)",
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
