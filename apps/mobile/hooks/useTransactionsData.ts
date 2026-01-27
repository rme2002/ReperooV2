import { useEffect, useState, useCallback } from "react";
import type {
  ListTransactions200Item,
  ListRecurringTemplates200Item,
  ExpenseCategory,
  IncomeCategory,
} from "@/lib/gen/model";
import { listTransactions } from "@/lib/gen/transactions/transactions";
import { listRecurringTemplates } from "@/lib/gen/recurring-templates/recurring-templates";
import { listExpenseCategories } from "@/lib/gen/expense-categories/expense-categories";
import { listIncomeCategories } from "@/lib/gen/income-categories/income-categories";

/**
 * Return type for useTransactionsData hook
 */
export interface UseTransactionsDataReturn {
  apiTransactions: ListTransactions200Item[];
  recurringTemplates: ListRecurringTemplates200Item[];
  expenseCategories: ExpenseCategory[];
  incomeCategories: IncomeCategory[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching and managing transaction data
 * Handles API calls for transactions, categories, and recurring templates
 *
 * @param monthCurrentDate - Current date for the selected month
 * @param userId - User ID from session
 * @returns Object containing transaction data, categories, and loading states
 */
export function useTransactionsData(
  monthCurrentDate: string,
  userId: string | undefined
): UseTransactionsDataReturn {
  const [apiTransactions, setApiTransactions] = useState<
    ListTransactions200Item[]
  >(
    []
  );
  const [recurringTemplates, setRecurringTemplates] = useState<
    ListRecurringTemplates200Item[]
  >([]);
  const [expenseCategories, setExpenseCategories] = useState<
    ExpenseCategory[]
  >([]);
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch expense categories
  const fetchExpenseCategories = useCallback(async () => {
    try {
      const response = await listExpenseCategories();
      if (response.status === 200) {
        const sorted = (response.data ?? [])
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((category) => ({
            ...category,
            subcategories: (category.subcategories ?? [])
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order),
          }));
        setExpenseCategories(sorted);
      } else {
        console.error("Failed to load expense categories");
        setExpenseCategories([]);
      }
    } catch (error) {
      console.error("Error fetching expense categories:", error);
      setExpenseCategories([]);
    }
  }, []);

  // Fetch income categories
  const fetchIncomeCategories = useCallback(async () => {
    try {
      const response = await listIncomeCategories();
      if (response.status === 200) {
        setIncomeCategories(response.data);
      } else {
        console.error("Failed to load income categories");
        setIncomeCategories([]);
      }
    } catch (error) {
      console.error("Error fetching income categories:", error);
      setIncomeCategories([]);
    }
  }, []);

  // Fetch recurring templates
  const fetchRecurringTemplates = useCallback(async () => {
    if (!userId) {
      setRecurringTemplates([]);
      return;
    }

    try {
      const response = await listRecurringTemplates();
      if (response.status === 200) {
        setRecurringTemplates(response.data);
      } else {
        console.error("Failed to load recurring templates");
        setRecurringTemplates([]);
      }
    } catch (error) {
      console.error("Error fetching recurring templates:", error);
      setRecurringTemplates([]);
    }
  }, [userId]);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    if (!userId) {
      setApiTransactions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const currentDate = new Date(monthCurrentDate);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      const response = await listTransactions({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      if (response.status === 200) {
        setApiTransactions(response.data);
      } else {
        setError("Failed to load transactions");
        setApiTransactions([]);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setError("Failed to load transactions");
      setApiTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [monthCurrentDate, userId]);

  // Fetch categories on mount
  useEffect(() => {
    fetchExpenseCategories();
    fetchIncomeCategories();
  }, [fetchExpenseCategories, fetchIncomeCategories]);

  // Fetch transactions when month or user changes
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const refetch = useCallback(async () => {
    await fetchTransactions();
    await fetchRecurringTemplates();
  }, [fetchTransactions, fetchRecurringTemplates]);

  return {
    apiTransactions,
    recurringTemplates,
    expenseCategories,
    incomeCategories,
    loading,
    error,
    refetch,
  };
}
