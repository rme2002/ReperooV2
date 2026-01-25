import { useMemo } from "react";
import { DAY_IN_MS } from "@/utils/insightsConstants";

/**
 * Budget plan with expected income
 */
interface BudgetPlan {
  expected_income?: number;
  [key: string]: unknown;
}

/**
 * Insights snapshot with spending data
 */
interface InsightsSnapshot {
  currentDate?: string;
  totalSpent?: number;
  loggedDays?: number;
  totalDays?: number;
  [key: string]: unknown;
}

/**
 * Status badge labels
 */
export type StatusBadge = "On track" | "Attention" | "Risk" | "Set budget";

/**
 * Status tone for styling
 */
export type StatusTone = "positive" | "warning" | "danger" | "neutral";

/**
 * Return type for useInsightsBudget hook
 */
export interface UseInsightsBudgetReturn {
  // Basic values
  hasBudget: boolean;
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;

  // Time metrics
  daysLeft: number;
  loggedDays: number;
  totalDays: number;
  monthCurrentDate: Date;

  // Spending metrics
  avgSpendPerDay: number;
  avgSpendRounded: number;
  dailyPace: number;
  dailyPaceRounded: number;

  // Status
  statusBadge: StatusBadge;
  statusTone: StatusTone;

  // Progress
  progressPercent: number;
  progressLabel: string;

  // Display strings
  headlineAmount: string;
  headlineSubtitle: string;
  budgetHelperLabel: string | null;
}

/**
 * Custom hook for computing budget status, metrics, and progress
 * Calculates remaining budget, daily pace, status badges, and all budget-related metrics
 *
 * @param snapshot - Current insights snapshot with spending data
 * @param budgetPlan - Budget plan with expected income
 * @param formatCurrency - Function to format currency values
 * @returns Object containing all budget-related metrics and display values
 */
export function useInsightsBudget(
  snapshot: InsightsSnapshot | null,
  budgetPlan: BudgetPlan | null,
  formatCurrency: (value: number) => string
): UseInsightsBudgetReturn {
  // Compute current month date
  const monthCurrentDate = useMemo(() => {
    if (!snapshot?.currentDate) {
      const fallback = new Date();
      fallback.setHours(0, 0, 0, 0);
      return fallback;
    }
    const date = new Date(snapshot.currentDate);
    if (Number.isNaN(date.getTime())) {
      const fallback = new Date();
      fallback.setHours(0, 0, 0, 0);
      return fallback;
    }
    date.setHours(0, 0, 0, 0);
    return date;
  }, [snapshot?.currentDate]);

  // Basic values
  const hasBudget = Boolean(budgetPlan);
  const totalBudget = budgetPlan?.expected_income ?? 0;
  const totalSpent = snapshot?.totalSpent ?? 0;
  const remainingBudget = totalBudget - totalSpent;
  const loggedDays = snapshot?.loggedDays ?? 0;
  const totalDays = snapshot?.totalDays ?? 0;

  // Compute days left in month
  const daysLeftInMonth = useMemo(() => {
    const endOfMonth = new Date(monthCurrentDate);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
    endOfMonth.setHours(0, 0, 0, 0);
    const diff = endOfMonth.getTime() - monthCurrentDate.getTime();
    if (diff < 0) {
      return 0;
    }
    return Math.floor(diff / DAY_IN_MS) + 1;
  }, [monthCurrentDate]);

  const daysLeft = Math.max(daysLeftInMonth, 0);

  // Spending metrics
  const avgSpendPerDay = loggedDays ? totalSpent / loggedDays : totalSpent;
  const avgSpendRounded = Math.round(avgSpendPerDay);
  const dailyPace = daysLeft > 0 ? remainingBudget / daysLeft : 0;
  const dailyPaceRounded = daysLeft > 0 ? Math.round(dailyPace) : 0;

  // Status calculation
  let statusBadge: StatusBadge = "Set budget";
  let statusTone: StatusTone = "neutral";

  if (hasBudget) {
    if (remainingBudget < 0) {
      statusBadge = "Risk";
      statusTone = "danger";
    } else if (avgSpendPerDay > dailyPace) {
      statusBadge = "Attention";
      statusTone = "warning";
    } else {
      statusBadge = "On track";
      statusTone = "positive";
    }
  }

  // Progress
  const progressPercent =
    hasBudget && totalBudget > 0
      ? Math.min(Math.max(totalSpent / totalBudget, 0), 1)
      : 0;
  const progressLabel = `${Math.round(progressPercent * 100)}% of budget used`;

  // Display strings
  const headlineAmount = hasBudget
    ? formatCurrency(remainingBudget)
    : "Budget not set";
  const headlineSubtitle = hasBudget
    ? "projected left"
    : "Create a budget plan";
  const budgetHelperLabel = hasBudget ? "Based on income transactions" : null;

  return {
    hasBudget,
    totalBudget,
    totalSpent,
    remainingBudget,
    daysLeft,
    loggedDays,
    totalDays,
    monthCurrentDate,
    avgSpendPerDay,
    avgSpendRounded,
    dailyPace,
    dailyPaceRounded,
    statusBadge,
    statusTone,
    progressPercent,
    progressLabel,
    headlineAmount,
    headlineSubtitle,
    budgetHelperLabel,
  };
}
