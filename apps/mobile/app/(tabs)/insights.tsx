import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Circle, Svg } from "react-native-svg";

import spendingCategories from "../../../../shared/config/spending-categories.json";
import { AddExpenseModal } from "@/components/modals/AddExpenseModal";
import { AddIncomeModal } from "@/components/modals/AddIncomeModal";
import { CreateMonthlyPlanModal } from "@/components/modals/CreateMonthlyPlanModal";
import { useBudgetContext } from "@/components/budget/BudgetProvider";
import { useInsightsContext } from "@/components/insights/InsightsProvider";
import { InsightsSkeletonLoader } from "@/components/insights/InsightsSkeletonLoader";
import { useCurrencyFormatter } from "@/components/profile/useCurrencyFormatter";
import { IncomeBreakdownSection } from "@/components/budget/IncomeBreakdownSection";
import { listTransactions } from "@/lib/gen/transactions/transactions";
import { listRecurringTemplates } from "@/lib/gen/recurring-templates/recurring-templates";
import type { TransactionIncome } from "@/lib/gen/model/transactionIncome";
import type { RecurringTemplateIncome } from "@/lib/gen/model/recurringTemplateIncome";

type SpendingCategoriesConfig = {
  categories: {
    id: string;
    label: string;
    icon: string;
    subcategories?: { id: string; label: string }[];
  }[];
};

const categoryConfig: SpendingCategoriesConfig = spendingCategories;
const categoryLookup = new Map(categoryConfig.categories.map((category) => [category.id, category]));
const getCategoryLabel = (categoryId: string) => categoryLookup.get(categoryId)?.label ?? categoryId;
const getSubcategoryLabel = (categoryId: string, subcategoryId: string) =>
  categoryLookup
    .get(categoryId)
    ?.subcategories?.find((sub) => sub.id === subcategoryId)?.label ?? subcategoryId;

const fallbackSubcategoryColors = ["#dbeafe", "#e0e7ff", "#ede9fe", "#fce7f3", "#fef3c7", "#dcfce7", "#ccfbf1"];
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const SLIDER_MAX = 10000;
const SLIDER_STEP = 10;
const LINEAR_MAX = 200;
const LINEAR_PORTION = 0.5;

const formatNumber = (value: number) => value.toLocaleString("en-US");

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const sanitizeGoalValue = (value: number, maxValue = SLIDER_MAX) =>
  clamp(value, 0, maxValue);

const snapGoalValue = (value: number, maxValue = SLIDER_MAX) =>
  clamp(Math.round(value / SLIDER_STEP) * SLIDER_STEP, 0, maxValue);

const valueFromPercent = (percent: number, maxValue: number) => {
  const pct = clamp(percent, 0, 1);
  if (pct <= LINEAR_PORTION) {
    return (pct / LINEAR_PORTION) * LINEAR_MAX;
  }
  const t = (pct - LINEAR_PORTION) / (1 - LINEAR_PORTION);
  return LINEAR_MAX + (maxValue - LINEAR_MAX) * t * t;
};

const percentFromValue = (value: number, maxValue: number) => {
  const clamped = clamp(value, 0, maxValue);
  if (clamped <= LINEAR_MAX) {
    return (clamped / LINEAR_MAX) * LINEAR_PORTION;
  }
  const t = Math.sqrt((clamped - LINEAR_MAX) / (maxValue - LINEAR_MAX));
  return LINEAR_PORTION + t * (1 - LINEAR_PORTION);
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const niceNumber = (value: number, round: boolean) => {
  if (value <= 0) return 0;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  let niceFraction: number;

  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }

  return niceFraction * 10 ** exponent;
};

const computeAxisTicks = (maxValue: number) => {
  if (maxValue <= 0) {
    return [];
  }

  const niceStep = niceNumber(maxValue / 3, true) || 1;
  const niceMax = niceStep * Math.ceil(maxValue / niceStep);

  const ticks: number[] = [];
  for (let value = niceMax; value >= 0; value -= niceStep) {
    ticks.push(Math.round(value));
  }
  if (ticks[ticks.length - 1] !== 0) {
    ticks.push(0);
  }

  return ticks;
};

const formatDayWithSuffix = (value: number) => {
  const remainder = value % 10;
  const teens = value % 100;
  if (teens >= 11 && teens <= 13) {
    return `${value}th`;
  }
  if (remainder === 1) return `${value}st`;
  if (remainder === 2) return `${value}nd`;
  if (remainder === 3) return `${value}rd`;
  return `${value}th`;
};

const formatIncomeSchedule = (dateString: string) => {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return "Logged income";
  }
  const day = parsed.getDate();
  return `Monthly • ${formatDayWithSuffix(day)}`;
};

