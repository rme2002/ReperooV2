import { useState, useCallback } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import { GoalSlider } from "@/components/insights/widgets/GoalSlider";
import { GoalDisplayBar } from "@/components/insights/widgets/GoalDisplayBar";
import { IncomeBreakdownSection } from "@/components/budget/IncomeBreakdownSection";
import { sanitizeGoalValue } from "@/utils/insightsMath";
import { SLIDER_MAX } from "@/utils/insightsConstants";
import type { TransactionIncome } from "@/lib/gen/model/transactionIncome";
import type { RecurringTemplateIncome } from "@/lib/gen/model/recurringTemplateIncome";

interface BudgetPlan {
  expected_income?: number;
  savings_goal?: number | null;
  investment_goal?: number | null;
  [key: string]: unknown;
}

type BudgetPlanPayload = {
  savings_goal: number | null;
  investment_goal: number | null;
};

type BudgetPlanWidgetProps = {
  budgetPlan: BudgetPlan | null;
  expectedIncome: number;
  savingsGoal: number;
  investmentsGoal: number;
  savingsActual: number;
  investmentsActual: number;
  incomeTransactions: TransactionIncome[];
  recurringTemplates: RecurringTemplateIncome[];
  loadingIncome: boolean;
  incomeError: string | null;
  formatCurrency: (value: number) => string;
  currencySymbol: string;
  onCreatePlan: (payload: BudgetPlanPayload) => Promise<void>;
  onUpdatePlan: (payload: BudgetPlanPayload) => Promise<void>;
  onRetryIncome: () => void;
  isLoading?: boolean;
  error?: string | null;
  scale?: number;
  width?: number;
};

