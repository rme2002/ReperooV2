import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import type { StatusTone } from "@/hooks/useInsightsBudget";

type BudgetSummaryCardProps = {
  // Budget data
  hasBudget: boolean;
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;

  // Metrics
  avgSpendRounded: number;
  dailyPaceRounded: number;
  daysLeft: number;
  weeklyTotal: number;

  // Progress
  progressPercent: number;
  progressLabel: string;

  // Status
  statusBadge: string;
  statusTone: StatusTone;

  // Display
  headlineAmount: string;
  headlineSubtitle: string;
  budgetHelperLabel: string | null;

  // State
  isLoading?: boolean;
  error?: string | null;

  // Actions
  onCreatePlan: () => void;

  // Formatting
  formatCurrency: (value: number) => string;

  // Responsive
  scale?: number;
};

export function BudgetSummaryCard({
  hasBudget,
  totalBudget,
  totalSpent,
  remainingBudget,
  avgSpendRounded,
  dailyPaceRounded,
  daysLeft,
  weeklyTotal,
  progressPercent,
  progressLabel,
  statusBadge,
  statusTone,
  headlineAmount,
  headlineSubtitle,
  budgetHelperLabel,
  isLoading,
  error,
  onCreatePlan,
  formatCurrency,
  scale = 1,
}: BudgetSummaryCardProps) {
  const cardPadding = 16 * scale;
  const cardGap = 12 * scale;
  const progressHeight = Math.max(8, 10 * scale);
  const fontFactor = scale;

  // Status badge styles based on tone
  const badgeTone =
    statusTone === "positive"
      ? styles.badgePositive
      : statusTone === "warning"
        ? styles.badgeWarn
        : statusTone === "danger"
          ? styles.badgeDanger
          : styles.badgeNeutral;

  const badgeTextTone =
    statusTone === "positive"
      ? styles.badgeTextPositive
      : statusTone === "warning"
        ? styles.badgeTextWarn
        : statusTone === "danger"
          ? styles.badgeTextDanger
          : styles.badgeTextNeutral;

  return (
    <View
      style={[
        styles.surface,
        styles.summaryCard,
        {
          paddingHorizontal: Math.max(20, cardPadding + 4),
          paddingVertical: Math.max(20, cardPadding + 2),
          gap: cardGap + 2,
        },
      ]}
    >
      <View style={styles.insightWidget}>
        <View style={styles.summaryTopRow}>
          <Text style={styles.summaryTitle}>Left this month</Text>
          <View style={styles.summaryHeaderActions}>
            <View style={[styles.badge, styles.summaryBadge, badgeTone]}>
              <Text style={[styles.badgeText, badgeTextTone]}>
                {statusBadge}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headlineBlock}>
          <Text style={[styles.remainingValue, { fontSize: 34 * fontFactor }]}>
            {headlineAmount}
          </Text>
          <View style={styles.headlineSubtitleBlock}>
            <Text
              style={[styles.headlineSubtitle, { fontSize: 28 * fontFactor }]}
            >
              {headlineSubtitle}
            </Text>
            {budgetHelperLabel ? (
              <Text
                style={[
                  styles.planHelper,
                  { fontSize: Math.max(13, 12 * fontFactor) },
                ]}
              >
                {budgetHelperLabel}
              </Text>
            ) : null}
          </View>
        </View>
        {hasBudget ? (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCol}>
                <Text style={styles.metricHelper}>Expected income</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(totalBudget)}
                </Text>
                <Text style={[styles.summaryMeta, styles.summaryMetaLabel]}>
                  From recurring income
                </Text>
              </View>
              <View style={styles.summaryCol}>
                <Text style={styles.metricHelper}>Total spent</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(totalSpent)}
                </Text>
              </View>
            </View>
            <View style={[styles.progressStack, { marginTop: 12 * scale }]}>
              <View style={[styles.progressTrack, { height: progressHeight }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPercent * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.summaryMeta}>{progressLabel}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCol}>
                <Text style={styles.metricHelper}>Avg spend / day</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(avgSpendRounded)} / day
                </Text>
              </View>
              <View style={styles.summaryCol}>
                <Text style={styles.metricHelper}>Daily pace</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(dailyPaceRounded)} / day
                </Text>
                <Text style={styles.summaryHint}>
                  {`${formatCurrency(remainingBudget)} left · ${daysLeft}d`}
                </Text>
              </View>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryFooter}>
              <View>
                <Text style={styles.metricHelper}>Last 7 days</Text>
              </View>
              <Text style={styles.summaryValue}>
                {formatCurrency(weeklyTotal)}
              </Text>
            </View>
          </>
        ) : isLoading ? (
          <View style={styles.summaryEmpty}>
            <Text style={styles.summaryEmptyTitle}>
              Loading budget plan...
            </Text>
          </View>
        ) : (
          <View style={styles.summaryEmpty}>
            <Text style={styles.summaryEmptyTitle}>Set up your budget</Text>
            <Text style={styles.summaryEmptyCopy}>
              Create a monthly plan with savings and investment goals to track
              your spending.
            </Text>
            <View style={styles.summaryEmptyActions}>
              <Pressable
                style={styles.summaryPrimaryButton}
                onPress={onCreatePlan}
              >
                <Text style={styles.summaryPrimaryText}>
                  Create monthly plan
                </Text>
              </Pressable>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    marginBottom: 6,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    paddingVertical: 22,
    paddingHorizontal: 24,
    gap: 18,
  },
  insightWidget: {
    gap: 12,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  summaryHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  summaryBadge: {
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  badgePositive: {
    backgroundColor: "rgba(31, 138, 91, 0.12)",
    borderColor: colors.success,
  },
  badgeTextPositive: {
    color: colors.success,
  },
  badgeWarn: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: colors.warning,
  },
  badgeTextWarn: {
    color: colors.warning,
  },
  badgeDanger: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: colors.error,
  },
  badgeTextDanger: {
    color: colors.error,
  },
  badgeNeutral: {
    backgroundColor: colors.borderLight,
    borderColor: colors.border,
  },
  badgeTextNeutral: {
    color: colors.textSecondary,
  },
  headlineBlock: {
    gap: 4,
  },
  remainingValue: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.text,
  },
  headlineSubtitleBlock: {
    gap: 2,
  },
  headlineSubtitle: {
    fontWeight: "700",
    color: colors.text,
    textTransform: "capitalize",
    marginTop: 2,
  },
  planHelper: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
  },
  summaryCol: {
    flex: 1,
    gap: 4,
  },
  metricHelper: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  summaryMeta: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  summaryMetaLabel: {
    fontWeight: "600",
    color: colors.textTertiary,
  },
  summaryHint: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  progressStack: {
    gap: 8,
  },
  progressTrack: {
    backgroundColor: colors.borderLight,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginTop: 14,
    marginBottom: 4,
  },
  summaryFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryEmpty: {
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderRadius: 16,
    padding: 16,
    gap: 8,
    marginTop: 8,
  },
  summaryEmptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.warning,
  },
  summaryEmptyCopy: {
    fontSize: 13,
    color: colors.warning,
  },
  summaryEmptyActions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 6,
  },
  summaryPrimaryButton: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  summaryPrimaryText: {
    fontWeight: "600",
    color: colors.textLight,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
});
