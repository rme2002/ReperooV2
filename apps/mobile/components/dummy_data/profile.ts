export type OverviewSnapshot = {
  streakDays: number;
  level: number;
  xp: number;
  todayAmount: number;
  todayItems: number;
  hasLoggedToday: boolean;
  monthlyRemaining: number;
  monthlyBudget: number;
  weekSpend: number;
  weekPlan: number;
};

export type QuickStat = {
  label: string;
  value: number;
  hintValue?: number;
  hintPrefix?: string;
  hintText?: string;
};

export const profileOverview: OverviewSnapshot = {
  streakDays: 3,
  level: 1,
  xp: 10,
  todayAmount: 12.7,
  todayItems: 2,
  hasLoggedToday: true,
  monthlyRemaining: 820,
  monthlyBudget: 1200,
  weekSpend: 240,
  weekPlan: 500,
};

export const profileQuickStats: QuickStat[] = [
  { label: "Weekly remaining", value: 260, hintValue: 500, hintPrefix: "of " },
  { label: "Daily guardrail", value: 40, hintText: "Target for today" },
];
