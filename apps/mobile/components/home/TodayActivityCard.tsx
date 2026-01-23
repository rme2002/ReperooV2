import { View, Text, StyleSheet } from "react-native";
import type { TodayTransactionSummary } from "@/lib/gen/model";
import { useCurrencyFormatter } from "@/components/profile/useCurrencyFormatter";
import { GlassCard } from "@/components/shared/GlassCard";

type TodayActivityCardProps = {
  todaySummary: TodayTransactionSummary | null;
  isLoading: boolean;
};

export function TodayActivityCard({
  todaySummary,
  isLoading,
}: TodayActivityCardProps) {
  const { formatCurrency } = useCurrencyFormatter();

  const itemsLogged =
    (todaySummary?.expense_count ?? 0) + (todaySummary?.income_count ?? 0);
  const totalAmount = todaySummary?.expense_total ?? 0;
  const hasLoggedToday = todaySummary?.has_logged_today ?? false;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.content}>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{itemsLogged}</Text>
            <Text style={styles.statLabel}>items logged</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {formatCurrency(totalAmount, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </Text>
            <Text style={styles.statLabel}>spent today</Text>
          </View>
        </View>

        {hasLoggedToday && (
          <View style={styles.loggedIndicator}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.loggedText}>You've logged today</Text>
          </View>
        )}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
  },
  content: {
    gap: 14,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280",
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: "#e5e7eb",
  },
  loggedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "rgba(34, 164, 93, 0.08)",
    borderRadius: 12,
  },
  checkmark: {
    fontSize: 14,
    color: "#22A45D",
    fontWeight: "700",
  },
  loggedText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#22A45D",
  },
});
