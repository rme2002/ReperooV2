import { useCallback } from "react";
import { useExperience } from "@/components/home/ExperienceProvider";
import { useInsightsContext } from "@/components/insights/InsightsProvider";
import { useTransactionSummary } from "@/components/transactions/TransactionSummaryProvider";

type TransactionRefreshOptions = {
  date?: Date | string | null;
};

const getYearMonth = (value?: Date | string | null) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return { year: parsed.getFullYear(), month: parsed.getMonth() + 1 };
};

export function useTransactionRefresh() {
  const { refetch: refetchSummary } = useTransactionSummary();
  const { refreshExperience } = useExperience();
  const {
    currentSnapshot,
    fetchSnapshot,
    refetchAvailableMonths,
    invalidateSnapshot,
  } = useInsightsContext();

  const refreshTransactionData = useCallback(
    async (options: TransactionRefreshOptions = {}) => {
      const fallbackDate = options.date ?? currentSnapshot?.currentDate ?? null;
      const target = getYearMonth(fallbackDate);
      const tasks: Promise<unknown>[] = [
        refetchSummary(),
        refreshExperience(),
        refetchAvailableMonths(),
      ];

      if (target) {
        invalidateSnapshot(target.year, target.month);
        tasks.push(fetchSnapshot(target.year, target.month));
      }

      await Promise.allSettled(tasks);
    },
    [
      currentSnapshot?.currentDate,
      fetchSnapshot,
      invalidateSnapshot,
      refreshExperience,
      refetchAvailableMonths,
      refetchSummary,
    ]
  );

  return refreshTransactionData;
}
