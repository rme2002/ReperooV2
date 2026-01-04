import type { IncomeEvent, MonthlyPlan } from "@/src/features/budget/types";

export const incomeSeed: Record<string, IncomeEvent[]> = {
  "dec-2025": [
    {
      id: "inc-dec-01",
      amount: 3200,
      type: "salary",
      date: "2025-12-01",
      note: "Full-time role",
    },
    {
      id: "inc-dec-15",
      amount: 650,
      type: "freelance",
      date: "2025-12-15",
      note: "Website sprint",
    },
  ],
  "nov-2025": [],
  "oct-2025": [],
};

export const planSeed: Record<string, MonthlyPlan | undefined> = {
  "dec-2025": {
    monthKey: "dec-2025",
    amount: 3600,
    paydayDayOfMonth: 1,
    paySchedule: "monthly",
    savingsGoal: 400,
    investmentsGoal: 280,
  },
  "nov-2025": {
    monthKey: "nov-2025",
    amount: 2800,
    paydayDayOfMonth: 5,
    savingsGoal: 350,
    investmentsGoal: 200,
  },
  "oct-2025": undefined,
};