export default function InsightsScreen() {
  // Get current month (January 2026 as default)
  const getCurrentMonth = () => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [showAdd, setShowAdd] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeWeekIndex, setActiveWeekIndex] = useState<number | null>(null);
  const [isWeeklyLoading, setIsWeeklyLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const {
    availableMonths,
    currentSnapshot,
    isLoading: insightsLoading,
    error: insightsError,
    fetchSnapshot,
    refetchAvailableMonths,
    prefetchSnapshot,
  } = useInsightsContext();

  const { budgetPlan, isLoading, error, createBudgetPlan, updateBudgetPlan } = useBudgetContext();

  const snapshot = currentSnapshot;

  // Form state for budget plan
  const [planSavingsGoal, setPlanSavingsGoal] = useState(budgetPlan?.savings_goal ?? 0);
  const [planInvestmentsGoal, setPlanInvestmentsGoal] = useState(budgetPlan?.investment_goal ?? 0);

  // Edit mode state
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editingSavingsGoal, setEditingSavingsGoal] = useState(0);
  const [editingInvestmentsGoal, setEditingInvestmentsGoal] = useState(0);

  // Income breakdown state
  const [incomeTransactions, setIncomeTransactions] = useState<TransactionIncome[]>([]);
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringTemplateIncome[]>([]);
  const [loadingIncome, setLoadingIncome] = useState(false);
  const [incomeError, setIncomeError] = useState<string | null>(null);

  const { formatCurrency, currencySymbol } = useCurrencyFormatter();

  // Fetch snapshot when month changes
  useEffect(() => {
    if (selectedMonth) {
      fetchSnapshot(selectedMonth.year, selectedMonth.month);
    }
  }, [selectedMonth, fetchSnapshot]);

  // Prefetch adjacent months after current snapshot loads
  useEffect(() => {
    if (currentSnapshot && selectedMonth) {
      // Calculate previous month
      const prevMonth = selectedMonth.month === 1
        ? { year: selectedMonth.year - 1, month: 12 }
        : { year: selectedMonth.year, month: selectedMonth.month - 1 };

      // Calculate next month
      const nextMonth = selectedMonth.month === 12
        ? { year: selectedMonth.year + 1, month: 1 }
        : { year: selectedMonth.year, month: selectedMonth.month + 1 };

      // Prefetch in background
      prefetchSnapshot(prevMonth.year, prevMonth.month);
      prefetchSnapshot(nextMonth.year, nextMonth.month);
    }
  }, [currentSnapshot, selectedMonth, prefetchSnapshot]);

  // Sync form state when budget plan changes
  useEffect(() => {
    if (budgetPlan) {
      setPlanSavingsGoal(budgetPlan.savings_goal ?? 0);
      setPlanInvestmentsGoal(budgetPlan.investment_goal ?? 0);
    }
  }, [budgetPlan]);
  const { width } = useWindowDimensions();
  const fabSize = Math.max(52, Math.min(64, width * 0.16));
  const scale = Math.min(Math.max(width / 375, 0.85), 1.25);
  const cardPadding = 16 * scale;
  const cardGap = 12 * scale;
  const progressHeight = Math.max(8, 10 * scale);
  const fontFactor = scale;
  const weeklyChartHeight = Math.min(320, Math.max(200, width * 0.55));
  const weeklyAxisWidth = Math.min(84, Math.max(56, width * 0.16));
  const weeklyTooltipWidth = Math.min(160, Math.max(110, width * 0.32));

  const monthCurrentDate = useMemo(() => {
    if (!snapshot?.currentDate) {
      const fallback = new Date();
      fallback.setHours(0, 0, 0, 0);
      return fallback;
    }
    const date = new Date(snapshot.currentDate);
    if (Number.isNaN(date.getTime())) {
      const fallback = new Date();
      fallback.setHours(0, 0, 0, 0);
      return fallback;
    }
    date.setHours(0, 0, 0, 0);
    return date;
  }, [snapshot?.currentDate]);

  // Use expected_income from budget plan
  const hasBudget = Boolean(budgetPlan);
  const totalBudget = budgetPlan?.expected_income ?? 0;
  const totalSpent = snapshot?.totalSpent ?? 0;
  const remainingBudget = totalBudget - totalSpent;
  const budgetHelperLabel = hasBudget ? "Based on recurring income" : null;
  const daysLeftInMonth = useMemo(() => {
    const endOfMonth = new Date(monthCurrentDate);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
    endOfMonth.setHours(0, 0, 0, 0);
    const diff = endOfMonth.getTime() - monthCurrentDate.getTime();
    if (diff < 0) {
      return 0;
    }
    return Math.floor(diff / DAY_IN_MS) + 1;
  }, [monthCurrentDate]);
  const safeDaysLeft = Math.max(daysLeftInMonth, 0);
  const avgSpendPerDay = snapshot?.loggedDays ? totalSpent / snapshot.loggedDays : totalSpent;
  const avgSpendRounded = Math.round(avgSpendPerDay);
  const dailyPace = safeDaysLeft > 0 ? remainingBudget / safeDaysLeft : 0;
  const dailyPaceRounded = safeDaysLeft > 0 ? Math.round(dailyPace) : 0;
  let statusBadgeLabel: "On track" | "Attention" | "Risk" | "Set budget" = "Set budget";
  let badgeTone = styles.badgeNeutral;
  let badgeTextTone = styles.badgeTextNeutral;
  if (hasBudget) {
    if (remainingBudget < 0) {
      statusBadgeLabel = "Risk";
      badgeTone = styles.badgeDanger;
      badgeTextTone = styles.badgeTextDanger;
    } else if (avgSpendPerDay > dailyPace) {
      statusBadgeLabel = "Attention";
      badgeTone = styles.badgeWarn;
      badgeTextTone = styles.badgeTextWarn;
    } else {
      statusBadgeLabel = "On track";
      badgeTone = styles.badgePositive;
      badgeTextTone = styles.badgeTextPositive;
    }
  }
  const progressUsedPct =
    hasBudget && totalBudget > 0 ? Math.min(Math.max(totalSpent / totalBudget, 0), 1) : 0;
  const progressLabel = `${Math.round(progressUsedPct * 100)}% of budget used`;
  const headlineAmount = hasBudget ? formatCurrency(remainingBudget) : "Budget not set";
  const headlineSubtitle = hasBudget ? "projected left" : "Create a budget plan";

  // Budget plan form values
  const handleSavingsGoalChange = useCallback(
    (next: number) => {
      setPlanSavingsGoal(sanitizeGoalValue(next));
    },
    [],
  );
  const handleInvestmentsGoalChange = useCallback(
    (next: number) => {
      setPlanInvestmentsGoal(sanitizeGoalValue(next));
    },
    [],
  );
  const handlePlanSave = async () => {
    try {
      setIsSaving(true);
      const payload = {
        savings_goal: planSavingsGoal || null,
        investment_goal: planInvestmentsGoal || null,
      };
      await updateBudgetPlan(payload);
    } catch (err) {
      console.error("Failed to save budget plan:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreatePlan = async (payload: {
    savings_goal: number | null;
    investment_goal: number | null;
  }) => {
    try {
      setIsSaving(true);
      await createBudgetPlan(payload);
    } catch (err) {
      console.error("Failed to create budget plan:", err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // Edit mode handlers
  const handleEditPlan = () => {
    setEditingSavingsGoal(planSavingsGoal);
    setEditingInvestmentsGoal(planInvestmentsGoal);
    setIsEditingPlan(true);
  };

  const handleCancelEdit = () => {
    setIsEditingPlan(false);
    setEditingSavingsGoal(0);
    setEditingInvestmentsGoal(0);
  };

  const handleSavePlanChanges = async () => {
    setIsSaving(true);
    try {
      if (budgetPlan) {
        await updateBudgetPlan({
          savings_goal: editingSavingsGoal || null,
          investment_goal: editingInvestmentsGoal || null,
        });
        // Update display state after successful save
        setPlanSavingsGoal(editingSavingsGoal);
        setPlanInvestmentsGoal(editingInvestmentsGoal);
        setIsEditingPlan(false);
      } else {
        // Creating new plan
        await createBudgetPlan({
          savings_goal: editingSavingsGoal || null,
          investment_goal: editingInvestmentsGoal || null,
        });
        setIsEditingPlan(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save budget plan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateFromEmpty = () => {
    setEditingSavingsGoal(0);
    setEditingInvestmentsGoal(0);
    setIsEditingPlan(true);
  };

  // Fetch monthly income transactions
  const fetchMonthlyIncome = useCallback(async () => {
    setLoadingIncome(true);
    setIncomeError(null);

    try {
      const year = monthCurrentDate.getFullYear();
      const month = monthCurrentDate.getMonth();
      const start_date = new Date(year, month, 1).toISOString();
      const end_date = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      const [transactionsRes, templatesRes] = await Promise.all([
        listTransactions({ start_date, end_date }),
        listRecurringTemplates(),
      ]);

      if (transactionsRes.status === 200 && templatesRes.status === 200) {
        const incomeOnly = transactionsRes.data.filter(
          (tx) => tx.type === "income"
        ) as TransactionIncome[];
        const incomeTemplates = templatesRes.data.filter(
          (template) => template.type === "income"
        ) as RecurringTemplateIncome[];

        setIncomeTransactions(incomeOnly);
        setRecurringTemplates(incomeTemplates);
      } else {
        throw new Error("Failed to fetch data");
      }
    } catch (error) {
      console.error("Failed to load income data:", error);
      setIncomeError("Failed to load income data");
    } finally {
      setLoadingIncome(false);
    }
  }, [monthCurrentDate]);

  // Fetch income data when month changes
  useEffect(() => {
    fetchMonthlyIncome();
  }, [fetchMonthlyIncome]);

  // Budget plan summary values (needed by handlers below)
  const planSummaryAmount = budgetPlan?.expected_income ?? 0;
  const editingGoalsTotal = editingSavingsGoal + editingInvestmentsGoal;
  const editingExceedsIncome = planSummaryAmount > 0 && editingGoalsTotal > planSummaryAmount;

  // Handlers for editing state goal changes
  const handleEditingSavingsGoalChange = useCallback((value: number) => {
    setEditingSavingsGoal(sanitizeGoalValue(value));
  }, []);

  const handleEditingInvestmentsGoalChange = useCallback((value: number) => {
    setEditingInvestmentsGoal(sanitizeGoalValue(value));
  }, []);

  const weeklyPoints = snapshot?.weekly ?? [];
  const weeklyTotals = weeklyPoints.map((point) => point.total);
  const weeklyPeak = weeklyTotals.length ? Math.max(...weeklyTotals) : 0;
  const weeklyMax = Math.max(weeklyPeak, 1);
  const weeklyTotal = weeklyTotals.reduce((sum, value) => sum + value, 0);
  const hasWeeklySpending = weeklyTotals.some((value) => value > 0);
  const displayWeeklyPoints = weeklyPoints;
  const weeklyAxisTicks = hasWeeklySpending ? computeAxisTicks(weeklyPeak) : [];
  const weeklyScaleMax = (weeklyAxisTicks[0] ?? weeklyMax) || 1;

  // Budget plan summary values
  const planSummarySavings = budgetPlan?.savings_goal ?? 0;
  const planSummaryInvestments = budgetPlan?.investment_goal ?? 0;
  const planGoalsPositive = (planSummarySavings > 0 || planSummaryInvestments > 0);
  const planGoalsZero = hasBudget && planSummarySavings === 0 && planSummaryInvestments === 0;
  const planSummaryGoals = planSummarySavings + planSummaryInvestments;
  const planSummaryExceedsIncome = planSummaryAmount > 0 && planSummaryGoals > planSummaryAmount;
  const planSummarySpendable = Math.max(planSummaryAmount - planSummaryGoals, 0);
  const compactPlanSummary = width < 380;

  const goPrev = () => {
    // Go to previous month
    const prevMonth = selectedMonth.month === 1
      ? { year: selectedMonth.year - 1, month: 12 }
      : { year: selectedMonth.year, month: selectedMonth.month - 1 };
    setSelectedMonth(prevMonth);
  };

  const goNext = () => {
    // Go to next month
    const nextMonth = selectedMonth.month === 12
      ? { year: selectedMonth.year + 1, month: 1 }
      : { year: selectedMonth.year, month: selectedMonth.month + 1 };
    setSelectedMonth(nextMonth);
  };

  useEffect(() => {
    setActiveCategoryId(null);
    setActiveWeekIndex(null);
    setIsWeeklyLoading(true);
    const timer = setTimeout(() => setIsWeeklyLoading(false), 360);
    return () => clearTimeout(timer);
  }, [selectedMonth]);

  const handleCategoryPress = (categoryId: string) => {
    setActiveCategoryId((prev) => (prev === categoryId ? null : categoryId));
  };

  const savingsActual = snapshot?.savings?.saved ?? 0;
  const investmentsActual = snapshot?.savings?.invested ?? 0;
  const savingsTotal = savingsActual + investmentsActual;
  const hasSavingsSplit = savingsTotal > 0;
  const savedShareWidth = hasSavingsSplit ? (savingsActual / savingsTotal) * 100 : 0;
  const investedShareWidth = hasSavingsSplit ? (investmentsActual / savingsTotal) * 100 : 0;
  const savingsGoalPercentRaw = planSummarySavings > 0 ? (savingsActual / planSummarySavings) * 100 : 0;
  const investmentsGoalPercentRaw =
    planSummaryInvestments > 0 ? (investmentsActual / planSummaryInvestments) * 100 : 0;
  const savingsGoalPercent = Math.min(Math.max(savingsGoalPercentRaw, 0), 100);
  const investmentsGoalPercent = Math.min(Math.max(investmentsGoalPercentRaw, 0), 100);
  const savingsGoalPercentLabel =
    planSummarySavings > 0 ? Math.max(0, Math.round(savingsGoalPercentRaw)) : 0;
  const investmentsGoalPercentLabel =
    planSummaryInvestments > 0 ? Math.max(0, Math.round(investmentsGoalPercentRaw)) : 0;
  const shouldShowSavingsProgress = planGoalsPositive;
  const shouldShowZeroGoalsState = !planGoalsPositive && planGoalsZero;

  const chartSize = Math.max(200, Math.min(width - 48, 260));
  const pieStroke = Math.max(14, chartSize * 0.12);
  const pieRadius = chartSize / 2 - pieStroke / 2;
  const centerSize = chartSize * 0.56;
  const circumference = 2 * Math.PI * pieRadius;
  const pieSegments = (snapshot?.categories ?? []).reduce<
    { length: number; offset: number; color: string; id: string; label: string }[]
  >((acc, cat) => {
    const prevTotal = acc.reduce((sum, item) => sum + item.length, 0);
    const length = (cat.percent / 100) * circumference;
    const offset = prevTotal;
    return [...acc, { length, offset, color: cat.color, id: cat.id, label: getCategoryLabel(cat.id) }];
  }, []);

  // Loading state
  if (insightsLoading) {
    return <InsightsSkeletonLoader />;
  }

  // No budget plan error state
  if (insightsError === "NO_BUDGET_PLAN") {
    const handleCreatePlan = async (payload: { savings_goal: number | null; investment_goal: number | null }) => {
      try {
        await createBudgetPlan({
          savings_goal: payload.savings_goal,
          investment_goal: payload.investment_goal,
        });
        setShowCreatePlanModal(false);
        // Refetch insights after creating plan
        await refetchAvailableMonths();
        await fetchSnapshot(selectedMonth.year, selectedMonth.month);
      } catch (err) {
        Alert.alert("Error", "Failed to create budget plan");
      }
    };

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.emptyTitle}>Create a Budget Plan</Text>
          <Text style={styles.emptyCopy}>Set up your budget plan to see insights about your spending</Text>
          <Pressable style={styles.primaryButton} onPress={() => setShowCreatePlanModal(true)}>
            <Text style={styles.primaryButtonText}>Create Plan</Text>
          </Pressable>
        </View>
        <CreateMonthlyPlanModal
          visible={showCreatePlanModal}
          onClose={() => setShowCreatePlanModal(false)}
          onSubmit={handleCreatePlan}
          isSaving={isSaving}
        />
      </SafeAreaView>
    );
  }

  // Other error state
  if (insightsError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.emptyTitle}>Error loading insights</Text>
          <Text style={styles.emptyCopy}>We couldn't load your insights data. Please try again.</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => fetchSnapshot(selectedMonth.year, selectedMonth.month)}
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state - no snapshot data
  if (!currentSnapshot) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <Text style={styles.emptyCopy}>You haven't logged any transactions for this month</Text>
          <Pressable style={styles.primaryButton} onPress={() => setShowAdd(true)}>
            <Text style={styles.primaryButtonText}>Add Transaction</Text>
          </Pressable>
        </View>
        <AddExpenseModal visible={showAdd} onClose={() => setShowAdd(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={goPrev} style={styles.navButton}>
            <Text style={styles.navIcon}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.monthLabel}>{snapshot?.label}</Text>
            <Text style={styles.subText}>
              Logged {snapshot?.loggedDays}/{snapshot?.totalDays} days
            </Text>
          </View>
          <Pressable onPress={goNext} style={styles.navButton}>
            <Text style={styles.navIcon}>›</Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.surface,
            styles.summaryCard,
            {
              paddingHorizontal: Math.max(20, cardPadding + 4),
              paddingVertical: Math.max(20, cardPadding + 2),
              gap: cardGap + 2,
            },
          ]}
        >
          <View style={styles.insightWidget}>
            <View style={styles.summaryTopRow}>
              <Text style={styles.summaryTitle}>Left this month</Text>
              <View style={styles.summaryHeaderActions}>
                <View style={[styles.badge, styles.summaryBadge, badgeTone]}>
                  <Text style={[styles.badgeText, badgeTextTone]}>{statusBadgeLabel}</Text>
                </View>
              </View>
            </View>
            <View style={styles.headlineBlock}>
              <Text style={[styles.remainingValue, { fontSize: 34 * fontFactor }]}>{headlineAmount}</Text>
              <View style={styles.headlineSubtitleBlock}>
                <Text style={[styles.headlineSubtitle, { fontSize: 28 * fontFactor }]}>{headlineSubtitle}</Text>
                {budgetHelperLabel ? (
                  <Text style={[styles.planHelper, { fontSize: Math.max(13, 12 * fontFactor) }]}>{budgetHelperLabel}</Text>
                ) : null}
              </View>
            </View>
            {hasBudget ? (
              <>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryCol}>
                    <Text style={styles.metricHelper}>Expected income</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(totalBudget)}</Text>
                    <Text style={[styles.summaryMeta, styles.summaryMetaLabel]}>
                      From recurring income
                    </Text>
                  </View>
                  <View style={styles.summaryCol}>
                    <Text style={styles.metricHelper}>Total spent</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(totalSpent)}</Text>
                  </View>
                </View>
                <View style={[styles.progressStack, { marginTop: 12 * scale }]}>
                    <View style={[styles.progressTrack, { height: progressHeight }]}>
                      <View style={[styles.progressFill, { width: `${progressUsedPct * 100}%` }]} />
                    </View>
                    <Text style={styles.summaryMeta}>{progressLabel}</Text>
                  </View>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryCol}>
                    <Text style={styles.metricHelper}>Avg spend / day</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(avgSpendRounded)} / day</Text>
                  </View>
                  <View style={styles.summaryCol}>
                    <Text style={styles.metricHelper}>Daily pace</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(dailyPaceRounded)} / day</Text>
                    <Text style={styles.summaryHint}>
                      {`${formatCurrency(remainingBudget)} left · ${safeDaysLeft}d`}
                    </Text>
                  </View>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryFooter}>
                  <View>
                    <Text style={styles.metricHelper}>Last 7 days</Text>
                  </View>
                  <Text style={styles.summaryValue}>{formatCurrency(weeklyTotal)}</Text>
                </View>
              </>
            ) : isLoading ? (
              <View style={styles.summaryEmpty}>
                <Text style={styles.summaryEmptyTitle}>Loading budget plan...</Text>
              </View>
            ) : (
              <View style={styles.summaryEmpty}>
                <Text style={styles.summaryEmptyTitle}>Set up your budget</Text>
                <Text style={styles.summaryEmptyCopy}>
                  Create a monthly plan with savings and investment goals to track your spending.
                </Text>
                <View style={styles.summaryEmptyActions}>
                  <Pressable
                    style={styles.summaryPrimaryButton}
                    onPress={() => setShowCreatePlanModal(true)}
                  >
                    <Text style={styles.summaryPrimaryText}>
                      Create monthly plan
                    </Text>
                  </Pressable>
                </View>
                {error ? (
                  <Text style={styles.errorText}>{error}</Text>
                ) : null}
              </View>
            )}
          </View>
        </View>

        <View style={[styles.surface, styles.planCard]}>
          <View style={styles.planWidget}>
            {/* Header */}
            <View style={styles.planWidgetHeader}>
              <View>
                <Text style={styles.planFormTitle}>Budget Plan</Text>
                <Text style={styles.planFormSubtitle}>
                  {budgetPlan ? 'Expected income + goal allocations' : 'Set up your monthly budget'}
                </Text>
              </View>
            </View>

            {/* Case 1: No Budget Plan (Empty State) */}
            {!budgetPlan && !isEditingPlan && (
              <View style={styles.emptyPlanState}>
                <Text style={styles.emptyStateText}>
                  Create a budget plan to track your savings and investment goals
                </Text>
                <Pressable
                  style={styles.createPlanButton}
                  onPress={handleCreateFromEmpty}
                >
                  <Text style={styles.createPlanButtonText}>Create Plan</Text>
                </Pressable>
              </View>
            )}

            {/* Case 2: View Mode (Plan Exists, Not Editing) */}
            {budgetPlan && !isEditingPlan && (
              <>
                {/* Summary Card */}
                <View style={styles.planSummaryCard}>
                  <View style={[styles.planSummaryRow, styles.planSummaryRowFirst]}>
                    <View>
                      <Text style={styles.planSummaryLabel}>Expected income</Text>
                      <Text style={styles.planSummaryMeta}>From recurring income</Text>
                    </View>
                    <Text
                      style={[
                        styles.planSummaryValue,
                        compactPlanSummary && styles.planSummaryValueCompact,
                      ]}
                    >
                      {formatCurrency(planSummaryAmount)}
                    </Text>
                  </View>
                  <View style={styles.planSummaryDivider} />
                  <View style={styles.planSummaryRow}>
                    <View>
                      <Text style={styles.planSummaryLabel}>Goals</Text>
                      <Text style={styles.planSummaryMeta}>
                        Savings {formatCurrency(planSavingsGoal)} · Investments{" "}
                        {formatCurrency(planInvestmentsGoal)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.planSummaryValue,
                        compactPlanSummary && styles.planSummaryValueCompact,
                      ]}
                    >
                      {formatCurrency(planSavingsGoal + planInvestmentsGoal)}
                    </Text>
                  </View>
                  <View style={styles.planSummaryDivider} />
                  <View style={styles.planSummaryRow}>
                    <View>
                      <Text style={styles.planSummaryLabel}>Spendable</Text>
                      <Text style={styles.planSummaryMeta}>Income - Goals</Text>
                    </View>
                    <Text
                      style={[
                        styles.planSummaryValue,
                        styles.planSummaryValueAccent,
                        compactPlanSummary && styles.planSummaryValueCompact,
                      ]}
                    >
                      {formatCurrency(planSummarySpendable)}
                    </Text>
                  </View>
                </View>

                {/* Income Breakdown Section */}
                <IncomeBreakdownSection
                  transactions={incomeTransactions}
                  recurringTemplates={recurringTemplates}
                  loading={loadingIncome}
                  error={incomeError}
                  formatCurrency={formatCurrency}
                  onRetry={fetchMonthlyIncome}
                  scale={scale}
                />

                {/* Read-Only Goal Display */}
                <View style={styles.planSection}>
                  <Text style={styles.planSectionTitle}>Goal allocations</Text>

                  <GoalDisplayBar
                    label="Savings goal"
                    value={planSummarySavings}
                    max={planSummaryAmount}
                    actual={savingsActual}
                    showProgress={true}
                    formatValue={(val) => formatCurrency(val)}
                  />

                  <GoalDisplayBar
                    label="Investments goal"
                    value={planSummaryInvestments}
                    max={planSummaryAmount}
                    actual={investmentsActual}
                    showProgress={true}
                    formatValue={(val) => formatCurrency(val)}
                  />
                </View>
                {planSummaryExceedsIncome && (
                  <View style={styles.planWarning}>
                    <Text style={styles.planWarningTitle}>Goals exceed expected income</Text>
                    <Text style={styles.planWarningCopy}>
                      Your goals total {formatCurrency(planSummaryGoals)} which is above expected income{" "}
                      {formatCurrency(planSummaryAmount)}.
                    </Text>
                  </View>
                )}

                {/* Edit Button */}
                <Pressable
                  style={styles.planEditButton}
                  onPress={handleEditPlan}
                >
                  <Text style={styles.planEditButtonText}>Edit</Text>
                </Pressable>
              </>
            )}

            {/* Case 3: Edit Mode (Creating or Editing) */}
            {isEditingPlan && (
              <>
                {/* Summary Card (if plan exists) */}
                {budgetPlan && (
                  <View style={styles.planSummaryCard}>
                    <View style={[styles.planSummaryRow, styles.planSummaryRowFirst]}>
                      <View>
                        <Text style={styles.planSummaryLabel}>Expected income</Text>
                        <Text style={styles.planSummaryMeta}>From recurring income</Text>
                      </View>
                      <Text
                        style={[
                          styles.planSummaryValue,
                          compactPlanSummary && styles.planSummaryValueCompact,
                        ]}
                      >
                        {formatCurrency(planSummaryAmount)}
                      </Text>
                    </View>
                    <View style={styles.planSummaryDivider} />
                    <View style={styles.planSummaryRow}>
                      <View>
                        <Text style={styles.planSummaryLabel}>Goals</Text>
                        <Text style={styles.planSummaryMeta}>
                          Savings {formatCurrency(editingSavingsGoal)} · Investments{" "}
                          {formatCurrency(editingInvestmentsGoal)}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.planSummaryValue,
                          compactPlanSummary && styles.planSummaryValueCompact,
                        ]}
                      >
                        {formatCurrency(editingSavingsGoal + editingInvestmentsGoal)}
                      </Text>
                    </View>
                    <View style={styles.planSummaryDivider} />
                    <View style={styles.planSummaryRow}>
                      <View>
                        <Text style={styles.planSummaryLabel}>Spendable</Text>
                        <Text style={styles.planSummaryMeta}>Income - Goals</Text>
                      </View>
                      <Text
                        style={[
                          styles.planSummaryValue,
                          styles.planSummaryValueAccent,
                          compactPlanSummary && styles.planSummaryValueCompact,
                        ]}
                      >
                        {formatCurrency(planSummaryAmount - editingSavingsGoal - editingInvestmentsGoal)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Interactive Goal Sliders */}
                <View style={styles.planSection}>
                  <Text style={styles.planSectionTitle}>Goal allocations</Text>

                  <GoalSlider
                    label="Savings goal"
                    value={editingSavingsGoal}
                    max={SLIDER_MAX}
                    onChange={handleEditingSavingsGoalChange}
                    currencySymbol={currencySymbol}
                    formatValue={(val) => `${formatCurrency(val)} / month`}
                  />

                  <GoalSlider
                    label="Investments goal"
                    value={editingInvestmentsGoal}
                    max={SLIDER_MAX}
                    onChange={handleEditingInvestmentsGoalChange}
                    currencySymbol={currencySymbol}
                    formatValue={(val) => `${formatCurrency(val)} / month`}
                  />
                </View>
                {editingExceedsIncome && (
                  <View style={styles.planWarning}>
                    <Text style={styles.planWarningTitle}>Goals exceed expected income</Text>
                    <Text style={styles.planWarningCopy}>
                      Your goals total {formatCurrency(editingGoalsTotal)} which is above expected income{" "}
                      {formatCurrency(planSummaryAmount)}.
                    </Text>
                  </View>
                )}

                {/* Save and Cancel Buttons */}
                <View style={styles.planEditActions}>
                  <Pressable
                    style={[styles.planActionButton, styles.planCancelButton]}
                    onPress={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <Text style={styles.planCancelButtonText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.planActionButton, styles.planSaveButton]}
                    onPress={handleSavePlanChanges}
                    disabled={isSaving}
                  >
                    <Text style={styles.planSaveButtonText}>
                      {isSaving ? 'Saving...' : 'Save changes'}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.surface, { padding: cardPadding, gap: cardGap }]}>
          <View style={styles.sectionHeaderCentered}>
            <Text style={styles.sectionTitle}>Where your money went</Text>
            <Text style={styles.subText}>Spending by category for this month</Text>
          </View>
          <View style={styles.donutRow}>
            <View style={[styles.donut, { width: chartSize, height: chartSize }]}>
              <Svg width={chartSize} height={chartSize} style={styles.svg}>
                <Circle
                  cx={chartSize / 2}
                  cy={chartSize / 2}
                  r={pieRadius}
                  stroke="#f3ede1"
                  strokeWidth={pieStroke}
                  fill="none"
                />
                {pieSegments.map((segment) => (
                  <Circle
                    key={`donut-segment-${segment.id}`}
                    cx={chartSize / 2}
                    cy={chartSize / 2}
                    r={pieRadius}
                    stroke={segment.color}
                    strokeWidth={pieStroke}
                    strokeDasharray={`${segment.length} ${circumference}`}
                    strokeDashoffset={-segment.offset}
                    strokeLinecap="butt"
                    fill="none"
                    rotation={-90}
                    originX={chartSize / 2}
                    originY={chartSize / 2}
                  />
                ))}
              </Svg>
              <View
                style={[
                  styles.donutCenter,
                  { width: centerSize, height: centerSize, borderRadius: centerSize / 2 },
                ]}
              >
                <Text style={styles.donutValue}>{formatCurrency(snapshot?.totalSpent ?? 0)}</Text>
                <Text style={styles.donutLabel}>This month</Text>
              </View>
            </View>
          <View style={styles.legendColumns}>
            {(() => {
              const categories = snapshot?.categories ?? [];
              const mid = Math.ceil(categories.length / 2);
              const left = categories.slice(0, mid);
              const right = categories.slice(mid);
              return (
                <>
                  <View style={styles.legendColumn}>
                    {left.map((cat) => {
                      const label = getCategoryLabel(cat.id);
                      return (
                        <View key={`legend-left-${cat.id}`} style={styles.legendRow}>
                          <View style={styles.legendLeft}>
                            <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                            <Text style={styles.legendLabel}>{label}</Text>
                          </View>
                          <Text style={styles.legendPercent}>{cat.percent}%</Text>
                        </View>
                      );
                    })}
                  </View>
                  <View style={styles.legendColumn}>
                    {right.map((cat) => {
                      const label = getCategoryLabel(cat.id);
                      return (
                        <View key={`legend-right-${cat.id}`} style={styles.legendRow}>
                          <View style={styles.legendLeft}>
                            <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                            <Text style={styles.legendLabel}>{label}</Text>
                          </View>
                          <Text style={styles.legendPercent}>{cat.percent}%</Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              );
            })()}
          </View>
          </View>
        </View>

        <View style={styles.surface}>
          <View style={styles.sectionHeaderStacked}>
            <Text style={styles.sectionTitle}>Savings & investments</Text>
            <Text style={styles.subText}>Money moved toward your future this month</Text>
          </View>
          {shouldShowSavingsProgress ? (
            <>
              <View style={styles.savingsProgressGroup}>
                <View style={styles.progressRow}>
                  <View style={styles.progressLabelBlock}>
                    <View style={styles.savingsLegendRow}>
                      <View style={[styles.savingsLegendDot, styles.savingsLegendSaved]} />
                      <Text style={styles.progressLabel}>Savings goal</Text>
                    </View>
                    <Text style={styles.progressSub}>
                      {formatCurrency(savingsActual)} of {formatCurrency(planSummarySavings)}
                    </Text>
                  </View>
                  <Text style={styles.progressValue}>
                    {planSummarySavings > 0 ? `${savingsGoalPercentLabel}%` : "0%"}
                  </Text>
                </View>
                <View style={[styles.progressTrack, styles.progressMuted, styles.savingsTrack]}>
                  <View
                    style={[
                      styles.progressFill,
                      styles.savingsFillPrimary,
                      { width: `${savingsGoalPercent}%` },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.savingsProgressGroup}>
                <View style={styles.progressRow}>
                  <View style={styles.progressLabelBlock}>
                    <View style={styles.savingsLegendRow}>
                      <View style={[styles.savingsLegendDot, styles.savingsLegendInvested]} />
                      <Text style={styles.progressLabel}>Investments goal</Text>
                    </View>
                    <Text style={styles.progressSub}>
                      {formatCurrency(investmentsActual)} of {formatCurrency(planSummaryInvestments)}
                    </Text>
                  </View>
                  <Text style={styles.progressValue}>
                    {planSummaryInvestments > 0 ? `${investmentsGoalPercentLabel}%` : "0%"}
                  </Text>
                </View>
                <View style={[styles.progressTrack, styles.progressMuted, styles.savingsTrack]}>
                  <View
                    style={[
                      styles.progressFill,
                      styles.progressInvested,
                      { width: `${investmentsGoalPercent}%` },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.savingsProgressGroup}>
                <View style={styles.progressRow}>
                  <View style={styles.progressLabelBlock}>
                    <Text style={styles.progressLabel}>Savings mix</Text>
                    <Text style={styles.progressSub}>Share of this month&apos;s contributions</Text>
                  </View>
                  <Text style={styles.progressValue}>
                    {hasSavingsSplit
                      ? `${Math.round(savedShareWidth)}% / ${Math.round(investedShareWidth)}%`
                      : "0% / 0%"}
                  </Text>
                </View>
                <View
                  style={[styles.progressTrack, styles.progressMuted, styles.savingsTrack, styles.savingsCombinedTrack]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      styles.savingsFillPrimary,
                      { width: `${savedShareWidth}%` },
                    ]}
                  />
                  <View
                    style={[
                      styles.progressFill,
                      styles.progressInvested,
                      { width: `${investedShareWidth}%` },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.cardDivider} />
              <View style={styles.savingsSummaryRow}>
                <Text style={styles.progressLabel}>Total toward goals</Text>
                <Text style={styles.savingsAmount}>{formatCurrency(savingsTotal)}</Text>
              </View>
            </>
          ) : shouldShowZeroGoalsState ? (
            <View style={styles.savingsEmptyState}>
              <Text style={styles.savingsEmptyTitle}>Goals set to {currencySymbol}0</Text>
              <Text style={styles.savingsEmptyCopy}>
                You set both savings and investment goals to zero. Update your budget plan above if you want to
                track contributions.
              </Text>
              <Pressable style={styles.savingsCtaButton} onPress={() => {/* Scroll to top or do nothing */}}>
                <Text style={styles.savingsCtaButtonText}>Edit goals above</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.savingsEmptyState}>
              <Text style={styles.savingsEmptyTitle}>
                {hasBudget ? "Add savings & investment goals" : "Create a budget plan"}
              </Text>
              <Text style={styles.savingsEmptyCopy}>
                {hasBudget && planGoalsZero
                  ? "Enter goal amounts in your budget plan to start tracking progress."
                  : hasBudget
                    ? "Set targets for savings and investments to unlock this widget."
                    : "Create a budget plan with goal allocations to view your progress here."}
              </Text>
              <Pressable
                style={styles.savingsCtaButton}
                onPress={hasBudget ? () => {} : () => setShowCreatePlanModal(true)}
              >
                <Text style={styles.savingsCtaButtonText}>
                  {hasBudget ? "Edit goals above" : "Create budget plan"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.surface}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Category breakdown</Text>
            <Text style={styles.subText}>Totals, share, and items</Text>
          </View>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableCategory]}>Category</Text>
            <Text style={[styles.tableCell, styles.tableNumeric]}>Total</Text>
            <Text style={[styles.tableCell, styles.tableNumeric]}>%</Text>
            <Text style={[styles.tableCell, styles.tableNumeric]}>Items</Text>
          </View>
          {(snapshot?.categories ?? []).map((cat) => {
            const catLabel = getCategoryLabel(cat.id);
            const isActive = activeCategoryId === cat.id;
            const rawSubcategories = cat.subcategories ?? [];
            const configCategory = categoryLookup.get(cat.id);
            const configuredSubcategories = configCategory?.subcategories ?? [];
            const subcategoryDataMap = new Map(rawSubcategories.map((sub) => [sub.id, sub]));
            const orderedSubcategories =
              configuredSubcategories.length > 0
                ? configuredSubcategories.map((configSub, index) => {
                    const existing = subcategoryDataMap.get(configSub.id);
                    const fallbackColor =
                      existing?.color ??
                      fallbackSubcategoryColors[index % fallbackSubcategoryColors.length] ??
                      cat.color;
                    return (
                      existing ?? {
                        id: configSub.id,
                        total: 0,
                        percent: 0,
                        color: fallbackColor,
                      }
                    );
                  })
                : rawSubcategories;
            const additionalSubcategories =
              rawSubcategories.length > configuredSubcategories.length
                ? rawSubcategories.filter(
                    (sub) => !configuredSubcategories.some((configSub) => configSub.id === sub.id),
                  )
                : [];
            const subcategories = [...orderedSubcategories, ...additionalSubcategories];
            const hasSubcategories = subcategories.length > 0;
            const compactLayout = width < 420;
            const availableWidth = width - (compactLayout ? 48 : 140);
            const subChartSize = Math.max(160, Math.min(availableWidth, 240));
            const subPieStroke = Math.max(10, subChartSize * 0.18);
            const subPieRadius = subChartSize / 2 - subPieStroke / 2;
            const subCircumference = 2 * Math.PI * subPieRadius;
            const subSegments = subcategories
              .filter((sub) => sub.percent > 0)
              .reduce<{ length: number; offset: number; color: string; id: string }[]>((acc, sub) => {
                const prevTotal = acc.reduce((sum, item) => sum + item.length, 0);
                const length = (sub.percent / 100) * subCircumference;
                return [...acc, { length, offset: prevTotal, color: sub.color, id: sub.id }];
              }, []);

            return (
              <View key={cat.id}>
                <Pressable
                  onPress={() => handleCategoryPress(cat.id)}
                  style={({ pressed }) => [
                    styles.tableRow,
                    styles.tableRowPressable,
                    isActive && styles.tableRowActive,
                    pressed && styles.tableRowPressed,
                  ]}
                >
                  <View style={[styles.tableCategory, styles.tableCellRow]}>
                    <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                    <Text style={[styles.tableText, styles.tableCell]}>{catLabel}</Text>
                  </View>
                  <Text style={[styles.tableCell, styles.tableNumeric]}>{Math.round(cat.total)}</Text>
                  <Text style={[styles.tableCell, styles.tableNumeric]}>{cat.percent}%</Text>
                  <Text style={[styles.tableCell, styles.tableNumeric]}>{cat.items}</Text>
                </Pressable>
                {isActive && hasSubcategories && (
                  <View style={styles.subCategoryPanel}>
                    <Text style={styles.subCategoryTitle}>{catLabel} breakdown</Text>
                    <View style={[styles.subCategoryContent, compactLayout && styles.subCategoryContentStacked]}>
                      <View style={styles.subCategoryChartColumn}>
                        <View style={[styles.subCategoryChart, { width: subChartSize, height: subChartSize }]}>
                          <Svg width={subChartSize} height={subChartSize}>
                            <Circle
                              cx={subChartSize / 2}
                              cy={subChartSize / 2}
                              r={subPieRadius}
                              stroke="#f3ede1"
                              strokeWidth={subPieStroke}
                              fill="none"
                            />
                            {subSegments.map((segment) => (
                              <Circle
                                key={`sub-segment-${segment.id}`}
                                cx={subChartSize / 2}
                                cy={subChartSize / 2}
                                r={subPieRadius}
                                stroke={segment.color}
                                strokeWidth={subPieStroke}
                                strokeDasharray={`${segment.length} ${subCircumference}`}
                                strokeDashoffset={-segment.offset}
                                strokeLinecap="butt"
                                fill="none"
                                rotation={-90}
                                originX={subChartSize / 2}
                                originY={subChartSize / 2}
                              />
                            ))}
                          </Svg>
                          <View
                            style={[
                              styles.subCategoryCenter,
                              {
                                width: subChartSize * 0.6,
                                height: subChartSize * 0.6,
                                borderRadius: (subChartSize * 0.6) / 2,
                              },
                            ]}
                          >
                            <Text style={styles.subCategoryValue}>{formatCurrency(Math.round(cat.total))}</Text>
                            <Text style={styles.subCategoryLabel}>Total</Text>
                          </View>
                        </View>
                      </View>
                      <View style={[styles.subCategoryLegend, compactLayout && styles.subCategoryLegendFull]}>
                        {subcategories.map((sub, index) => {
                          const subLabel = getSubcategoryLabel(cat.id, sub.id);
                          return (
                            <View key={`${sub.id}-${index}`} style={styles.legendRowSmall}>
                              <View style={[styles.legendDot, { backgroundColor: sub.color }]} />
                              <View style={styles.legendTextBlock}>
                                <Text style={styles.legendLabelSmall}>{subLabel}</Text>
                                <Text style={styles.legendPercentSmall}>
                                  {sub.percent > 0
                                    ? `${sub.percent}% · ${formatCurrency(Math.round(sub.total))}`
                                    : "No spending yet"}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.surface}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Last 7 days</Text>
              <Text style={styles.subText}>Total spent per week this month</Text>
            </View>
            <Text style={styles.weeklyTotalLabel}>{formatCurrency(weeklyTotal)}</Text>
          </View>
          {isWeeklyLoading ? (
            <View style={[styles.weeklySkeletonRow, { height: weeklyChartHeight }]}>
              {Array.from({ length: 5 }).map((_, idx) => (
                <View key={`weekly-skeleton-${idx}`} style={styles.weeklySkeletonBar} />
              ))}
            </View>
          ) : hasWeeklySpending ? (
            <View style={styles.weeklyChartBlock}>
              <View style={styles.weeklyPlotWrapper}>
                <View style={[styles.weeklyAxisColumn, { width: weeklyAxisWidth, height: weeklyChartHeight }]}>
                  {weeklyAxisTicks.map((value, idx) => (
                    <Text key={`weekly-axis-${value}-${idx}`} style={styles.weeklyAxisLabel}>
                      {formatCurrency(value)}
                    </Text>
                  ))}
                </View>
                <View style={[styles.weeklyPlotArea, { height: weeklyChartHeight }]}>
                  <View style={styles.weeklyGridLayer} pointerEvents="none">
                    {weeklyAxisTicks.map((tickValue, idx) => (
                      <View
                        key={`weekly-grid-${tickValue}-${idx}`}
                        style={[
                          styles.weeklyGridLine,
                          tickValue === 0 && styles.weeklyGridLineZero,
                        ]}
                      />
                    ))}
                  </View>
                  <View
                    style={[
                      styles.weeklyBarsRow,
                      displayWeeklyPoints.length === 1 && styles.weeklyBarsRowSingle,
                    ]}
                  >
                    {displayWeeklyPoints.map((point, idx) => {
                      const ratio = weeklyScaleMax ? (point.total / weeklyScaleMax) * 100 : 0;
                      const heightPct = point.total === 0 ? 4 : Math.max(12, ratio);
                      const isActive = activeWeekIndex === idx;
                      return (
                        <Pressable
                          key={`week-${point.week}-${idx}`}
                          onPress={() => setActiveWeekIndex(isActive ? null : idx)}
                          style={styles.weeklyBarPressable}
                        >
                          <View style={[styles.weeklyBarWrapper, { minHeight: weeklyChartHeight - 40 }]}>
                            {isActive ? (
                              <View
                                pointerEvents="none"
                                style={[
                                  styles.weeklyTooltip,
                                  { width: weeklyTooltipWidth, marginLeft: -weeklyTooltipWidth / 2 },
                                ]}
                              >
                                <Text style={styles.weeklyTooltipValue}>{formatCurrency(point.total)}</Text>
                              </View>
                            ) : null}
                            <View
                              style={[
                                styles.weeklyBar,
                                isActive && styles.weeklyBarActive,
                                {
                                  height: `${Math.min(100, heightPct)}%`,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.weeklyXAxisLabel}>{point.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.weeklyEmptyState, { minHeight: weeklyChartHeight - 20 }]}>
              <Text style={styles.weeklyEmptyText}>No spending logged this month yet.</Text>
            </View>
          )}
        </View>

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
      </View>
      <AddExpenseModal visible={showAdd} onClose={() => setShowAdd(false)} />
      <AddIncomeModal
        visible={showIncome}
        onClose={() => setShowIncome(false)}
        monthKey={snapshot?.key ?? ""}
        currentDate={snapshot?.currentDate ?? new Date().toISOString()}
      />
      <CreateMonthlyPlanModal
        visible={showCreatePlanModal}
        onClose={() => setShowCreatePlanModal(false)}
        onSubmit={handleCreatePlan}
        isSaving={isSaving}
      />
    </SafeAreaView>
  );
}

type GoalSliderProps = {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
  currencySymbol: string;
  formatValue: (value: number) => string;
};

function GoalSlider({ label, value, max, onChange, currencySymbol, formatValue }: GoalSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [inputValue, setInputValue] = useState(formatNumber(value));
  const maxValue = Math.max(max, LINEAR_MAX, 1);
  const percent = percentFromValue(value, maxValue);

  useEffect(() => {
    setInputValue(formatNumber(value));
  }, [value]);

  const updateFromLocation = useCallback(
    (locationX: number, shouldSnap = false) => {
      if (!trackWidth) {
        return;
      }
      const pct = Math.min(Math.max(locationX / trackWidth, 0), 1);
      const rawValue = valueFromPercent(pct, maxValue);
      const nextValue = shouldSnap ? snapGoalValue(rawValue, maxValue) : sanitizeGoalValue(rawValue, maxValue);
      onChange(nextValue);
    },
    [trackWidth, maxValue, onChange],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => updateFromLocation(event.nativeEvent.locationX),
        onPanResponderMove: (event) => updateFromLocation(event.nativeEvent.locationX),
        onPanResponderRelease: (event) => updateFromLocation(event.nativeEvent.locationX, true),
        onPanResponderTerminate: (event) => updateFromLocation(event.nativeEvent.locationX, true),
      }),
    [updateFromLocation],
  );

  return (
    <View style={styles.goalSlider}>
      <View style={styles.goalSliderHeader}>
        <Text style={styles.goalSliderLabel}>{label}</Text>
        <Text style={styles.goalSliderValue}>{formatValue(value)}</Text>
      </View>
      <View style={styles.goalSliderInputRow}>
        <Text style={styles.goalSliderInputPrefix}>{currencySymbol}</Text>
        <TextInput
          value={inputValue}
          onChangeText={(text) => {
            const digitsOnly = text.replace(/[^\d]/g, "");
            if (!digitsOnly) {
              setInputValue("");
              onChange(0);
              return;
            }
            const numericValue = clamp(Number(digitsOnly), 0, maxValue);
            onChange(numericValue);
            setInputValue(formatNumber(numericValue));
          }}
          onBlur={() => {
            if (!inputValue) {
              setInputValue(formatNumber(0));
            }
          }}
          keyboardType="number-pad"
          style={styles.goalSliderInput}
          placeholder="0"
          placeholderTextColor="#9ca3af"
        />
      </View>
      <View
        style={styles.goalSliderTrack}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={[styles.goalSliderFill, { width: `${percent * 100}%` }]} />
        <View style={[styles.goalSliderThumb, { left: `${percent * 100}%` }]} />
      </View>
    </View>
  );
}

type GoalDisplayBarProps = {
  label: string;
  value: number;
  max: number;
  formatValue: (value: number) => string;
  // New optional props for progress mode
  actual?: number;           // Actual amount achieved
  showProgress?: boolean;    // Enable progress mode
};

function GoalDisplayBar({ label, value, max, formatValue, actual, showProgress }: GoalDisplayBarProps) {
  const normalizedMax = Math.max(max, value, 1);

  // Calculate percentage based on mode
  const percent = showProgress
    ? (value > 0 ? Math.min((actual ?? 0) / value, 1) : 0)  // Progress mode: actual/goal, capped at 100%
    : value / normalizedMax;                                  // Original mode: goal/income

  // Format display text based on mode
  const displayText = showProgress
    ? `${formatValue(actual ?? 0)} of ${formatValue(value)}`  // "$116 of $232"
    : formatValue(value);                                       // Original format

  // Calculate actual percentage for display (can exceed 100%)
  const actualPercent = showProgress && value > 0
    ? Math.max(0, Math.round(((actual ?? 0) / value) * 100))
    : null;

  return (
    <View style={styles.goalSlider}>
      <View style={styles.goalSliderHeader}>
        <Text style={styles.goalSliderLabel}>{label}</Text>
        <View style={styles.goalDisplayValueContainer}>
          <Text style={styles.goalSliderValue}>{displayText}</Text>
          {showProgress && actualPercent !== null && (
            <Text style={styles.goalProgressPercent}>{actualPercent}%</Text>
          )}
        </View>
      </View>
      <View style={styles.goalSliderTrack}>
        <View
          style={[
            styles.goalSliderFill,
            styles.goalSliderFillReadonly,
            showProgress && styles.goalSliderFillProgress,
            { width: `${percent * 100}%` }
          ]}
        />
        {/* No thumb indicator - read-only */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6f3ed",
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerCopy: {
    alignItems: "center",
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  subText: {
    fontSize: 13,
    color: "#6b7280",
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ede7dc",
    alignItems: "center",
    justifyContent: "center",
  },
  navIcon: {
    fontSize: 18,
    color: "#111827",
  },
  navIconDisabled: {
    color: "#cbd5e1",
  },
  surface: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ede7dc",
    gap: 12,
    marginBottom: 6,
    shadowColor: "rgba(15,23,42,0.08)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderColor: "#ede7dc",
    paddingVertical: 22,
    paddingHorizontal: 24,
    gap: 18,
  },
  sectionHeaderCentered: {
    alignItems: "center",
    gap: 4,
  },
  sectionHeaderStacked: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  metricLabel: {
    fontSize: 13,
    color: "#6b7280",
  },
  remainingValue: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111827",
  },
  metricHelper: {
    fontSize: 14,
    color: "#4b5563",
  },
  metricHelperBold: {
    fontSize: 15,
    color: "#1f2937",
    fontWeight: "600",
  },
  insightWidget: {
    gap: 12,
  },
  planHelper: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headlineBlock: {
    gap: 4,
  },
  headlineSubtitleBlock: {
    gap: 2,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f2937",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  headlineSubtitle: {
    fontWeight: "700",
    color: "#1f2937",
    textTransform: "capitalize",
    marginTop: 2,
  },
  summaryHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  summaryChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  summaryChipGhost: {
    borderColor: "#c7dbff",
    backgroundColor: "#edf4ff",
    alignSelf: "flex-start",
  },
  summaryChipGhostText: {
    color: "#0f3c91",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
  },
  summaryCol: {
    flex: 1,
    gap: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  summaryMeta: {
    fontSize: 12,
    color: "#9ca3af",
  },
  summaryMetaLabel: {
    fontWeight: "600",
    color: "#9ca3af",
  },
  summaryHint: {
    fontSize: 12,
    color: "#4b5563",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#efe6d7",
    marginTop: 14,
    marginBottom: 4,
  },
  summaryFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryEmpty: {
    borderWidth: 1,
    borderColor: "#fef3c7",
    backgroundColor: "#fffbeb",
    borderRadius: 16,
    padding: 16,
    gap: 8,
    marginTop: 8,
  },
  summaryEmptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#854d0e",
  },
  summaryEmptyCopy: {
    fontSize: 13,
    color: "#854d0e",
  },
  summaryEmptyActions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 6,
  },
  summarySecondaryButton: {
    flex: 1,
    minWidth: 140,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  summarySecondaryText: {
    fontWeight: "600",
    color: "#374151",
  },
  summaryPrimaryButton: {
    flex: 1,
    minWidth: 140,
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  summaryPrimaryText: {
    fontWeight: "600",
    color: "#fff",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  summaryBadge: {
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  planCard: {
    paddingHorizontal: 22,
    paddingVertical: 20,
    gap: 16,
  },
  planForm: {
    gap: 18,
  },
  planFormHeader: {
    gap: 4,
  },
  planFormTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  planFormSubtitle: {
    fontSize: 13,
    color: "#6b7280",
  },
  planFieldLabel: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
  },
  planSummaryMetric: {
    flex: 1,
    gap: 6,
    minWidth: 110,
  },
  planMetricLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "600",
  },
  planMetricValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  planSummaryInput: {
    borderWidth: 1,
    borderColor: "#d6d3ce",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    backgroundColor: "#fff",
  },
  planInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
  },
  planInputDisabled: {
    backgroundColor: "#f9fafb",
    color: "#9ca3af",
  },
  planFieldRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-end",
  },
  planFieldColumn: {
    flex: 1,
    gap: 6,
  },
  planToggle: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  planToggleActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  planToggleLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  planToggleLabelActive: {
    color: "#fff",
  },
  planSection: {
    gap: 12,
  },
  planSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  planAddButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#111827",
  },
  planAddButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  planSaveButton: {
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  planSaveButtonDisabled: {
    opacity: 0.5,
  },
  planSaveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  planEditButton: {
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  planEditButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  planWidget: {
    gap: 16,
  },
  planWidgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planSummaryCard: {
    borderWidth: 1,
    borderColor: "#f2e8da",
    borderRadius: 22,
    backgroundColor: "#fffdfa",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 2,
  },
  planSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  planSummaryRowFirst: {
    paddingBottom: 2,
  },
  planSummaryDivider: {
    height: 1,
    backgroundColor: "#f2e4d1",
  },
  planSummaryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2933",
  },
  planSummaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0b1525",
    textAlign: "right",
    lineHeight: 24,
  },
  planSummaryValueCompact: {
    fontSize: 18,
    lineHeight: 22,
  },
  planSummaryValueAccent: {
    color: "#111b2f",
  },
  planSummaryMeta: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280",
    marginTop: 2,
    textAlign: "left",
  },
  planIncomeList: {
    gap: 10,
  },
  planIncomeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  planIncomeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  planIncomeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#d1d5db",
  },
  planIncomeLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  planIncomeMeta: {
    fontSize: 12,
    color: "#6b7280",
  },
  planIncomeAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  planEmptyIncome: {
    borderWidth: 1,
    borderColor: "#ede7dc",
    borderStyle: "dashed",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  planEmptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6b7280",
  },
  planEmptyCopy: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
  planAddButtonGhost: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  planAddButtonGhostText: {
    fontWeight: "600",
    color: "#111827",
  },
  goalSlider: {
    gap: 8,
  },
  goalSliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  goalSliderLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  goalSliderValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  goalSliderInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  goalSliderInputPrefix: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  goalSliderInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#fff",
  },
  goalSliderTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "#ede7dc",
    position: "relative",
    overflow: "hidden",
  },
  goalSliderFill: {
    height: "100%",
    backgroundColor: "#111827",
  },
  goalSliderFillReadonly: {
    opacity: 0.6,
  },
  goalDisplayValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  goalProgressPercent: {
    fontSize: 15,
    fontWeight: "800",
    color: "#20b2c5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "rgba(32, 178, 197, 0.1)",
    borderRadius: 6,
  },
  goalSliderFillProgress: {
    backgroundColor: "#20b2c5",
    opacity: 1,
  },
  goalSliderThumb: {
    position: "absolute",
    top: "50%",
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#111827",
    transform: [{ translateX: -11 }, { translateY: -11 }],
  },
  planWarning: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fcd34d",
    backgroundColor: "#fef9c3",
    padding: 12,
  },
  planWarningTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400e",
    marginBottom: 4,
  },
  planWarningCopy: {
    fontSize: 12,
    color: "#92400e",
    lineHeight: 16,
  },
  // Empty state styles
  emptyPlanState: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  createPlanButton: {
    backgroundColor: "#111827",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  createPlanButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // Edit actions (save/cancel buttons)
  planEditActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  planActionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  planCancelButton: {
    backgroundColor: "#F2F2F7",
  },
  planCancelButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  badgePositive: {
    backgroundColor: "#e6f4ea",
    borderColor: "#bbf7d0",
  },
  badgeWarn: {
    backgroundColor: "#fef7cd",
    borderColor: "#fde68a",
  },
  badgeDanger: {
    backgroundColor: "#fee2e2",
    borderColor: "#fecaca",
  },
  badgeNeutral: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
  },
  badgeTextPositive: {
    color: "#166534",
  },
  badgeTextWarn: {
    color: "#92400e",
  },
  badgeTextDanger: {
    color: "#b91c1c",
  },
  badgeTextNeutral: {
    color: "#475569",
  },
  progressStack: {
    gap: 8,
    marginTop: 8,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#ede5d8",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#0f172a",
  },
  donutRow: {
    flexDirection: "column",
    gap: 20,
    alignItems: "center",
    paddingVertical: 16,
  },
  donut: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  donutCenter: {
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ede7dc",
    gap: 4,
  },
  donutValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  donutLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  legendColumns: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  legendColumn: {
    flex: 1,
    gap: 8,
  },
  legendRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    width: "100%",
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLeft: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flex: 1,
  },
  legendLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  legendPercent: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  svg: {
    position: "absolute",
    overflow: "visible",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  savingsProgressGroup: {
    marginTop: 12,
    gap: 8,
  },
  progressLabelBlock: {
    flex: 1,
    gap: 4,
  },
  savingsLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  savingsLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  savingsLegendSaved: {
    backgroundColor: "#20b2c5",
  },
  savingsLegendInvested: {
    backgroundColor: "#334155",
  },
  progressLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  progressSub: {
    fontSize: 13,
    color: "#6b7280",
  },
  progressValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  savingsAmount: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  progressMuted: {
    backgroundColor: "#f3ede1",
  },
  progressInvested: {
    backgroundColor: "#334155",
  },
  savingsTrack: {
    height: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  savingsCombinedTrack: {
    flexDirection: "row",
  },
  savingsFillPrimary: {
    backgroundColor: "#20b2c5",
  },
  savingsSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
  },
  savingsEmptyState: {
    paddingVertical: 16,
    gap: 8,
  },
  savingsEmptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  savingsEmptyCopy: {
    fontSize: 14,
    color: "#6b7280",
  },
  savingsCtaButton: {
    marginTop: 4,
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  savingsCtaButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#ede7dc",
    marginTop: 12,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#ede7dc",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3ede1",
  },
  tableRowPressable: {
    alignItems: "center",
  },
  tableRowPressed: {
    opacity: 0.85,
  },
  tableRowActive: {
    backgroundColor: "#f6f3ed",
  },
  tableCell: {
    fontSize: 13,
    color: "#111827",
  },
  tableCategory: {
    flex: 1.6,
  },
  tableNumeric: {
    flex: 0.9,
    textAlign: "right",
  },
  tableCellRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tableText: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "600",
  },
  subCategoryPanel: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ede7dc",
    marginBottom: 12,
    marginTop: -2,
    gap: 12,
  },
  subCategoryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  subCategoryContent: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    flexWrap: "wrap",
  },
  subCategoryContentStacked: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  subCategoryChartColumn: {
    flex: 1,
    alignItems: "center",
  },
  subCategoryChart: {
    alignItems: "center",
    justifyContent: "center",
  },
  subCategoryCenter: {
    position: "absolute",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ede7dc",
    gap: 2,
  },
  subCategoryValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  subCategoryLabel: {
    fontSize: 11,
    color: "#6b7280",
  },
  subCategoryLegend: {
    flex: 1,
    gap: 8,
  },
  subCategoryLegendFull: {
    width: "100%",
  },
  legendRowSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendTextBlock: {
    flex: 1,
  },
  legendLabelSmall: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  legendPercentSmall: {
    fontSize: 12,
    color: "#6b7280",
  },
  weeklyTotalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  weeklyChartBlock: {
    marginTop: 8,
  },
  weeklyPlotWrapper: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  weeklyAxisColumn: {
    width: 64,
    height: 220,
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  weeklyAxisLabel: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "right",
  },
  weeklyPlotArea: {
    flex: 1,
    height: 220,
    position: "relative",
  },
  weeklyGridLayer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  weeklyGridLine: {
    width: "100%",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  weeklyGridLineZero: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#d0dae5",
  },
  weeklyBarsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 14,
    height: "100%",
    paddingHorizontal: 4,
    paddingBottom: 12,
  },
  weeklyBarsRowSingle: {
    justifyContent: "center",
  },
  weeklyBarPressable: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  weeklyBarWrapper: {
    width: "100%",
    flexGrow: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    position: "relative",
    overflow: "visible",
  },
  weeklyBar: {
    width: "65%",
    backgroundColor: "#9ec5ff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: "#9ec5ff",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  weeklyBarActive: {
    backgroundColor: "#2563eb",
    shadowColor: "#2563eb",
  },
  weeklyXAxisLabel: {
    fontSize: 12,
    color: "#475569",
  },
  weeklyTooltip: {
    position: "absolute",
    bottom: -8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#ffffff",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    left: "50%",
    zIndex: 2,
  },
  weeklyTooltipValue: {
    fontSize: 15,
    color: "#0f172a",
    fontWeight: "800",
  },
  weeklySkeletonRow: {
    flexDirection: "row",
    height: 200,
    gap: 12,
    alignItems: "flex-end",
  },
  weeklySkeletonBar: {
    flex: 1,
    height: "70%",
    borderRadius: 14,
    backgroundColor: "#f3ede1",
  },
  weeklyEmptyState: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#e2e8f0",
    backgroundColor: "#fbfbf7",
  },
  weeklyEmptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  transactions: {
    gap: 10,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3ede1",
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  txCategory: {
    fontSize: 13,
    color: "#6b7280",
  },
  txDate: {
    fontSize: 13,
    color: "#475569",
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
    gap: 10,
  },
  fab: {
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#0b1222",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  fabMenuColumn: {
    flexDirection: "column",
    gap: 8,
  },
  fabAction: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#111827",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  fabActionSecondary: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
  },
  fabActionLabel: {
    color: "#f8fafc",
    fontSize: 14,
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
    fontSize: 26,
    fontWeight: "800",
    marginTop: -2,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyCopy: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: "#111827",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
