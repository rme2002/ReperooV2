import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { AddExpenseModal } from "@/components/modals/AddExpenseModal";
import { AddIncomeModal } from "@/components/modals/AddIncomeModal";
import { useCurrencyFormatter } from "@/components/profile/useCurrencyFormatter";
import { useInsightsContext } from "@/components/insights/InsightsProvider";
import { useBudgetContext } from "@/components/budget/BudgetProvider";
import { useExperience } from "@/components/home/ExperienceProvider";
import { EvolutionStage } from "@/lib/gen/model";
import { colors } from "@/constants/theme";

// New components
import { BudgetHeroCard } from "@/components/home/BudgetHeroCard";
import { AchievementBadgesSection } from "@/components/home/AchievementBadgesSection";

export default function OverviewScreen() {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const { formatCurrency } = useCurrencyFormatter();

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

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Text style={styles.mascot}>🦘</Text>
              <Text style={styles.brand}>Reperoo</Text>
            </View>
          </View>

          {/* Budget Hero Card - Main financial overview with mascot */}
          <BudgetHeroCard
            remainingBudget={remainingBudget}
            totalBudget={totalBudget}
            hasBudget={hasBudget}
            formatCurrency={formatCurrency}
            itemsLoggedThisMonth={itemsLoggedThisMonth}
            spendThisMonth={spendThisMonth}
            streakDays={streakDays}
            evolutionStage={evolutionStage}
            nextMilestone={nextMilestone}
            onSetupPlan={handleSetPlanPress}
          />

          {/* Achievement Badges Section */}
          <AchievementBadgesSection
            milestones={milestones?.milestones ?? []}
            currentStreak={streakDays}
          />

        </ScrollView>

        {showActions ? (
          <Pressable style={styles.fabBackdrop} onPress={() => setShowActions(false)}>
            <View />
          </Pressable>
        ) : null}

        <View style={[styles.fabStack, { right: 16, bottom: 28 }]}>
          {showActions ? (
            <View style={styles.fabMenuColumn}>
              <Pressable
                style={({ pressed }) => [styles.fabAction, pressed && styles.fabActionPressed]}
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
                <Text style={[styles.fabActionLabel, styles.fabActionLabelSecondary]}>
                  Add income
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.fab,
                pressed && styles.fabPressed,
              ]}
              onPress={() => setShowActions(true)}
            >
              <Text style={styles.fabIcon}>+</Text>
            </Pressable>
          )}
        </View>

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
    backgroundColor: colors.background,
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
    gap: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    color: colors.text,
  },
  fabBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: `${colors.text}33`,
  },
  fabStack: {
    position: "absolute",
    alignItems: "flex-end",
    gap: 8,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  fabPressed: {
    opacity: 0.9,
  },
  fabIcon: {
    color: colors.textLight,
    fontSize: 24,
    fontWeight: "800",
    marginTop: -2,
  },
  fabMenuColumn: {
    flexDirection: "column",
    gap: 6,
  },
  fabAction: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  fabActionSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  fabActionLabel: {
    color: colors.textLight,
    fontSize: 13,
    fontWeight: "700",
  },
  fabActionLabelSecondary: {
    color: colors.text,
  },
  fabActionPressed: {
    opacity: 0.85,
  },
});
