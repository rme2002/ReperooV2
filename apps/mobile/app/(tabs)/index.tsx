import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors } from "@/constants/theme";

// Modals
import { AddExpenseModal } from "@/components/modals/AddExpenseModal";
import { AddIncomeModal } from "@/components/modals/AddIncomeModal";

// Contexts
import { useCurrencyFormatter } from "@/components/profile/useCurrencyFormatter";
import { useInsightsContext } from "@/components/insights/InsightsProvider";
import { useBudgetContext } from "@/components/budget/BudgetProvider";
import { useExperience } from "@/components/home/ExperienceProvider";

// Widgets
import { HomeHeader } from "@/components/home/widgets/HomeHeader";
import { HomeFAB } from "@/components/home/widgets/HomeFAB";

// Sections
import { BudgetHeroCard } from "@/components/home/BudgetHeroCard";
import { AchievementBadgesSection } from "@/components/home/AchievementBadgesSection";

// Custom hooks
import { useHomeBudget } from "@/hooks/useHomeBudget";
import { useHomeGamification } from "@/hooks/useHomeGamification";

export default function OverviewScreen() {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const { formatCurrency } = useCurrencyFormatter();

  // Context data
  const { currentSnapshot } = useInsightsContext();
  const { budgetPlan } = useBudgetContext();
  const { experience, milestones } = useExperience();

  // Budget metrics
  const {
    hasBudget,
    totalBudget,
    remainingBudget,
    itemsLoggedThisMonth,
    spendThisMonth,
  } = useHomeBudget(currentSnapshot, budgetPlan);

  // Gamification metrics
  const { streakDays, evolutionStage, nextMilestone } = useHomeGamification(
    experience,
    milestones
  );

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
          <HomeHeader />

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

          <AchievementBadgesSection
            milestones={milestones?.milestones ?? []}
            currentStreak={streakDays}
          />
        </ScrollView>

        <HomeFAB
          showActions={showActions}
          onToggleActions={() => setShowActions(!showActions)}
          onAddExpense={() => setShowAdd(true)}
          onAddIncome={() => setShowIncome(true)}
        />

        <AddExpenseModal visible={showAdd} onClose={() => setShowAdd(false)} />
        <AddIncomeModal
          visible={showIncome}
          onClose={() => setShowIncome(false)}
          monthKey={currentSnapshot?.key ?? ""}
          currentDate={currentSnapshot?.currentDate ?? new Date().toISOString()}
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
});
