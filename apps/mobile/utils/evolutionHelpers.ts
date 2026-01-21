import { ImageSourcePropType } from "react-native";
import { EvolutionStage, ExperienceResponse } from "@/lib/gen/model";

/**
 * Map evolution stages to image assets
 */
export function getEvolutionImage(
  stage: EvolutionStage
): ImageSourcePropType {
  switch (stage) {
    case EvolutionStage.Baby:
      return require("@/assets/images/heroBase1.png");
    case EvolutionStage.Young:
      return require("@/assets/images/heroBase2.png");
    case EvolutionStage.Adult:
      return require("@/assets/images/heroBase3.png");
    case EvolutionStage.Prime:
      return require("@/assets/images/heroBase4.png");
    case EvolutionStage.Legendary:
      return require("@/assets/images/heroBase5.png");
    default:
      return require("@/assets/images/heroBase1.png");
  }
}

/**
 * Map evolution stages to display names
 */
export function getEvolutionDisplayName(stage: EvolutionStage): string {
  switch (stage) {
    case EvolutionStage.Baby:
      return "Baby Roo";
    case EvolutionStage.Young:
      return "Young Roo";
    case EvolutionStage.Adult:
      return "Adult Roo";
    case EvolutionStage.Prime:
      return "Prime Roo";
    case EvolutionStage.Legendary:
      return "Legendary Roo";
    default:
      return "Baby Roo";
  }
}

/**
 * Calculate XP progress values for display
 */
export function getXPProgressValues(
  experience: ExperienceResponse | null | undefined
): { currentXP: number; maxXP: number } {
  if (!experience) {
    return { currentXP: 0, maxXP: 100 };
  }

  const currentXP =
    (experience.current_xp ?? 0) - (experience.total_xp_for_current_level ?? 0);
  const maxXP = experience.xp_for_next_level ?? 100;

  return {
    currentXP: Math.max(0, currentXP),
    maxXP: Math.max(1, maxXP), // Ensure maxXP is at least 1 to avoid division by zero
  };
}
