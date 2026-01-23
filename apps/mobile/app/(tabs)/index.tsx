import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { AddExpenseModal } from "@/components/modals/AddExpenseModal";
import { AddIncomeModal } from "@/components/modals/AddIncomeModal";
import { useCurrencyFormatter } from "@/components/profile/useCurrencyFormatter";
import { useInsightsContext } from "@/components/insights/InsightsProvider";
import { useBudgetContext } from "@/components/budget/BudgetProvider";
import { useExperience } from "@/components/home/ExperienceProvider";
import { EvolutionStage } from "@/lib/gen/model";

// New components
import { BudgetHeroCard } from "@/components/home/BudgetHeroCard";
import { MilestoneProgressCard } from "@/components/home/MilestoneProgressCard";
import { AchievementBadgesSection } from "@/components/home/AchievementBadgesSection";

// Design constants
const FAB_BOTTOM_OFFSET = 100;

export default function OverviewScreen() {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const { width } = useWindowDimensions();
  const { formatCurrency } = useCurrencyFormatter();
  const fabSize = Math.max(48, Math.min(56, width * 0.14));
  const scrollY = useSharedValue(0);

  const { currentSnapshot } = useInsightsContext();
  const monthSnapshot = currentSnapshot;

  const { budgetPlan } = useBudgetContext();

  const { experience, milestones } = useExperience();

  // Calculate real gamification values
  const streakDays = experience?.current_streak ?? 0;
  const evolutionStage = experience?.evolution_stage ?? EvolutionStage.Baby;

  // Get next milestone (first unachieved)
  const nextMilestone = useMemo(() => {
    if (!milestones?.milestones) return null;
    return milestones.milestones.find((m) => !m.achieved) ?? null;
  }, [milestones]);

  const monthCurrentDate = useMemo(() => {
    if (!monthSnapshot?.currentDate) {
      const fallback = new Date();
      fallback.setHours(0, 0, 0, 0);
      return fallback;
    }
    const date = new Date(monthSnapshot.currentDate);
    if (Number.isNaN(date.getTime())) {
      const fallback = new Date();
      fallback.setHours(0, 0, 0, 0);
      return fallback;
    }
    date.setHours(0, 0, 0, 0);
    return date;
  }, [monthSnapshot?.currentDate]);

  const hasBudget = Boolean(budgetPlan);
  const totalBudget = budgetPlan?.expected_income ?? 0;
  const totalSpent = monthSnapshot?.totalSpent ?? 0;
  const remainingBudget = totalBudget - totalSpent;

  // Monthly stats for BudgetHeroCard
  // Sum up items from all categories to get total transaction count
  const itemsLoggedThisMonth = useMemo(() => {
    if (!monthSnapshot?.categories) return 0;
    return monthSnapshot.categories.reduce((sum, cat) => sum + (cat.items ?? 0), 0);
  }, [monthSnapshot?.categories]);
  const spendThisMonth = totalSpent;

  const handleSetPlanPress = () => {
    router.push("/(tabs)/insights");
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // FAB animation - shrinks slightly on scroll
  const animatedFabStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, 100],
      [1, 0.9],
      Extrapolation.CLAMP
    );
    return { transform: [{ scale }] };
  });

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.brandRow}>
              <Text style={styles.mascot}>🦘</Text>
              <Text style={styles.brand}>Reperoo</Text>
            </View>
          </View>

          {/* Budget Hero Card - Main financial overview with mascot */}
          <BudgetHeroCard
            remainingBudget={remainingBudget}
            hasBudget={hasBudget}
            formatCurrency={formatCurrency}
            itemsLoggedThisMonth={itemsLoggedThisMonth}
            spendThisMonth={spendThisMonth}
            streakDays={streakDays}
            evolutionStage={evolutionStage}
            onSetupPlan={handleSetPlanPress}
          />

          {/* Milestone Progress Card */}
          <MilestoneProgressCard
            currentStreak={streakDays}
            nextMilestone={nextMilestone}
          />

          {/* Achievement Badges Section */}
          <AchievementBadgesSection
            milestones={milestones?.milestones ?? []}
            currentStreak={streakDays}
          />

          {/* Bottom padding for FAB clearance */}
          <View style={{ height: FAB_BOTTOM_OFFSET }} />
        </Animated.ScrollView>

        {/* FAB Backdrop */}
        {showActions ? (
          <Pressable
            style={styles.fabBackdrop}
            onPress={() => setShowActions(false)}
          >
            <View />
          </Pressable>
        ) : null}

        {/* FAB - docked above bottom nav with safe spacing */}
        <Animated.View
          style={[styles.fabStack, { right: 20, bottom: 24 }, animatedFabStyle]}
        >
          {showActions ? (
            <View style={styles.fabMenuColumn}>
              <Pressable
                style={({ pressed }) => [
                  styles.fabAction,
                  pressed && styles.fabActionPressed,
                ]}
                onPress={() => {
                  setShowActions(false);
                  setShowAdd(true);
                }}
              >
                <Text style={styles.fabActionLabel}>Add expense</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.fabAction,
                  styles.fabActionSecondary,
                  pressed && styles.fabActionPressed,
                ]}
                onPress={() => {
                  setShowActions(false);
                  setShowIncome(true);
                }}
              >
                <Text
                  style={[styles.fabActionLabel, styles.fabActionLabelSecondary]}
                >
                  Add income
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.fab,
                {
                  width: fabSize,
                  height: fabSize,
                  borderRadius: fabSize / 2,
                },
                pressed && styles.fabPressed,
              ]}
              onPress={() => setShowActions(true)}
            >
              <Text style={styles.fabIcon}>+</Text>
            </Pressable>
          )}
        </Animated.View>

        <AddExpenseModal visible={showAdd} onClose={() => setShowAdd(false)} />
        <AddIncomeModal
          visible={showIncome}
          onClose={() => setShowIncome(false)}
          monthKey={monthSnapshot?.key ?? ""}
          currentDate={monthSnapshot?.currentDate ?? new Date().toISOString()}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#f6f3ed",
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    flexGrow: 1,
    minHeight: "100%",
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mascot: {
    fontSize: 24,
  },
  brand: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  fabBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15,23,42,0.2)",
  },
  fabStack: {
    position: "absolute",
    alignItems: "flex-end",
    gap: 8,
  },
  fab: {
    backgroundColor: "#22A45D",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#166534",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#1E8F52",
  },
  fabMenuColumn: {
    flexDirection: "column",
    gap: 6,
  },
  fabAction: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#22A45D",
    borderWidth: 1,
    borderColor: "#1E8F52",
    shadowColor: "#166534",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  fabActionSecondary: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
  },
  fabActionLabel: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "700",
  },
  fabActionLabelSecondary: {
    color: "#0f172a",
  },
  fabActionPressed: {
    opacity: 0.85,
  },
  fabPressed: {
    opacity: 0.9,
  },
  fabIcon: {
    color: "#f8fafc",
    fontSize: 24,
    fontWeight: "800",
    marginTop: -2,
  },
});
