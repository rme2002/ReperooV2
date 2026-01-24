import { useState, useMemo, useCallback } from "react";
import type { TransactionEntry } from "@/components/dummy_data/transactions";
import type { ExpenseCategory } from "@/lib/gen/model";

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
  filteredTransactions: TransactionEntry[];
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
  transactions: TransactionEntry[],
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
      if (showRecurringOnly && !tx.isRecurringInstance) {
        return false;
      }

      // For expense transactions, filter by category
      if (tx.kind === "expense") {
        if (activeCategory && tx.categoryId !== activeCategory) {
          return false;
        }
        if (!query) {
          return true;
        }
        const searchTarget = `${getCategoryLabel(tx.categoryId).toLowerCase()} ${(getSubcategoryLabel(tx.categoryId, tx.subcategoryId) ?? "").toLowerCase()} ${(tx.note ?? "").toLowerCase()}`;
        return searchTarget.includes(query);
      }
      // For income transactions, skip category filter and just search notes
      if (tx.kind === "income") {
        if (activeCategory) {
          return false; // Income doesn't match expense categories
        }
        if (!query) {
          return true;
        }
        const searchTarget = `income ${getIncomeCategoryLabel(tx.incomeCategoryId).toLowerCase()} ${(tx.note ?? "").toLowerCase()}`;
        return searchTarget.includes(query);
      }
      return true;
    });
    filtered.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
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
