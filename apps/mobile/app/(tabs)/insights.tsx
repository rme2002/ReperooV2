import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

// Modals
import { AddExpenseModal } from "@/components/modals/AddExpenseModal";
import { AddIncomeModal } from "@/components/modals/AddIncomeModal";
import { CreateMonthlyPlanModal } from "@/components/modals/CreateMonthlyPlanModal";

// Contexts
import { useBudgetContext } from "@/components/budget/BudgetProvider";
import { useInsightsContext } from "@/components/insights/InsightsProvider";
import { useCurrencyFormatter } from "@/components/profile/useCurrencyFormatter";

// Loading and states
import { InsightsSkeletonLoader } from "@/components/insights/InsightsSkeletonLoader";
import { EmptyBudgetState } from "@/components/insights/states/EmptyBudgetState";
import { ErrorState } from "@/components/insights/states/ErrorState";
import { EmptyTransactionsState } from "@/components/insights/states/EmptyTransactionsState";

// Widgets
import { MonthNavigator } from "@/components/insights/widgets/MonthNavigator";
import { ActionFAB } from "@/components/widgets/ActionFAB";

// Section components
import { BudgetSummaryCard } from "@/components/insights/sections/BudgetSummaryCard";
import { BudgetPlanWidget } from "@/components/insights/sections/BudgetPlanWidget";
import { SpendingDonutChart } from "@/components/insights/sections/SpendingDonutChart";
import { SavingsProgressSection } from "@/components/insights/sections/SavingsProgressSection";
import { CategoryBreakdownSection } from "@/components/insights/sections/CategoryBreakdownSection";
import { WeeklySpendingChart } from "@/components/insights/sections/WeeklySpendingChart";

// Custom hooks
import { useInsightsMonthNavigation } from "@/hooks/useInsightsMonthNavigation";
import { useInsightsBudget } from "@/hooks/useInsightsBudget";
import { useInsightsSavings } from "@/hooks/useInsightsSavings";
import { useInsightsIncome } from "@/hooks/useInsightsIncome";
import { useInsightsWeekly } from "@/hooks/useInsightsWeekly";

