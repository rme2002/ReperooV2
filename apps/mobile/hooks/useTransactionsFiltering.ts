import { useState, useMemo, useCallback } from "react";
import type { ListTransactions200Item } from "@/lib/gen/model";

/**
 * Return type for useTransactionsFiltering hook
 */
export interface UseTransactionsFilteringReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeCategory: string | null;
  setActiveCategory: (categoryId: string | null) => void;
  showRecurringOnly: boolean;
  setShowRecurringOnly: (show: boolean) => void;
  filteredTransactions: ListTransactions200Item[];
  clearFilters: () => void;
}

/**
 * Custom hook for filtering transactions
 * Handles search, category filter, and recurring filter
 *
 * @param transactions - All transactions for the month
 * @param getCategoryLabel - Function to get category label by ID
 * @param getSubcategoryLabel - Function to get subcategory label
 * @param getIncomeCategoryLabel - Function to get income category label
 * @returns Object containing filter states and filtered transactions
 */
export function useTransactionsFiltering(
  transactions: ListTransactions200Item[],
  getCategoryLabel: (id: string) => string,
  getSubcategoryLabel: (catId: string, subId?: string) => string | null,
  getIncomeCategoryLabel: (id: string) => string
): UseTransactionsFilteringReturn {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showRecurringOnly, setShowRecurringOnly] = useState(false);

  const filteredTransactions = useMemo(() => {
    const base = transactions.slice();
    const query = searchQuery.trim().toLowerCase();
    const filtered = base.filter((tx) => {
      // Apply recurring filter first
      if (showRecurringOnly && !tx.recurring_template_id) {
        return false;
      }

      // For expense transactions, filter by category
      if (tx.type === "expense") {
        if (activeCategory && tx.expense_category_id !== activeCategory) {
          return false;
        }
        if (!query) {
          return true;
        }
        const searchTarget = `${getCategoryLabel(tx.expense_category_id).toLowerCase()} ${(getSubcategoryLabel(tx.expense_category_id, tx.expense_subcategory_id ?? undefined) ?? "").toLowerCase()} ${(tx.notes ?? "").toLowerCase()}`;
        return searchTarget.includes(query);
      }
      // For income transactions, skip category filter and just search notes
      if (tx.type === "income") {
        if (activeCategory) {
          return false; // Income doesn't match expense categories
        }
        if (!query) {
          return true;
        }
        const searchTarget = `income ${getIncomeCategoryLabel(tx.income_category_id).toLowerCase()} ${(tx.notes ?? "").toLowerCase()}`;
        return searchTarget.includes(query);
      }
      return true;
    });
    filtered.sort(
      (a, b) =>
        new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
    );
    return filtered;
  }, [
    transactions,
    activeCategory,
    searchQuery,
    showRecurringOnly,
    getCategoryLabel,
    getSubcategoryLabel,
    getIncomeCategoryLabel,
  ]);

  const clearFilters = useCallback(() => {
    setActiveCategory(null);
    setSearchQuery("");
    setShowRecurringOnly(false);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    showRecurringOnly,
    setShowRecurringOnly,
    filteredTransactions,
    clearFilters,
  };
}
