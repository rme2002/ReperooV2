export type IncomeType = "salary" | "freelance" | "side" | "benefits" | "other";

export type IncomeEvent = {
  id: string;
  amount: number;
  type: IncomeType;
  date: string; // ISO date string (yyyy-mm-dd)
  note?: string;
  isRecurring?: boolean;
  recurringDayOfMonth?: number | null;
};

export type MonthlyPlan = {
  monthKey: string;
  amount: number;
  paydayDayOfMonth?: number | null;
  paySchedule?: "monthly" | "irregular";
  savingsGoal?: number;
  investmentsGoal?: number;
};

export type LedgerExpenseEntry = {
  id: string;
  kind: "expense";
  amount: number;
  categoryId: string;
  subcategoryId?: string;
  note?: string;
  timestamp: string;
  timeLabel?: string;
  recurringTemplateId?: string;
  recurringDateKey?: string;
  isRecurringInstance?: boolean;
  recurringDayOfMonth?: number | null;
};

export type LedgerIncomeEntry = {
  id: string;
  kind: "income";
  amount: number;
  incomeType: IncomeType;
  note?: string;
  timestamp: string;
  timeLabel?: string;
  isRecurringInstance?: boolean;
  recurringDayOfMonth?: number | null;
};

export type LedgerEntry = LedgerExpenseEntry | LedgerIncomeEntry;

export const incomeTypeLabels: Record<IncomeType, string> = {
  salary: "Salary",
  freelance: "Freelance / Contract",
  side: "Side Income",
  benefits: "Benefits",
  other: "Other",
};

export const incomeTypeOptions = [
  { value: "salary", label: incomeTypeLabels.salary },
  { value: "freelance", label: incomeTypeLabels.freelance },
  { value: "side", label: incomeTypeLabels.side },
  { value: "benefits", label: incomeTypeLabels.benefits },
  { value: "other", label: incomeTypeLabels.other },
];

export const getIncomeTypeLabel = (type: IncomeType) => incomeTypeLabels[type] ?? "Income";