export default function InsightsScreen() {
  // Modal states
  const [showAdd, setShowAdd] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [showFabActions, setShowFabActions] = useState(false);

  // Interaction states
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  // Contexts
  const {
    currentSnapshot,
    isLoading: insightsLoading,
    error: insightsError,
    fetchSnapshot,
    refetchAvailableMonths,
    prefetchSnapshot,
  } = useInsightsContext();

  const { budgetPlan, isLoading, error, createBudgetPlan, updateBudgetPlan } = useBudgetContext();
  const { formatCurrency, currencySymbol } = useCurrencyFormatter();

  // Custom hooks
  const { selectedMonth, goPrevious, goNext } = useInsightsMonthNavigation();

  const budgetMetrics = useInsightsBudget(currentSnapshot, budgetPlan, formatCurrency);

  const savingsMetrics = useInsightsSavings(currentSnapshot, budgetPlan, Boolean(budgetPlan));

  const {
    incomeTransactions,
    recurringTemplates,
    loading: loadingIncome,
    error: incomeError,
    refetch: fetchMonthlyIncome,
  } = useInsightsIncome(selectedMonth);

  const weeklyData = useInsightsWeekly(currentSnapshot, selectedMonth);

  // Responsive
  const { width } = useWindowDimensions();
  const scale = Math.min(Math.max(width / 375, 0.85), 1.25);

  // Fetch snapshot when month changes
  useEffect(() => {
    if (selectedMonth) {
      fetchSnapshot(selectedMonth.year, selectedMonth.month);
    }
  }, [selectedMonth, fetchSnapshot]);

  // Prefetch adjacent months
  useEffect(() => {
    if (currentSnapshot && selectedMonth) {
      const prevMonth = selectedMonth.month === 1
        ? { year: selectedMonth.year - 1, month: 12 }
        : { year: selectedMonth.year, month: selectedMonth.month - 1 };

      const nextMonth = selectedMonth.month === 12
        ? { year: selectedMonth.year + 1, month: 1 }
        : { year: selectedMonth.year, month: selectedMonth.month + 1 };

      prefetchSnapshot(prevMonth.year, prevMonth.month);
      prefetchSnapshot(nextMonth.year, nextMonth.month);
    }
  }, [currentSnapshot, selectedMonth, prefetchSnapshot]);

  // Reset active states when month changes
  useEffect(() => {
    setActiveCategoryId(null);
  }, [selectedMonth]);

  // Event handlers
  const handleCreatePlan = async (payload: {
    savings_goal: number | null;
    investment_goal: number | null;
  }) => {
    try {
      await createBudgetPlan(payload);
      setShowCreatePlanModal(false);
      await refetchAvailableMonths();
      await fetchSnapshot(selectedMonth.year, selectedMonth.month);
    } catch (err) {
      Alert.alert("Error", "Failed to create budget plan");
    }
  };

  const handleCategoryPress = (categoryId: string) => {
    setActiveCategoryId((prev) => (prev === categoryId ? null : categoryId));
  };

  const handleEditGoals = () => {
    // This would ideally scroll to or focus the budget plan widget
    // For now, it's a placeholder that could trigger a ref scroll
  };

  // Loading state
  if (insightsLoading) {
    return <InsightsSkeletonLoader />;
  }

  // No budget plan error state
  if (insightsError === "NO_BUDGET_PLAN") {
    return (
      <>
        <EmptyBudgetState onCreatePlan={() => setShowCreatePlanModal(true)} />
        <CreateMonthlyPlanModal
          visible={showCreatePlanModal}
          onClose={() => setShowCreatePlanModal(false)}
          onSubmit={handleCreatePlan}
          isSaving={false}
        />
      </>
    );
  }

  // Other error state
  if (insightsError) {
    return (
      <ErrorState
        onRetry={() => fetchSnapshot(selectedMonth.year, selectedMonth.month)}
      />
    );
  }

  // Empty state - no snapshot data
  if (!currentSnapshot) {
    return (
      <>
        <EmptyTransactionsState onAddTransaction={() => setShowAdd(true)} />
        <AddExpenseModal visible={showAdd} onClose={() => setShowAdd(false)} />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <MonthNavigator
          monthLabel={currentSnapshot.label}
          loggedDays={currentSnapshot.loggedDays}
          totalDays={currentSnapshot.totalDays}
          onPrevious={goPrevious}
          onNext={goNext}
        />

        <BudgetSummaryCard
          hasBudget={budgetMetrics.hasBudget}
          totalBudget={budgetMetrics.totalBudget}
          totalSpent={budgetMetrics.totalSpent}
          remainingBudget={budgetMetrics.remainingBudget}
          avgSpendRounded={budgetMetrics.avgSpendRounded}
          dailyPaceRounded={budgetMetrics.dailyPaceRounded}
          daysLeft={budgetMetrics.daysLeft}
          weeklyTotal={weeklyData.weeklyTotal}
          progressPercent={budgetMetrics.progressPercent}
          progressLabel={budgetMetrics.progressLabel}
          statusBadge={budgetMetrics.statusBadge}
          statusTone={budgetMetrics.statusTone}
          headlineAmount={budgetMetrics.headlineAmount}
          headlineSubtitle={budgetMetrics.headlineSubtitle}
          budgetHelperLabel={budgetMetrics.budgetHelperLabel}
          isLoading={isLoading}
          error={error}
          onCreatePlan={() => setShowCreatePlanModal(true)}
          formatCurrency={formatCurrency}
          scale={scale}
        />

        <BudgetPlanWidget
          budgetPlan={budgetPlan}
          expectedIncome={budgetMetrics.totalBudget}
          savingsGoal={savingsMetrics.savingsGoal}
          investmentsGoal={savingsMetrics.investmentsGoal}
          savingsActual={savingsMetrics.savingsActual}
          investmentsActual={savingsMetrics.investmentsActual}
          incomeTransactions={incomeTransactions}
          recurringTemplates={recurringTemplates}
          loadingIncome={loadingIncome}
          incomeError={incomeError}
          onRetryIncome={fetchMonthlyIncome}
          onUpdatePlan={updateBudgetPlan}
          onCreatePlan={createBudgetPlan}
          formatCurrency={formatCurrency}
          currencySymbol={currencySymbol}
          scale={scale}
          width={width}
        />

        <SpendingDonutChart
          categories={currentSnapshot.categories ?? []}
          totalSpent={currentSnapshot.totalSpent ?? 0}
          formatCurrency={formatCurrency}
          width={width}
        />

        <SavingsProgressSection
          savingsGoal={savingsMetrics.savingsGoal}
          investmentsGoal={savingsMetrics.investmentsGoal}
          savingsActual={savingsMetrics.savingsActual}
          investmentsActual={savingsMetrics.investmentsActual}
          savingsTotal={savingsMetrics.savingsTotal}
          savingsGoalPercent={savingsMetrics.savingsGoalPercent}
          investmentsGoalPercent={savingsMetrics.investmentsGoalPercent}
          savingsGoalPercentLabel={savingsMetrics.savingsGoalPercentLabel}
          investmentsGoalPercentLabel={savingsMetrics.investmentsGoalPercentLabel}
          hasSavingsSplit={savingsMetrics.hasSavingsSplit}
          savedShareWidth={savingsMetrics.savedShareWidth}
          investedShareWidth={savingsMetrics.investedShareWidth}
          hasBudget={budgetMetrics.hasBudget}
          shouldShowProgress={savingsMetrics.shouldShowProgress}
          shouldShowZeroGoalsState={savingsMetrics.shouldShowZeroGoalsState}
          formatCurrency={formatCurrency}
          currencySymbol={currencySymbol}
          onEditGoals={handleEditGoals}
          onCreatePlan={() => setShowCreatePlanModal(true)}
        />

        <CategoryBreakdownSection
          categories={currentSnapshot.categories ?? []}
          activeCategoryId={activeCategoryId}
          onCategoryPress={handleCategoryPress}
          formatCurrency={formatCurrency}
          width={width}
        />

        <WeeklySpendingChart
          weeklyPoints={weeklyData.weeklyPoints}
          weeklyTotal={weeklyData.weeklyTotal}
          weeklyScaleMax={weeklyData.weeklyScaleMax}
          weeklyAxisTicks={weeklyData.weeklyAxisTicks}
          hasWeeklySpending={weeklyData.hasWeeklySpending}
          isLoading={weeklyData.isLoading}
          activeWeekIndex={weeklyData.activeWeekIndex}
          setActiveWeekIndex={weeklyData.setActiveWeekIndex}
          formatCurrency={formatCurrency}
          width={width}
        />
      </ScrollView>

      <ActionFAB
        showActions={showFabActions}
        onToggleActions={setShowFabActions}
        onAddExpense={() => {
          setShowFabActions(false);
          setShowAdd(true);
        }}
        onAddIncome={() => {
          setShowFabActions(false);
          setShowIncome(true);
        }}
      />

      <AddExpenseModal visible={showAdd} onClose={() => setShowAdd(false)} />
      <AddIncomeModal
        visible={showIncome}
        onClose={() => setShowIncome(false)}
        monthKey={currentSnapshot.key ?? ""}
        currentDate={currentSnapshot.currentDate ?? new Date().toISOString()}
      />
      <CreateMonthlyPlanModal
        visible={showCreatePlanModal}
        onClose={() => setShowCreatePlanModal(false)}
        onSubmit={handleCreatePlan}
        isSaving={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 14,
  },
});
