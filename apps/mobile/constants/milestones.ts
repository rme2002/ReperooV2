import type { StreakMilestone } from "@/lib/gen/model";

export const DEFAULT_MILESTONES: StreakMilestone[] = [
  { days: 7, xp_reward: 50, achieved: false },
  { days: 14, xp_reward: 75, achieved: false },
  { days: 30, xp_reward: 150, achieved: false },
  { days: 60, xp_reward: 250, achieved: false },
  { days: 100, xp_reward: 400, achieved: false },
  { days: 150, xp_reward: 500, achieved: false },
  { days: 200, xp_reward: 600, achieved: false },
  { days: 365, xp_reward: 1000, achieved: false },
];
