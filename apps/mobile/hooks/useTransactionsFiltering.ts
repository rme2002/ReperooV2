import { useState, useMemo, useCallback } from "react";
import type { ListTransactions200Item } from "@/lib/gen/model";

/**
 * Return type for useTransactionsFiltering hook
 */
export interface UseTransactionsFilteringReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeCategories: string[];
  setActiveCategories: (categoryIds: string[]) => void;
  toggleCategory: (categoryId: string) => void;
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
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [showRecurringOnly, setShowRecurringOnly] = useState(false);

  const toggleCategory = useCallback((categoryId: string) => {
    setActiveCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  }, []);

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
        if (activeCategories.length > 0 && !activeCategories.includes(tx.expense_category_id)) {
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
        if (activeCategories.length > 0) {
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
    activeCategories,
    searchQuery,
    showRecurringOnly,
    getCategoryLabel,
    getSubcategoryLabel,
    getIncomeCategoryLabel,
  ]);

  const clearFilters = useCallback(() => {
    setActiveCategories([]);
    setSearchQuery("");
    setShowRecurringOnly(false);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    activeCategories,
    setActiveCategories,
    toggleCategory,
    showRecurringOnly,
    setShowRecurringOnly,
    filteredTransactions,
    clearFilters,
  };
}
