import { useEffect } from "react";
import { View, Image, Text, StyleSheet, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { EvolutionStage, StreakMilestone } from "@/lib/gen/model";
import { getEvolutionImage } from "@/utils/evolutionHelpers";
import { GlassCard } from "@/components/shared/GlassCard";
import { getBadgeName } from "./AchievementBadge";
import { alpha, colors, gradients, palette } from "@/constants/theme";

type BudgetHeroCardProps = {
  // Budget data
  remainingBudget: number;
  totalBudget: number;
  hasBudget: boolean;
  formatCurrency: (value: number) => string;
  // Monthly stats
  itemsLoggedThisMonth: number;
  spendThisMonth: number;
  // Gamification data
  streakDays: number;
  evolutionStage: EvolutionStage;
  nextMilestone: StreakMilestone | null;
  // Actions
  onSetupPlan?: () => void;
};

export function BudgetHeroCard({
  remainingBudget,
  totalBudget,
  hasBudget,
  formatCurrency,
  itemsLoggedThisMonth,
  spendThisMonth,
  streakDays,
  evolutionStage,
  nextMilestone,
  onSetupPlan,
}: BudgetHeroCardProps) {
  // Mascot bobbing animation
  const mascotY = useSharedValue(0);
  // Flame animation values
  const flameScale = useSharedValue(1);
  // Milestone progress animation
  const progressWidth = useSharedValue(0);
  // Budget progress animation
  const budgetProgressWidth = useSharedValue(0);

  const milestoneProgress = nextMilestone
    ? Math.min((streakDays / nextMilestone.days) * 100, 100)
    : 100;

  // Calculate budget progress (remaining / total)
  const budgetProgress =
    totalBudget > 0
      ? Math.min(Math.max((remainingBudget / totalBudget) * 100, 0), 100)
      : 0;

  useEffect(() => {
    mascotY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    // Flame pulsing animation
    flameScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 500 }),
        withTiming(1, { duration: 500 }),
      ),
      -1,
      true,
    );

    // Milestone progress animation
    progressWidth.value = withTiming(milestoneProgress, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });

    // Budget progress animation
    budgetProgressWidth.value = withTiming(budgetProgress, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [
    budgetProgress,
    budgetProgressWidth,
    flameScale,
    mascotY,
    milestoneProgress,
    progressWidth,
  ]);

  const mascotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotY.value }],
  }));

  const flameAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const animatedBudgetProgressStyle = useAnimatedStyle(() => ({
    width: `${budgetProgressWidth.value}%`,
  }));

  const daysRemaining = nextMilestone ? nextMilestone.days - streakDays : 0;
  const milestoneName = nextMilestone ? getBadgeName(nextMilestone.days) : "";

  if (!hasBudget) {
    return (
      <GlassCard style={styles.card}>
        <View style={styles.noBudgetContent}>
          <View style={styles.noBudgetLeft}>
            <Text style={styles.noBudgetTitle}>Set up your monthly plan</Text>
            <Text style={styles.noBudgetSubtitle}>
              Track your spending and stay on budget
            </Text>
            <Pressable style={styles.setupButton} onPress={onSetupPlan}>
              <Text style={styles.setupButtonText}>Get Started</Text>
            </Pressable>
          </View>
          <Animated.View style={[styles.mascotContainer, mascotAnimatedStyle]}>
            <Image
              source={getEvolutionImage(evolutionStage)}
              style={styles.mascot}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={styles.card}>
      {/* Mascot - positioned behind content */}
      <Animated.View style={[styles.mascotContainer, mascotAnimatedStyle]}>
        <Image
          source={getEvolutionImage(evolutionStage)}
          style={styles.mascot}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Content layer - on top of mascot */}
      <View style={styles.contentLayer}>
        {/* Financial info */}
        <View style={styles.leftSection}>
          <Text style={styles.subLabel}>Left this month</Text>
          <Text style={styles.budgetAmount}>
            {formatCurrency(remainingBudget)}
          </Text>

          {/* Budget Progress Bar */}
          <View style={styles.budgetProgressTrack}>
            <Animated.View
              style={[styles.budgetProgressFill, animatedBudgetProgressStyle]}
            />
          </View>

          {/* Metric boxes */}
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Items logged</Text>
              <Text style={styles.metricValue}>{itemsLoggedThisMonth}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Spend this month</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(spendThisMonth)}
              </Text>
            </View>
          </View>
        </View>

        {/* Streak section - gradient banner (full width) */}
        <LinearGradient
          colors={[...gradients.streak]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.streakBanner}
        >
          <Animated.View
            style={[styles.streakFlameContainer, flameAnimatedStyle]}
          >
            <Text style={styles.streakFlame}>🔥</Text>
          </Animated.View>
          <Text style={styles.streakNumber}>{streakDays}</Text>
          <Text style={styles.streakLabel}>day streak</Text>
        </LinearGradient>

        {/* Milestone progress (full width) */}
        {nextMilestone ? (
          <View style={styles.milestoneSection}>
            <View style={styles.milestoneHeader}>
              <Text style={styles.milestoneLabel}>Next: {milestoneName}</Text>
              <Text style={styles.milestoneXp}>
                +{nextMilestone.xp_reward} XP
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[styles.progressFill, animatedProgressStyle]}
              />
            </View>
            <Text style={styles.milestoneDays}>
              {daysRemaining} {daysRemaining === 1 ? "day" : "days"} to go
            </Text>
          </View>
        ) : (
          <View style={styles.milestoneCompleted}>
            <Text style={styles.milestoneCompletedText}>
              🏆 All milestones achieved!
            </Text>
          </View>
        )}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    overflow: "hidden",
  },
  contentLayer: {
    zIndex: 2,
  },
  leftSection: {
    flex: 1,
    gap: 4,
    paddingRight: 8,
  },
  subLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  budgetAmount: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 40,
  },
  budgetProgressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginTop: 8,
    overflow: "hidden",
    maxWidth: "60%",
  },
  budgetProgressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  metricBox: {
    flex: 1,
    backgroundColor: `${colors.background}F2`,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "500",
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  streakBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  streakFlameContainer: {
    zIndex: 1,
  },
  streakFlame: {
    fontSize: 32,
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.white,
  },
  streakLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: alpha.offWhite90,
  },
  milestoneSection: {
    gap: 6,
    marginTop: 12,
  },
  milestoneHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  milestoneLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  milestoneXp: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gold,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  milestoneDays: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textTertiary,
  },
  milestoneCompleted: {
    marginTop: 12,
  },
  milestoneCompletedText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  mascotContainer: {
    position: "absolute",
    right: -40,
    top: -20,
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    opacity: 0.9,
  },
  mascot: {
    width: 180,
    height: 180,
  },
  // No budget state styles
  noBudgetContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  noBudgetLeft: {
    flex: 1,
    gap: 8,
    paddingRight: 12,
  },
  noBudgetTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  noBudgetSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  setupButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  setupButtonText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: "700",
  },
});
