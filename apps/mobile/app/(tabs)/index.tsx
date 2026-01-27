import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
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
import { useTransactionRefresh } from "@/hooks/useTransactionRefresh";
import { useTabSafePadding } from "@/hooks/useTabSafePadding";

export default function OverviewScreen() {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { formatCurrency } = useCurrencyFormatter();
  const { bottomPadding } = useTabSafePadding();

  // Context data
  const { currentSnapshot, fetchSnapshot } = useInsightsContext();
  const { budgetPlan, refetch } = useBudgetContext();
  const { experience, milestones } = useExperience();
  const refreshTransactionData = useTransactionRefresh();

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
    milestones,
  );

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
      paddingBottom: bottomPadding,
      gap: 16,
    },
  });

  const handleSetPlanPress = () => {
    router.push("/(tabs)/insights");
  };

  const handleTransactionSuccess = useCallback(
    async (date: Date) => {
      await refreshTransactionData({ date });
    },
    [refreshTransactionData],
  );

  const handleRefresh = useCallback(async () => {
    if (refreshing) return; // Prevent concurrent refreshes

    setRefreshing(true);
    try {
      const currentMonth = currentSnapshot?.currentDate
        ? new Date(currentSnapshot.currentDate)
        : new Date();
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;

      await Promise.allSettled([
        refreshTransactionData({ date: currentMonth }),
        refetch(), // BudgetProvider
        fetchSnapshot(year, month), // InsightsProvider
      ]);
    } catch (error) {
      console.error("[Home] Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  }, [
    refreshing,
    currentSnapshot,
    refreshTransactionData,
    refetch,
    fetchSnapshot,
  ]);

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
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

        <AddExpenseModal
          visible={showAdd}
          onClose={() => setShowAdd(false)}
          onSuccess={handleTransactionSuccess}
        />
        <AddIncomeModal
          visible={showIncome}
          onClose={() => setShowIncome(false)}
          monthKey={currentSnapshot?.key ?? ""}
          currentDate={currentSnapshot?.currentDate ?? new Date().toISOString()}
          onSuccess={handleTransactionSuccess}
        />
      </SafeAreaView>
    </View>
  );
}
