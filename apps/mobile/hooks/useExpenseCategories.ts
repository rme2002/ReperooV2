import { useCallback, useEffect, useState } from "react";
import type { ExpenseCategory } from "@/lib/gen/model";
import { listExpenseCategories } from "@/lib/gen/expense-categories/expense-categories";

type UseExpenseCategoriesReturn = {
  expenseCategories: ExpenseCategory[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export function useExpenseCategories(): UseExpenseCategoriesReturn {
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenseCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
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
        setError("Failed to load expense categories");
      }
    } catch (err) {
      console.error("Error fetching expense categories:", err);
      setExpenseCategories([]);
      setError("Failed to load expense categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenseCategories();
  }, [fetchExpenseCategories]);

  return {
    expenseCategories,
    loading,
    error,
    refetch: fetchExpenseCategories,
  };
}
