// Re-export generated budget plan types
export type {
  BudgetPlan,
  CreateBudgetPlanPayload,
  UpdateBudgetPlanPayload,
} from "@/lib/gen/model";

export type IncomeType = "salary" | "freelance_business" | "government_benefits" | "investment_income" | "refunds_reimbursements" | "income_other";

export type IncomeEvent = {
  id: string;
  amount: number;
  type: string;
  note?: string;
  date: string;
  isRecurring?: boolean;
  recurringDayOfMonth?: number | null;
};

export const incomeTypeOptions = [
  { value: "salary", label: "Salary" },
  { value: "freelance_business", label: "Freelance/Business" },
  { value: "government_benefits", label: "Government Benefits" },
  { value: "investment_income", label: "Investment Income" },
  { value: "refunds_reimbursements", label: "Refunds/Reimbursements" },
  { value: "income_other", label: "Other Income" },
];

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
  incomeCategoryId: string;
  note?: string;
  timestamp: string;
  timeLabel?: string;
  recurringTemplateId?: string;
  recurringDateKey?: string;
  isRecurringInstance?: boolean;
  recurringDayOfMonth?: number | null;
};

export type LedgerEntry = LedgerExpenseEntry | LedgerIncomeEntry;
