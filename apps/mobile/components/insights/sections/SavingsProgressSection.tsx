import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import { GlassCard } from "@/components/shared/GlassCard";

type SavingsProgressSectionProps = {
  // Goals
  savingsGoal: number;
  investmentsGoal: number;

  // Actuals
  savingsActual: number;
  investmentsActual: number;
  savingsTotal: number;

  // Percentages
  savingsGoalPercent: number;
  investmentsGoalPercent: number;
  savingsGoalPercentLabel: number;
  investmentsGoalPercentLabel: number;

  // Mix
  hasSavingsSplit: boolean;
  savedShareWidth: number;
  investedShareWidth: number;

  // State
  hasBudget: boolean;
  shouldShowProgress: boolean;
  shouldShowZeroGoalsState: boolean;

  // Formatting
  formatCurrency: (value: number) => string;
  currencySymbol: string;

  // Actions
  onEditGoals?: () => void;
  onCreatePlan: () => void;
};

export function SavingsProgressSection({
  savingsGoal,
  investmentsGoal,
  savingsActual,
  investmentsActual,
  savingsTotal,
  savingsGoalPercent,
  investmentsGoalPercent,
  savingsGoalPercentLabel,
  investmentsGoalPercentLabel,
  hasSavingsSplit,
  savedShareWidth,
  investedShareWidth,
  hasBudget,
  shouldShowProgress,
  shouldShowZeroGoalsState,
  formatCurrency,
  currencySymbol,
  onEditGoals,
  onCreatePlan,
}: SavingsProgressSectionProps) {
  return (
    <GlassCard>
      <View style={styles.sectionHeaderStacked}>
        <Text style={styles.sectionTitle}>Savings & investments</Text>
        <Text style={styles.subText}>
          Money moved toward your future this month
        </Text>
      </View>
      {shouldShowProgress ? (
        <>
          <View style={styles.savingsProgressGroup}>
            <View style={styles.progressRow}>
              <View style={styles.progressLabelBlock}>
                <View style={styles.savingsLegendRow}>
                  <View
                    style={[styles.savingsLegendDot, styles.savingsLegendSaved]}
                  />
                  <Text style={styles.progressLabel}>Savings goal</Text>
                </View>
                <Text style={styles.progressSub}>
                  {formatCurrency(savingsActual)} of{" "}
                  {formatCurrency(savingsGoal)}
                </Text>
              </View>
              <Text style={styles.progressValue}>
                {savingsGoal > 0 ? `${savingsGoalPercentLabel}%` : "0%"}
              </Text>
            </View>
            <View
              style={[
                styles.progressTrack,
                styles.progressMuted,
                styles.savingsTrack,
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  styles.savingsFillPrimary,
                  { width: `${savingsGoalPercent}%` },
                ]}
              />
            </View>
          </View>
          <View style={styles.savingsProgressGroup}>
            <View style={styles.progressRow}>
              <View style={styles.progressLabelBlock}>
                <View style={styles.savingsLegendRow}>
                  <View
                    style={[
                      styles.savingsLegendDot,
                      styles.savingsLegendInvested,
                    ]}
                  />
                  <Text style={styles.progressLabel}>Investments goal</Text>
                </View>
                <Text style={styles.progressSub}>
                  {formatCurrency(investmentsActual)} of{" "}
                  {formatCurrency(investmentsGoal)}
                </Text>
              </View>
              <Text style={styles.progressValue}>
                {investmentsGoal > 0 ? `${investmentsGoalPercentLabel}%` : "0%"}
              </Text>
            </View>
            <View
              style={[
                styles.progressTrack,
                styles.progressMuted,
                styles.savingsTrack,
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  styles.progressInvested,
                  { width: `${investmentsGoalPercent}%` },
                ]}
              />
            </View>
          </View>
          <View style={styles.savingsProgressGroup}>
            <View style={styles.progressRow}>
              <View style={styles.progressLabelBlock}>
                <Text style={styles.progressLabel}>Savings mix</Text>
                <Text style={styles.progressSub}>
                  Share of this month&apos;s contributions
                </Text>
              </View>
              <Text style={styles.progressValue}>
                {hasSavingsSplit
                  ? `${Math.round(savedShareWidth)}% / ${Math.round(investedShareWidth)}%`
                  : "0% / 0%"}
              </Text>
            </View>
            <View
              style={[
                styles.progressTrack,
                styles.progressMuted,
                styles.savingsTrack,
                styles.savingsCombinedTrack,
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  styles.savingsFillPrimary,
                  { width: `${savedShareWidth}%` },
                ]}
              />
              <View
                style={[
                  styles.progressFill,
                  styles.progressInvested,
                  { width: `${investedShareWidth}%` },
                ]}
              />
            </View>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.savingsSummaryRow}>
            <Text style={styles.progressLabel}>Total toward goals</Text>
            <Text style={styles.savingsAmount}>
              {formatCurrency(savingsTotal)}
            </Text>
          </View>
        </>
      ) : shouldShowZeroGoalsState ? (
        <View style={styles.savingsEmptyState}>
          <Text style={styles.savingsEmptyTitle}>
            Goals set to {currencySymbol}0
          </Text>
          <Text style={styles.savingsEmptyCopy}>
            You set both savings and investment goals to zero. Update your
            budget plan above if you want to track contributions.
          </Text>
          <Pressable style={styles.savingsCtaButton} onPress={onEditGoals}>
            <Text style={styles.savingsCtaButtonText}>Edit goals above</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.savingsEmptyState}>
          <Text style={styles.savingsEmptyTitle}>
            {hasBudget
              ? "Add savings & investment goals"
              : "Create a budget plan"}
          </Text>
          <Text style={styles.savingsEmptyCopy}>
            {hasBudget
              ? "Set targets for savings and investments to unlock this widget."
              : "Create a budget plan with goal allocations to view your progress here."}
          </Text>
          <Pressable
            style={styles.savingsCtaButton}
            onPress={hasBudget ? onEditGoals : onCreatePlan}
          >
            <Text style={styles.savingsCtaButtonText}>
              {hasBudget ? "Edit goals above" : "Create budget plan"}
            </Text>
          </Pressable>
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  sectionHeaderStacked: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  subText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  savingsProgressGroup: {
    gap: 8,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  progressLabelBlock: {
    flex: 1,
    gap: 4,
  },
  savingsLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  savingsLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  savingsLegendSaved: {
    backgroundColor: colors.success,
  },
  savingsLegendInvested: {
    backgroundColor: colors.info,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  progressSub: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  progressValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  progressTrack: {
    height: 10,
    backgroundColor: colors.borderLight,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressMuted: {
    backgroundColor: colors.borderLight,
  },
  savingsTrack: {
    height: 10,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  savingsFillPrimary: {
    backgroundColor: colors.success,
  },
  progressInvested: {
    backgroundColor: colors.info,
  },
  savingsCombinedTrack: {
    flexDirection: "row",
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 8,
  },
  savingsSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  savingsAmount: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.success,
  },
  savingsEmptyState: {
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  savingsEmptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  savingsEmptyCopy: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  savingsCtaButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  savingsCtaButtonText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: "600",
  },
});
