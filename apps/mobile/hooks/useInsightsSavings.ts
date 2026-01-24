/**
 * Budget plan with savings and investment goals
 */
interface BudgetPlan {
  savings_goal?: number | null;
  investment_goal?: number | null;
  [key: string]: unknown;
}

/**
 * Insights snapshot with savings data
 */
interface InsightsSnapshot {
  savings?: {
    saved?: number;
    invested?: number;
  };
  [key: string]: unknown;
}

/**
 * Return type for useInsightsSavings hook
 */
export interface UseInsightsSavingsReturn {
  // Actual amounts
  savingsActual: number;
  investmentsActual: number;
  savingsTotal: number;

  // Goal amounts
  savingsGoal: number;
  investmentsGoal: number;

  // Goal percentages (clamped to 0-100%)
  savingsGoalPercent: number;
  investmentsGoalPercent: number;

  // Goal percentage labels (can exceed 100%)
  savingsGoalPercentLabel: number;
  investmentsGoalPercentLabel: number;

  // Mix breakdown
  hasSavingsSplit: boolean;
  savedShareWidth: number;
  investedShareWidth: number;

  // Display flags
  shouldShowProgress: boolean;
  shouldShowZeroGoalsState: boolean;
  hasGoals: boolean;
  hasZeroGoals: boolean;
}

/**
 * Custom hook for computing savings and investment metrics
 * Calculates goal progress, percentages, and mix breakdowns
 *
 * @param snapshot - Current insights snapshot with savings data
 * @param budgetPlan - Budget plan with savings and investment goals
 * @param hasBudget - Whether a budget plan exists
 * @returns Object containing all savings-related metrics and display flags
 */
export function useInsightsSavings(
  snapshot: InsightsSnapshot | null,
  budgetPlan: BudgetPlan | null,
  hasBudget: boolean
): UseInsightsSavingsReturn {
  // Actual amounts from snapshot
  const savingsActual = snapshot?.savings?.saved ?? 0;
  const investmentsActual = snapshot?.savings?.invested ?? 0;
  const savingsTotal = savingsActual + investmentsActual;

  // Goal amounts from budget plan
  const savingsGoal = budgetPlan?.savings_goal ?? 0;
  const investmentsGoal = budgetPlan?.investment_goal ?? 0;

  // Goal progress percentages (raw, can exceed 100%)
  const savingsGoalPercentRaw =
    savingsGoal > 0 ? (savingsActual / savingsGoal) * 100 : 0;
  const investmentsGoalPercentRaw =
    investmentsGoal > 0 ? (investmentsActual / investmentsGoal) * 100 : 0;

  // Goal progress percentages (clamped to 0-100% for display bars)
  const savingsGoalPercent = Math.min(Math.max(savingsGoalPercentRaw, 0), 100);
  const investmentsGoalPercent = Math.min(
    Math.max(investmentsGoalPercentRaw, 0),
    100
  );

  // Goal percentage labels (rounded, can exceed 100%)
  const savingsGoalPercentLabel =
    savingsGoal > 0 ? Math.max(0, Math.round(savingsGoalPercentRaw)) : 0;
  const investmentsGoalPercentLabel =
    investmentsGoal > 0 ? Math.max(0, Math.round(investmentsGoalPercentRaw)) : 0;

  // Mix breakdown (share of total savings)
  const hasSavingsSplit = savingsTotal > 0;
  const savedShareWidth = hasSavingsSplit
    ? (savingsActual / savingsTotal) * 100
    : 0;
  const investedShareWidth = hasSavingsSplit
    ? (investmentsActual / savingsTotal) * 100
    : 0;

  // Display flags
  const hasGoals = savingsGoal > 0 || investmentsGoal > 0;
  const hasZeroGoals = hasBudget && savingsGoal === 0 && investmentsGoal === 0;
  const shouldShowProgress = hasGoals;
  const shouldShowZeroGoalsState = !hasGoals && hasZeroGoals;

  return {
    // Actuals
    savingsActual,
    investmentsActual,
    savingsTotal,

    // Goals
    savingsGoal,
    investmentsGoal,

    // Percentages
    savingsGoalPercent,
    investmentsGoalPercent,
    savingsGoalPercentLabel,
    investmentsGoalPercentLabel,

    // Mix
    hasSavingsSplit,
    savedShareWidth,
    investedShareWidth,

    // Flags
    shouldShowProgress,
    shouldShowZeroGoalsState,
    hasGoals,
    hasZeroGoals,
  };
}
