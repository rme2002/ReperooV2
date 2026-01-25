import { useState, useMemo, useCallback } from "react";
import { generateMonthsArray } from "@/utils/transactionsFormatters";

/**
 * Month object structure
 */
export interface LedgerMonth {
  key: string;
  label: string;
  currentDate: string;
  transactions: never[];
}

/**
 * Return type for useTransactionsMonthNavigation hook
 */
export interface UseTransactionsMonthNavigationReturn {
  months: LedgerMonth[];
  monthIndex: number;
  activeMonth: LedgerMonth;
  activeReference: Date;
  activeMonthKey: string;
  goPrevious: () => void;
  goNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

/**
 * Custom hook for managing month navigation in transactions screen
 * Handles month generation, selection, and navigation
 *
 * @returns Object containing month data and navigation functions
 */
export function useTransactionsMonthNavigation(): UseTransactionsMonthNavigationReturn {
  // Generate months dynamically for month navigation
  const months = useMemo(() => generateMonthsArray(), []);

  // Calculate the index of the current month
  // The array has 6 future months, then current month, then past months
  const FUTURE_MONTHS = 6;
  const [monthIndex, setMonthIndex] = useState(FUTURE_MONTHS);

  const activeMonth = months[monthIndex];
  // Always use today's date as reference for "Today" labels, not the month's reference date
  const activeReference = new Date();
  const activeMonthKey = activeMonth?.key ?? months[0].key;

  const goPrevious = useCallback(() => {
    setMonthIndex((prev) => Math.min(prev + 1, months.length - 1));
  }, [months.length]);

  const goNext = useCallback(() => {
    setMonthIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const canGoPrevious = monthIndex < months.length - 1;
  const canGoNext = monthIndex > 0;

  return {
    months,
    monthIndex,
    activeMonth,
    activeReference,
    activeMonthKey,
    goPrevious,
    goNext,
    canGoPrevious,
    canGoNext,
  };
}
