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
import { EvolutionStage } from "@/lib/gen/model";
import { getEvolutionImage } from "@/utils/evolutionHelpers";
import { GlassCard } from "@/components/shared/GlassCard";

type BudgetHeroCardProps = {
  // Budget data
  remainingBudget: number;
  hasBudget: boolean;
  formatCurrency: (value: number) => string;
  // Monthly stats
  itemsLoggedThisMonth: number;
  spendThisMonth: number;
  // Gamification data
  streakDays: number;
  evolutionStage: EvolutionStage;
  // Actions
  onSetupPlan?: () => void;
};

export function BudgetHeroCard({
  remainingBudget,
  hasBudget,
  formatCurrency,
  itemsLoggedThisMonth,
  spendThisMonth,
  streakDays,
  evolutionStage,
  onSetupPlan,
}: BudgetHeroCardProps) {
  // Mascot bobbing animation
  const mascotY = useSharedValue(0);
  // Flame animation values
  const flameScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.5);

  useEffect(() => {
    mascotY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Flame pulsing animation
    flameScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1,
      true
    );

    // Glow opacity animation
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 400 }),
        withTiming(0.5, { duration: 400 })
      ),
      -1,
      true
    );
  }, []);

  const mascotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotY.value }],
  }));

  const flameAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

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
      <View style={styles.content}>
        {/* Left side: Financial info */}
        <View style={styles.leftSection}>
          <Text style={styles.subLabel}>Left this month</Text>
          <Text style={styles.budgetAmount}>{formatCurrency(remainingBudget)}</Text>

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

          {/* Streak section - large and prominent */}
          <View style={styles.streakSection}>
            <Animated.View style={[styles.streakGlow, glowAnimatedStyle]} />
            <Animated.View style={[styles.streakFlameContainer, flameAnimatedStyle]}>
              <Text style={styles.streakFlame}>🔥</Text>
            </Animated.View>
            <Text style={styles.streakNumber}>{streakDays}</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </View>
        </View>

        {/* Right side: Mascot */}
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

const styles = StyleSheet.create({
  card: {
    padding: 20,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftSection: {
    flex: 1,
    gap: 8,
    paddingRight: 12,
  },
  subLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  budgetAmount: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 40,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  metricBox: {
    flex: 1,
    backgroundColor: "#f6f3ed",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ede7dc",
  },
  metricLabel: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  streakSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    backgroundColor: "rgba(255, 107, 53, 0.1)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.2)",
    position: "relative",
    overflow: "hidden",
  },
  streakGlow: {
    position: "absolute",
    left: 12,
    top: "50%",
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 107, 53, 0.3)",
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
    color: "#FF6B35",
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF6B35",
  },
  mascotContainer: {
    width: 110,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  mascot: {
    width: 100,
    height: 100,
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
    color: "#111827",
  },
  noBudgetSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  setupButton: {
    backgroundColor: "#22A45D",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  setupButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
