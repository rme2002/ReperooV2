import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import type { StreakMilestone } from "@/lib/gen/model";
import { GlassCard } from "@/components/shared/GlassCard";
import { getBadgeName } from "./AchievementBadge";

type MilestoneProgressCardProps = {
  currentStreak: number;
  nextMilestone: StreakMilestone | null;
};

export function MilestoneProgressCard({
  currentStreak,
  nextMilestone,
}: MilestoneProgressCardProps) {
  const progressWidth = useSharedValue(0);

  const progress = nextMilestone
    ? Math.min((currentStreak / nextMilestone.days) * 100, 100)
    : 100;

  useEffect(() => {
    progressWidth.value = withTiming(progress, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  // If no next milestone, user has completed all milestones
  if (!nextMilestone) {
    return (
      <GlassCard style={styles.card}>
        <View style={styles.completedContainer}>
          <Text style={styles.completedEmoji}>🏆</Text>
          <View style={styles.completedText}>
            <Text style={styles.completedTitle}>All milestones achieved!</Text>
            <Text style={styles.completedSubtitle}>
              You're a true legend with {currentStreak} days
            </Text>
          </View>
        </View>
      </GlassCard>
    );
  }

  const daysRemaining = nextMilestone.days - currentStreak;
  const milestoneName = getBadgeName(nextMilestone.days);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.label}>Next milestone</Text>
          <Text style={styles.milestoneName}>{milestoneName}</Text>
        </View>
        <View style={styles.xpReward}>
          <Text style={styles.xpText}>+{nextMilestone.xp_reward} XP</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, animatedProgressStyle]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressText}>
            {currentStreak}/{nextMilestone.days} days
          </Text>
          <Text style={styles.daysRemaining}>
            {daysRemaining} {daysRemaining === 1 ? "day" : "days"} to go
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  milestoneName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  xpReward: {
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(218, 165, 32, 0.3)",
  },
  xpText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B8860B",
  },
  progressContainer: {
    gap: 8,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ede7dc",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#22A45D",
    borderRadius: 5,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  daysRemaining: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6b7280",
  },
  completedContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  completedEmoji: {
    fontSize: 32,
  },
  completedText: {
    flex: 1,
    gap: 2,
  },
  completedTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  completedSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
});
