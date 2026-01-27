import { useMemo } from "react";
import type {
  ExperienceResponse,
  StreakMilestonesResponse,
  StreakMilestone,
} from "@/lib/gen/model";
import { EvolutionStage } from "@/lib/gen/model";
import { DEFAULT_MILESTONES } from "@/constants/milestones";

/**
 * Return type for useHomeGamification hook
 */
export interface UseHomeGamificationReturn {
  streakDays: number;
  evolutionStage: EvolutionStage;
  nextMilestone: StreakMilestone | null;
}

/**
 * Custom hook for computing home gamification metrics
 * Calculates streak, evolution stage, and next milestone
 *
 * @param experience - User experience data
 * @param milestones - Milestones data
 * @returns Object containing gamification metrics
 */
export function useHomeGamification(
  experience: ExperienceResponse | null,
  milestones: StreakMilestonesResponse | null
): UseHomeGamificationReturn {
  const streakDays = experience?.current_streak ?? 0;
  const evolutionStage = experience?.evolution_stage ?? EvolutionStage.Baby;

  const milestoneList = useMemo<StreakMilestone[]>(() => {
    if (milestones?.milestones?.length) {
      return milestones.milestones;
    }

    return DEFAULT_MILESTONES.map((milestone) => ({
      ...milestone,
      achieved: streakDays >= milestone.days,
      achieved_at: null,
      days_remaining: Math.max(0, milestone.days - streakDays),
    }));
  }, [milestones, streakDays]);

  // Get next milestone (first unachieved)
  const nextMilestone = useMemo(() => {
    if (!milestoneList.length) return null;
    return milestoneList.find((milestone) => !milestone.achieved) ?? null;
  }, [milestoneList]);

  return {
    streakDays,
    evolutionStage,
    nextMilestone,
  };
}
