import { useMemo } from "react";
import type { ListTransactions200Item } from "@/lib/gen/model";
import { formatRelativeDate } from "@/utils/transactionsFormatters";
import { getUTCDateKey } from "@/utils/dateHelpers";

/**
 * Transaction section structure
 */
export interface TransactionSection {
  title: string;
  dateKey: string;
  total: number;
  categoryTotals: Record<string, number>;
  data: ListTransactions200Item[];
}

/**
 * Return type for useTransactionsSections hook
 */
export interface UseTransactionsSectionsReturn {
  sections: TransactionSection[];
  showEmptyMonth: boolean;
  showNoMatches: boolean;
}

/**
 * Custom hook for grouping transactions into sections by date
 * Creates sections with date headers, totals, and category breakdowns
 *
 * @param filteredTransactions - Filtered transactions to group
 * @param allTransactions - All transactions (for empty state detection)
 * @param activeReference - Reference date for relative date formatting
 * @param loading - Loading state
 * @returns Object containing sections and empty state flags
 */
export function useTransactionsSections(
  filteredTransactions: ListTransactions200Item[],
  allTransactions: ListTransactions200Item[],
  activeReference: Date,
  loading: boolean
): UseTransactionsSectionsReturn {
  const sections: TransactionSection[] = useMemo(() => {
    const map = new Map<string, TransactionSection>();
    filteredTransactions.forEach((tx) => {
      const txDate = new Date(tx.occurred_at);
      const key = getUTCDateKey(tx.occurred_at);
      if (!map.has(key)) {
        map.set(key, {
          title: formatRelativeDate(txDate, activeReference),
          dateKey: key,
          total: 0,
          categoryTotals: {},
          data: [],
        });
      }
      const section = map.get(key)!;
      section.data.push(tx);
      section.total += tx.amount;
      // Only track category totals for expenses
      if (tx.type === "expense") {
        section.categoryTotals[tx.expense_category_id] =
          (section.categoryTotals[tx.expense_category_id] ?? 0) + tx.amount;
      }
    });
    const list = Array.from(map.values());
    list.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    return list;
  }, [filteredTransactions, activeReference]);

  const entryCount = allTransactions.length;
  const showEmptyMonth = !loading && entryCount === 0;
  const showNoMatches =
    !loading && entryCount > 0 && filteredTransactions.length === 0;

  return {
    sections,
    showEmptyMonth,
    showNoMatches,
  };
}
