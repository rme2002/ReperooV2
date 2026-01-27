import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  RefreshControl,
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
import { useTransactionRefresh } from "@/hooks/useTransactionRefresh";
import { useTabSafePadding } from "@/hooks/useTabSafePadding";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { buildCategoryLookup } from "@/utils/categoryLookup";

export default function InsightsScreen() {
  // Modal states
  const [showAdd, setShowAdd] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [showFabActions, setShowFabActions] = useState(false);

  // Interaction states
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Contexts
  const {
    currentSnapshot,
    isLoading: insightsLoading,
    error: insightsError,
    fetchSnapshot,
    refetchAvailableMonths,
    prefetchSnapshot,
    invalidateSnapshot,
  } = useInsightsContext();

  const {
    budgetPlan,
    isLoading,
    error,
    createBudgetPlan,
    updateBudgetPlan,
    refetch: refetchBudgetPlan,
  } = useBudgetContext();
  const { formatCurrency, currencySymbol } = useCurrencyFormatter();
  const refreshTransactionData = useTransactionRefresh();
  const { bottomPadding } = useTabSafePadding();
  const { expenseCategories } = useExpenseCategories();

  // Custom hooks
  const { selectedMonth, goPrevious, goNext } = useInsightsMonthNavigation();

  const budgetMetrics = useInsightsBudget(
    currentSnapshot,
    budgetPlan,
    formatCurrency,
  );

  const savingsMetrics = useInsightsSavings(
    currentSnapshot,
    budgetPlan,
    Boolean(budgetPlan),
  );

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
  const categoryLookup = useMemo(
    () => buildCategoryLookup(expenseCategories),
    [expenseCategories],
  );

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
      paddingTop: 22,
      paddingBottom: bottomPadding,
      gap: 14,
    },
  });

  // Fetch snapshot when month changes
  useEffect(() => {
    if (selectedMonth) {
      fetchSnapshot(selectedMonth.year, selectedMonth.month);
    }
  }, [selectedMonth, fetchSnapshot]);

  // Fetch budget plan when month changes
  useEffect(() => {
    if (selectedMonth) {
      refetchBudgetPlan({
        year: selectedMonth.year,
        month: selectedMonth.month,
      });
    }
  }, [refetchBudgetPlan, selectedMonth]);

  // Prefetch adjacent months
  useEffect(() => {
    if (currentSnapshot && selectedMonth) {
      const prevMonth =
        selectedMonth.month === 1
          ? { year: selectedMonth.year - 1, month: 12 }
          : { year: selectedMonth.year, month: selectedMonth.month - 1 };

      const nextMonth =
        selectedMonth.month === 12
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
      if (!selectedMonth) {
        return;
      }
      await createBudgetPlan(payload, {
        year: selectedMonth.year,
        month: selectedMonth.month,
      });
      setShowCreatePlanModal(false);
      await refetchAvailableMonths();
      await fetchSnapshot(selectedMonth.year, selectedMonth.month);
    } catch (err) {
      console.error("[Insights] Create plan error:", err);
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

  const handleTransactionSuccess = useCallback(
    async (date: Date) => {
      invalidateSnapshot(selectedMonth.year, selectedMonth.month);
      await Promise.allSettled([
        refreshTransactionData({ date }),
        fetchSnapshot(selectedMonth.year, selectedMonth.month),
        fetchMonthlyIncome(),
        refetchBudgetPlan({
          year: selectedMonth.year,
          month: selectedMonth.month,
        }),
      ]);
    },
    [
      fetchMonthlyIncome,
      fetchSnapshot,
      invalidateSnapshot,
      refetchBudgetPlan,
      refreshTransactionData,
      selectedMonth.month,
      selectedMonth.year,
    ],
  );

  const handleRefresh = useCallback(async () => {
    if (refreshing || !selectedMonth) return; // Prevent concurrent refreshes

    setRefreshing(true);
    try {
      invalidateSnapshot(selectedMonth.year, selectedMonth.month);
      await Promise.allSettled([
        fetchSnapshot(selectedMonth.year, selectedMonth.month),
        refetchBudgetPlan({
          year: selectedMonth.year,
          month: selectedMonth.month,
        }),
        fetchMonthlyIncome(),
        refreshTransactionData({
          date: new Date(selectedMonth.year, selectedMonth.month - 1),
        }),
      ]);
    } catch (error) {
      console.error("[Insights] Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  }, [
    refreshing,
    selectedMonth,
    invalidateSnapshot,
    fetchSnapshot,
    refetchBudgetPlan,
    fetchMonthlyIncome,
    refreshTransactionData,
  ]);

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
        <AddExpenseModal
          visible={showAdd}
          onClose={() => setShowAdd(false)}
          onSuccess={handleTransactionSuccess}
        />
      </>
    );
  }

  return (
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
          onUpdatePlan={(payload) =>
            updateBudgetPlan(payload, {
              year: selectedMonth.year,
              month: selectedMonth.month,
            })
          }
          onCreatePlan={(payload) =>
            createBudgetPlan(payload, {
              year: selectedMonth.year,
              month: selectedMonth.month,
            })
          }
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
          categoryLookup={categoryLookup}
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
          investmentsGoalPercentLabel={
            savingsMetrics.investmentsGoalPercentLabel
          }
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
          categoryLookup={categoryLookup}
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

      <AddExpenseModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={handleTransactionSuccess}
        expenseCategories={expenseCategories}
      />
      <AddIncomeModal
        visible={showIncome}
        onClose={() => setShowIncome(false)}
        monthKey={currentSnapshot.key ?? ""}
        currentDate={currentSnapshot.currentDate ?? new Date().toISOString()}
        onSuccess={handleTransactionSuccess}
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
