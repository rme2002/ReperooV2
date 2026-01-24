import { useState, useCallback } from "react";

/**
 * Return type for useInsightsMonthNavigation hook
 */
export interface UseInsightsMonthNavigationReturn {
  selectedMonth: { year: number; month: number };
  goPrevious: () => void;
  goNext: () => void;
  setMonth: (year: number, month: number) => void;
}

/**
 * Custom hook for managing month navigation in insights screen
 * Handles current month selection and navigation between months
 *
 * @returns Object containing selected month and navigation functions
 */
export function useInsightsMonthNavigation(): UseInsightsMonthNavigationReturn {
  const getCurrentMonth = useCallback(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const goPrevious = useCallback(() => {
    setSelectedMonth((current) => {
      if (current.month === 1) {
        return { year: current.year - 1, month: 12 };
      }
      return { year: current.year, month: current.month - 1 };
    });
  }, []);

  const goNext = useCallback(() => {
    setSelectedMonth((current) => {
      if (current.month === 12) {
        return { year: current.year + 1, month: 1 };
      }
      return { year: current.year, month: current.month + 1 };
    });
  }, []);

  const setMonth = useCallback((year: number, month: number) => {
    setSelectedMonth({ year, month });
  }, []);

  return {
    selectedMonth,
    goPrevious,
    goNext,
    setMonth,
  };
}
