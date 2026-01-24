import { useState, useCallback, useEffect } from "react";
import { listTransactions } from "@/lib/gen/transactions/transactions";
import { listRecurringTemplates } from "@/lib/gen/recurring-templates/recurring-templates";
import type { TransactionIncome } from "@/lib/gen/model/transactionIncome";
import type { RecurringTemplateIncome } from "@/lib/gen/model/recurringTemplateIncome";

/**
 * Return type for useInsightsIncome hook
 */
export interface UseInsightsIncomeReturn {
  incomeTransactions: TransactionIncome[];
  recurringTemplates: RecurringTemplateIncome[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching and managing income data for a specific month
 * Fetches both one-time income transactions and recurring income templates
 *
 * @param selectedMonth - Object with year and month representing the month to fetch income for
 * @returns Object containing income data, loading state, error state, and refetch function
 */
export function useInsightsIncome(
  selectedMonth: { year: number; month: number }
): UseInsightsIncomeReturn {
  const [incomeTransactions, setIncomeTransactions] = useState<TransactionIncome[]>([]);
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringTemplateIncome[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIncome = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const year = selectedMonth.year;
      const month = selectedMonth.month - 1; // Convert from 1-based to 0-based month
      const start_date = new Date(year, month, 1).toISOString();
      const end_date = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      const [transactionsRes, templatesRes] = await Promise.all([
        listTransactions({ start_date, end_date }),
        listRecurringTemplates(),
      ]);

      if (transactionsRes.status === 200 && templatesRes.status === 200) {
        const incomeOnly = transactionsRes.data.filter(
          (tx) => tx.type === "income"
        ) as TransactionIncome[];
        const incomeTemplates = templatesRes.data.filter(
          (template) => template.type === "income"
        ) as RecurringTemplateIncome[];

        setIncomeTransactions(incomeOnly);
        setRecurringTemplates(incomeTemplates);
      } else {
        throw new Error("Failed to fetch data");
      }
    } catch (err) {
      console.error("Failed to load income data:", err);
      setError("Failed to load income data");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth.year, selectedMonth.month]);

  useEffect(() => {
    fetchIncome();
  }, [fetchIncome]);

  return {
    incomeTransactions,
    recurringTemplates,
    loading,
    error,
    refetch: fetchIncome,
  };
}