export function BudgetPlanWidget({
  budgetPlan,
  expectedIncome,
  savingsGoal,
  investmentsGoal,
  savingsActual,
  investmentsActual,
  incomeTransactions,
  recurringTemplates,
  loadingIncome,
  incomeError,
  formatCurrency,
  currencySymbol,
  onCreatePlan,
  onUpdatePlan,
  onRetryIncome,
  isLoading,
  error,
  scale = 1,
  width = 375,
}: BudgetPlanWidgetProps) {
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editingSavingsGoal, setEditingSavingsGoal] = useState(0);
  const [editingInvestmentsGoal, setEditingInvestmentsGoal] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const compactPlanSummary = width < 380;

  const handleEditPlan = useCallback(() => {
    setEditingSavingsGoal(savingsGoal);
    setEditingInvestmentsGoal(investmentsGoal);
    setIsEditingPlan(true);
  }, [savingsGoal, investmentsGoal]);

  const handleCancelEdit = useCallback(() => {
    setIsEditingPlan(false);
    setEditingSavingsGoal(0);
    setEditingInvestmentsGoal(0);
  }, []);

  const handleSavePlanChanges = useCallback(async () => {
    setIsSaving(true);
    try {
      if (budgetPlan) {
        await onUpdatePlan({
          savings_goal: editingSavingsGoal || null,
          investment_goal: editingInvestmentsGoal || null,
        });
        setIsEditingPlan(false);
      } else {
        await onCreatePlan({
          savings_goal: editingSavingsGoal || null,
          investment_goal: editingInvestmentsGoal || null,
        });
        setIsEditingPlan(false);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to save budget plan");
    } finally {
      setIsSaving(false);
    }
  }, [
    budgetPlan,
    editingSavingsGoal,
    editingInvestmentsGoal,
    onUpdatePlan,
    onCreatePlan,
  ]);

  const handleCreateFromEmpty = useCallback(() => {
    setEditingSavingsGoal(0);
    setEditingInvestmentsGoal(0);
    setIsEditingPlan(true);
  }, []);

  const handleEditingSavingsGoalChange = useCallback((value: number) => {
    setEditingSavingsGoal(sanitizeGoalValue(value));
  }, []);

  const handleEditingInvestmentsGoalChange = useCallback((value: number) => {
    setEditingInvestmentsGoal(sanitizeGoalValue(value));
  }, []);

  const editingGoalsTotal = editingSavingsGoal + editingInvestmentsGoal;
  const editingExceedsIncome =
    expectedIncome > 0 && editingGoalsTotal > expectedIncome;

  const planSummaryGoals = savingsGoal + investmentsGoal;
  const planSummaryExceedsIncome =
    expectedIncome > 0 && planSummaryGoals > expectedIncome;
  const planSummarySpendable = Math.max(
    expectedIncome - planSummaryGoals,
    0
  );

  return (
    <View style={styles.surface}>
      <View style={styles.planWidget}>
        {/* Header */}
        <View style={styles.planWidgetHeader}>
          <View>
            <Text style={styles.planFormTitle}>Budget Plan</Text>
            <Text style={styles.planFormSubtitle}>
              {budgetPlan
                ? "Expected income + goal allocations"
                : "Set up your monthly budget"}
            </Text>
          </View>
        </View>

        {/* Case 1: No Budget Plan (Empty State) */}
        {!budgetPlan && !isEditingPlan && (
          <View style={styles.emptyPlanState}>
            <Text style={styles.emptyStateText}>
              Create a budget plan to track your savings and investment goals
            </Text>
            <Pressable
              style={styles.createPlanButton}
              onPress={handleCreateFromEmpty}
            >
              <Text style={styles.createPlanButtonText}>Create Plan</Text>
            </Pressable>
          </View>
        )}

        {/* Case 2: View Mode (Plan Exists, Not Editing) */}
        {budgetPlan && !isEditingPlan && (
          <>
            {/* Summary Card */}
            <View style={styles.planSummaryCard}>
              <View
                style={[styles.planSummaryRow, styles.planSummaryRowFirst]}
              >
                <View>
                  <Text style={styles.planSummaryLabel}>Expected income</Text>
                  <Text style={styles.planSummaryMeta}>
                    From recurring income
                  </Text>
                </View>
                <Text
                  style={[
                    styles.planSummaryValue,
                    compactPlanSummary && styles.planSummaryValueCompact,
                  ]}
                >
                  {formatCurrency(expectedIncome)}
                </Text>
              </View>
              <View style={styles.planSummaryDivider} />
              <View style={styles.planSummaryRow}>
                <View>
                  <Text style={styles.planSummaryLabel}>Goals</Text>
                  <Text style={styles.planSummaryMeta}>
                    Savings {formatCurrency(savingsGoal)} · Investments{" "}
                    {formatCurrency(investmentsGoal)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.planSummaryValue,
                    compactPlanSummary && styles.planSummaryValueCompact,
                  ]}
                >
                  {formatCurrency(savingsGoal + investmentsGoal)}
                </Text>
              </View>
              <View style={styles.planSummaryDivider} />
              <View style={styles.planSummaryRow}>
                <View>
                  <Text style={styles.planSummaryLabel}>Spendable</Text>
                  <Text style={styles.planSummaryMeta}>Income - Goals</Text>
                </View>
                <Text
                  style={[
                    styles.planSummaryValue,
                    styles.planSummaryValueAccent,
                    compactPlanSummary && styles.planSummaryValueCompact,
                  ]}
                >
                  {formatCurrency(planSummarySpendable)}
                </Text>
              </View>
            </View>

            {/* Income Breakdown Section */}
            <IncomeBreakdownSection
              transactions={incomeTransactions}
              recurringTemplates={recurringTemplates}
              loading={loadingIncome}
              error={incomeError}
              formatCurrency={formatCurrency}
              onRetry={onRetryIncome}
              scale={scale}
            />

            {/* Read-Only Goal Display */}
            <View style={styles.planSection}>
              <Text style={styles.planSectionTitle}>Goal allocations</Text>

              <GoalDisplayBar
                label="Savings goal"
                value={savingsGoal}
                max={expectedIncome}
                actual={savingsActual}
                showProgress={true}
                formatValue={(val) => formatCurrency(val)}
              />

              <GoalDisplayBar
                label="Investments goal"
                value={investmentsGoal}
                max={expectedIncome}
                actual={investmentsActual}
                showProgress={true}
                formatValue={(val) => formatCurrency(val)}
              />
            </View>
            {planSummaryExceedsIncome && (
              <View style={styles.planWarning}>
                <Text style={styles.planWarningTitle}>
                  Goals exceed expected income
                </Text>
                <Text style={styles.planWarningCopy}>
                  Your goals total {formatCurrency(planSummaryGoals)} which is
                  above expected income {formatCurrency(expectedIncome)}.
                </Text>
              </View>
            )}

            {/* Edit Button */}
            <Pressable style={styles.planEditButton} onPress={handleEditPlan}>
              <Text style={styles.planEditButtonText}>Edit</Text>
            </Pressable>
          </>
        )}

        {/* Case 3: Edit Mode (Creating or Editing) */}
        {isEditingPlan && (
          <>
            {/* Summary Card (if plan exists) */}
            {budgetPlan && (
              <View style={styles.planSummaryCard}>
                <View
                  style={[styles.planSummaryRow, styles.planSummaryRowFirst]}
                >
                  <View>
                    <Text style={styles.planSummaryLabel}>
                      Expected income
                    </Text>
                    <Text style={styles.planSummaryMeta}>
                      From recurring income
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.planSummaryValue,
                      compactPlanSummary && styles.planSummaryValueCompact,
                    ]}
                  >
                    {formatCurrency(expectedIncome)}
                  </Text>
                </View>
                <View style={styles.planSummaryDivider} />
                <View style={styles.planSummaryRow}>
                  <View>
                    <Text style={styles.planSummaryLabel}>Goals</Text>
                    <Text style={styles.planSummaryMeta}>
                      Savings {formatCurrency(editingSavingsGoal)} ·
                      Investments {formatCurrency(editingInvestmentsGoal)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.planSummaryValue,
                      compactPlanSummary && styles.planSummaryValueCompact,
                    ]}
                  >
                    {formatCurrency(
                      editingSavingsGoal + editingInvestmentsGoal
                    )}
                  </Text>
                </View>
                <View style={styles.planSummaryDivider} />
                <View style={styles.planSummaryRow}>
                  <View>
                    <Text style={styles.planSummaryLabel}>Spendable</Text>
                    <Text style={styles.planSummaryMeta}>Income - Goals</Text>
                  </View>
                  <Text
                    style={[
                      styles.planSummaryValue,
                      styles.planSummaryValueAccent,
                      compactPlanSummary && styles.planSummaryValueCompact,
                    ]}
                  >
                    {formatCurrency(
                      expectedIncome -
                        editingSavingsGoal -
                        editingInvestmentsGoal
                    )}
                  </Text>
                </View>
              </View>
            )}

            {/* Interactive Goal Sliders */}
            <View style={styles.planSection}>
              <Text style={styles.planSectionTitle}>Goal allocations</Text>

              <GoalSlider
                label="Savings goal"
                value={editingSavingsGoal}
                max={SLIDER_MAX}
                onChange={handleEditingSavingsGoalChange}
                currencySymbol={currencySymbol}
                formatValue={(val) => `${formatCurrency(val)} / month`}
              />

              <GoalSlider
                label="Investments goal"
                value={editingInvestmentsGoal}
                max={SLIDER_MAX}
                onChange={handleEditingInvestmentsGoalChange}
                currencySymbol={currencySymbol}
                formatValue={(val) => `${formatCurrency(val)} / month`}
              />
            </View>
            {editingExceedsIncome && (
              <View style={styles.planWarning}>
                <Text style={styles.planWarningTitle}>
                  Goals exceed expected income
                </Text>
                <Text style={styles.planWarningCopy}>
                  Your goals total {formatCurrency(editingGoalsTotal)} which is
                  above expected income {formatCurrency(expectedIncome)}.
                </Text>
              </View>
            )}

            {/* Save and Cancel Buttons */}
            <View style={styles.planEditActions}>
              <Pressable
                style={[styles.planActionButton, styles.planCancelButton]}
                onPress={handleCancelEdit}
                disabled={isSaving}
              >
                <Text style={styles.planCancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.planActionButton, styles.planSaveButton]}
                onPress={handleSavePlanChanges}
                disabled={isSaving}
              >
                <Text style={styles.planSaveButtonText}>
                  {isSaving ? "Saving..." : "Save changes"}
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
  planWidget: {
    gap: 16,
  },
  planWidgetHeader: {
    gap: 4,
  },
  planFormTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  planFormSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyPlanState: {
    padding: 24,
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.background,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  createPlanButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createPlanButtonText: {
    color: colors.textLight,
    fontSize: 15,
    fontWeight: "600",
  },
  planSummaryCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  planSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  planSummaryRowFirst: {
    paddingTop: 0,
  },
  planSummaryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  planSummaryMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  planSummaryValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  planSummaryValueCompact: {
    fontSize: 18,
  },
  planSummaryValueAccent: {
    color: colors.success,
  },
  planSummaryDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  planSection: {
    gap: 16,
  },
  planSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  planWarning: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  planWarningTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.warning,
  },
  planWarningCopy: {
    fontSize: 13,
    color: colors.warning,
    lineHeight: 18,
  },
  planEditButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  planEditButtonText: {
    color: colors.textLight,
    fontSize: 15,
    fontWeight: "600",
  },
  planEditActions: {
    flexDirection: "row",
    gap: 12,
  },
  planActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  planCancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planCancelButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  planSaveButton: {
    backgroundColor: colors.primary,
  },
  planSaveButtonText: {
    color: colors.textLight,
    fontSize: 15,
    fontWeight: "600",
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
});
