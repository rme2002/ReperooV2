import { createContext, useContext, useMemo, useReducer } from "react";

import { incomeSeed, planSeed } from "@/src/dummy_data/income";
import type { IncomeEvent, MonthlyPlan } from "@/src/features/budget/types";

type State = {
  incomeByMonth: Record<string, IncomeEvent[]>;
  planByMonth: Record<string, MonthlyPlan | undefined>;
};

type Action =
  | { type: "add-income"; monthKey: string; payload: IncomeEvent }
  | { type: "update-income"; monthKey: string; incomeId: string; payload: Partial<Omit<IncomeEvent, "id">> }
  | { type: "delete-income"; monthKey: string; incomeId: string }
  | { type: "save-plan"; monthKey: string; payload: MonthlyPlan };

const BudgetContext = createContext<{
  incomeByMonth: Record<string, IncomeEvent[]>;
  planByMonth: Record<string, MonthlyPlan | undefined>;
  addIncome: (monthKey: string, payload: Omit<IncomeEvent, "id">) => IncomeEvent;
  updateIncome: (monthKey: string, incomeId: string, payload: Partial<Omit<IncomeEvent, "id">>) => void;
  deleteIncome: (monthKey: string, incomeId: string) => void;
  saveMonthlyPlan: (monthKey: string, payload: Omit<MonthlyPlan, "monthKey">) => MonthlyPlan;
} | null>(null);

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "add-income": {
      const { monthKey, payload } = action;
      const nextMonth = [...(state.incomeByMonth[monthKey] ?? []), payload].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      return {
        ...state,
        incomeByMonth: {
          ...state.incomeByMonth,
          [monthKey]: nextMonth,
        },
      };
    }
    case "update-income": {
      const { monthKey, incomeId, payload } = action;
      const monthEntries = state.incomeByMonth[monthKey] ?? [];
      const nextMonth = monthEntries
        .map((entry) => (entry.id === incomeId ? { ...entry, ...payload } : entry))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return {
        ...state,
        incomeByMonth: {
          ...state.incomeByMonth,
          [monthKey]: nextMonth,
        },
      };
    }
    case "delete-income": {
      const { monthKey, incomeId } = action;
      const monthEntries = state.incomeByMonth[monthKey] ?? [];
      const nextMonth = monthEntries.filter((entry) => entry.id !== incomeId);
      return {
        ...state,
        incomeByMonth: {
          ...state.incomeByMonth,
          [monthKey]: nextMonth,
        },
      };
    }
    case "save-plan": {
      const { monthKey, payload } = action;
      return {
        ...state,
        planByMonth: {
          ...state.planByMonth,
          [monthKey]: {
            monthKey,
            ...payload,
          },
        },
      };
    }
    default:
      return state;
  }
};

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    incomeByMonth: incomeSeed,
    planByMonth: planSeed,
  });

  const value = useMemo(() => {
    const addIncome = (monthKey: string, payload: Omit<IncomeEvent, "id">) => {
      const entry: IncomeEvent = { ...payload, id: `inc-${monthKey}-${Date.now()}` };
      dispatch({ type: "add-income", monthKey, payload: entry });
      return entry;
    };
    const updateIncome = (monthKey: string, incomeId: string, payload: Partial<Omit<IncomeEvent, "id">>) => {
      dispatch({ type: "update-income", monthKey, incomeId, payload });
    };
    const deleteIncome = (monthKey: string, incomeId: string) => {
      dispatch({ type: "delete-income", monthKey, incomeId });
    };
    const saveMonthlyPlan = (monthKey: string, payload: Omit<MonthlyPlan, "monthKey">) => {
      dispatch({ type: "save-plan", monthKey, payload: { monthKey, ...payload } });
      return { monthKey, ...payload };
    };
    return {
      incomeByMonth: state.incomeByMonth,
      planByMonth: state.planByMonth,
      addIncome,
      updateIncome,
      deleteIncome,
      saveMonthlyPlan,
    };
  }, [state.incomeByMonth, state.planByMonth]);

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudgetContext() {
  const ctx = useContext(BudgetContext);
  if (!ctx) {
    throw new Error("useBudgetContext must be used within a BudgetProvider");
  }
  return ctx;
}
