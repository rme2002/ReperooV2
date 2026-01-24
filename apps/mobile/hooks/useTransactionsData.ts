import { useEffect, useState, useCallback } from "react";
import type { TransactionEntry } from "@/components/dummy_data/transactions";
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
  apiTransactions: TransactionEntry[];
  recurringTemplates: ListRecurringTemplates200Item[];
  expenseCategories: ExpenseCategory[];
  incomeCategories: IncomeCategory[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Transform API transaction to local format
 */
function transformApiTransaction(
  apiTx: ListTransactions200Item
): TransactionEntry | null {
  const isRecurring = Boolean(apiTx.recurring_template_id);

  if (apiTx.type === "expense") {
    return {
      id: apiTx.id?.toString() ?? `api-${Date.now()}`,
      kind: "expense",
      amount: apiTx.amount,
      categoryId: apiTx.expense_category_id,
      subcategoryId: apiTx.expense_subcategory_id ?? undefined,
      note: apiTx.notes ?? undefined,
      timestamp: apiTx.occurred_at,
      isRecurringInstance: isRecurring,
      recurringDayOfMonth: null,
    };
  } else if (apiTx.type === "income") {
    return {
      id: apiTx.id?.toString() ?? `api-${Date.now()}`,
      kind: "income",
      amount: apiTx.amount,
      incomeCategoryId: apiTx.income_category_id,
      note: apiTx.notes ?? undefined,
      timestamp: apiTx.occurred_at,
      isRecurringInstance: isRecurring,
      recurringDayOfMonth: null,
    };
  }

  return null;
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
  const [apiTransactions, setApiTransactions] = useState<TransactionEntry[]>(
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
        setExpenseCategories(response.data);
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
        const transformed = response.data
          .map(transformApiTransaction)
          .filter((tx): tx is TransactionEntry => tx !== null);
        setApiTransactions(transformed);
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
