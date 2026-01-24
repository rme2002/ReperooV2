import { useMemo } from "react";
import type {
  ExperienceResponse,
  MilestonesResponse,
  StreakMilestone,
} from "@/lib/gen/model";
import { EvolutionStage } from "@/lib/gen/model";

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
  milestones: MilestonesResponse | null
): UseHomeGamificationReturn {
  const streakDays = experience?.current_streak ?? 0;
  const evolutionStage = experience?.evolution_stage ?? EvolutionStage.Baby;

  // Get next milestone (first unachieved)
  const nextMilestone = useMemo(() => {
    if (!milestones?.milestones) return null;
    return milestones.milestones.find((m) => !m.achieved) ?? null;
  }, [milestones]);

  return {
    streakDays,
    evolutionStage,
    nextMilestone,
  };
}
