import { useMemo } from "react";
import type { TransactionEntry } from "@/components/dummy_data/transactions";
import { formatRelativeDate } from "@/utils/transactionsFormatters";

/**
 * Transaction section structure
 */
export interface TransactionSection {
  title: string;
  dateKey: string;
  total: number;
  categoryTotals: Record<string, number>;
  data: TransactionEntry[];
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
  filteredTransactions: TransactionEntry[],
  allTransactions: TransactionEntry[],
  activeReference: Date,
  loading: boolean
): UseTransactionsSectionsReturn {
  const sections: TransactionSection[] = useMemo(() => {
    const map = new Map<string, TransactionSection>();
    filteredTransactions.forEach((tx) => {
      const txDate = new Date(tx.timestamp);
      txDate.setHours(0, 0, 0, 0);
      const key = txDate.toISOString();
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
      if (tx.kind === "expense") {
        section.categoryTotals[tx.categoryId] =
          (section.categoryTotals[tx.categoryId] ?? 0) + tx.amount;
      }
    });
    const list = Array.from(map.values());
    list.sort(
      (a, b) =>
        new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime()
    );
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
