import { useMemo } from "react";
import type { BudgetPlan, MonthSnapshot } from "@/lib/gen/model";

/**
 * Return type for useHomeBudget hook
 */
export interface UseHomeBudgetReturn {
  hasBudget: boolean;
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  itemsLoggedThisMonth: number;
  spendThisMonth: number;
}

/**
 * Custom hook for computing home budget metrics
 * Calculates budget totals and transaction counts
 *
 * @param snapshot - Current insights snapshot
 * @param budgetPlan - Budget plan with expected income
 * @returns Object containing budget metrics
 */
export function useHomeBudget(
  snapshot: MonthSnapshot | null,
  budgetPlan: BudgetPlan | null
): UseHomeBudgetReturn {
  const hasBudget = Boolean(budgetPlan);
  const totalBudget = budgetPlan?.expected_income ?? 0;
  const totalSpent = snapshot?.totalSpent ?? 0;
  const remainingBudget = totalBudget - totalSpent;

  // Sum up items from all categories to get total transaction count
  const itemsLoggedThisMonth = useMemo(() => {
    if (!snapshot?.categories) return 0;
    return snapshot.categories.reduce<number>(
      (sum, cat) => sum + (cat.items ?? 0),
      0,
    );
  }, [snapshot?.categories]);

  const spendThisMonth = totalSpent;

  return {
    hasBudget,
    totalBudget,
    totalSpent,
    remainingBudget,
    itemsLoggedThisMonth,
    spendThisMonth,
  };
}
