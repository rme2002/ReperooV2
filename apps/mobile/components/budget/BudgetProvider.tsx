import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  getBudgetPlan,
  createBudgetPlan as createBudgetPlanApi,
  updateBudgetPlan as updateBudgetPlanApi,
} from "@/lib/gen/budget-plans/budget-plans";
import type {
  BudgetPlan,
  CreateBudgetPlanPayload,
  UpdateBudgetPlanPayload,
} from "@/components/budget/types";

type BudgetContextValue = {
  budgetPlan: BudgetPlan | null;
  isLoading: boolean;
  error: string | null;
  createBudgetPlan: (
    payload: CreateBudgetPlanPayload,
    params?: BudgetPlanMonthParams,
  ) => Promise<void>;
  updateBudgetPlan: (
    payload: UpdateBudgetPlanPayload,
    params?: BudgetPlanMonthParams,
  ) => Promise<void>;
  refetch: (params?: BudgetPlanMonthParams) => Promise<void>;
};

const BudgetContext = createContext<BudgetContextValue | null>(null);

type BudgetPlanMonthParams = {
  year: number;
  month: number;
};

const getDefaultMonthParams = (): BudgetPlanMonthParams => {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
};

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [budgetPlan, setBudgetPlan] = useState<BudgetPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolveMonthParams = useCallback(
    (params?: BudgetPlanMonthParams) => params ?? getDefaultMonthParams(),
    [],
  );

  const fetchBudgetPlan = useCallback(
    async (params?: BudgetPlanMonthParams) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await getBudgetPlan(resolveMonthParams(params));

        if (response.status === 200 && response.data) {
          setBudgetPlan(response.data);
        } else if (response.status === 404) {
          // No budget plan exists yet - this is fine
          setBudgetPlan(null);
        } else {
          setError("Failed to fetch budget plan");
        }
      } catch (err) {
        // Check if it's a 404 error (no plan exists)
        if (
          err &&
          typeof err === "object" &&
          "status" in err &&
          err.status === 404
        ) {
          setBudgetPlan(null);
        } else {
          console.error("Error fetching budget plan:", err);
          setError(
            err instanceof Error ? err.message : "Failed to fetch budget plan",
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    [resolveMonthParams],
  );

  const createBudgetPlan = useCallback(
    async (
      payload: CreateBudgetPlanPayload,
      params?: BudgetPlanMonthParams,
    ) => {
      try {
        setError(null);

        const response = await createBudgetPlanApi(
          payload,
          resolveMonthParams(params),
        );

        if (response.status === 201 && response.data) {
          setBudgetPlan(response.data);
        } else {
          setError("Failed to create budget plan");
          throw new Error("Failed to create budget plan");
        }
      } catch (err) {
        console.error("Error creating budget plan:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create budget plan";
        setError(errorMessage);
        throw err;
      }
    },
    [resolveMonthParams],
  );

  const updateBudgetPlan = useCallback(
    async (
      payload: UpdateBudgetPlanPayload,
      params?: BudgetPlanMonthParams,
    ) => {
      try {
        setError(null);

        const response = await updateBudgetPlanApi(
          payload,
          resolveMonthParams(params),
        );

        if (response.status === 200 && response.data) {
          setBudgetPlan(response.data);
        } else {
          setError("Failed to update budget plan");
          throw new Error("Failed to update budget plan");
        }
      } catch (err) {
        console.error("Error updating budget plan:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update budget plan";
        setError(errorMessage);
        throw err;
      }
    },
    [resolveMonthParams],
  );

  // Fetch budget plan on mount
  useEffect(() => {
    fetchBudgetPlan();
  }, [fetchBudgetPlan]);

  const value: BudgetContextValue = {
    budgetPlan,
    isLoading,
    error,
    createBudgetPlan,
    updateBudgetPlan,
    refetch: fetchBudgetPlan,
  };

  return (
    <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
  );
}

export function useBudgetContext() {
  const ctx = useContext(BudgetContext);
  if (!ctx) {
    throw new Error("useBudgetContext must be used within a BudgetProvider");
  }
  return ctx;
}
