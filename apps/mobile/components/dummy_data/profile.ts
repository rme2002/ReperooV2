// ============================================================================
// DEPRECATED: This file contains dummy data for the home screen
// ============================================================================
// Most gamification data has been migrated to ExperienceProvider (real API data).
// Only transaction summary data is still using dummy values.
//
// MIGRATED TO REAL DATA:
//   ❌ streakDays    -> Now from ExperienceProvider
//   ❌ level         -> Now from ExperienceProvider
//   ❌ xp            -> Now from ExperienceProvider
//   ❌ xpMax         -> Now from ExperienceProvider
//   ❌ rooStage      -> Now from ExperienceProvider (as evolutionStage)
//
// STILL USING DUMMY DATA:
//   ⚠️  todayAmount      -> Today's transaction total
//   ⚠️  todayItems       -> Number of transactions today
//   ⚠️  hasLoggedToday   -> Whether user logged transactions today
//
// UNUSED (can be removed):
//   ❌ monthlyRemaining  -> Now from BudgetProvider + InsightsProvider
//   ❌ monthlyBudget     -> Now from BudgetProvider + InsightsProvider
//   ❌ weekSpend         -> Not used
//   ❌ weekPlan          -> Not used
//
// TODO: Replace transaction summary with real data, then delete this file
// ============================================================================

export type OverviewSnapshot = {
  // Deprecated - now from ExperienceProvider
  streakDays: number;
  level: number;
  xp: number;
  xpMax: number;
  rooStage: string;

  // Still in use - needs real API endpoint
  todayAmount: number;
  todayItems: number;
  hasLoggedToday: boolean;

  // Unused - can be removed
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
  xp: 120,
  xpMax: 200,
  rooStage: "Baby",
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
