import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
import { AddIncomeModal } from "@/components/AddIncomeModal";
import { AddSpendingModal } from "@/components/AddSpendingModal";
import { insightMonths } from "@/src/dummy_data/insights";
import { useBudgetContext } from "@/src/features/budget/BudgetProvider";
import { getIncomeTypeLabel, type IncomeEvent } from "@/src/features/budget/types";
import { useCurrencyFormatter } from "@/src/features/profile/useCurrencyFormatter";

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

const months = insightMonths;

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
  const [monthIndex, setMonthIndex] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [incomeModalMode, setIncomeModalMode] = useState<"add" | "edit">("add");
  const [editingIncome, setEditingIncome] = useState<IncomeEvent | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeWeekIndex, setActiveWeekIndex] = useState<number | null>(null);
  const [isWeeklyLoading, setIsWeeklyLoading] = useState(true);
  const snapshot = months[monthIndex];
  const { incomeByMonth, planByMonth, saveMonthlyPlan } = useBudgetContext();
  const monthIncomes = incomeByMonth[snapshot.key] ?? [];
  const monthPlan = planByMonth[snapshot.key];
  const [isPlanEditing, setIsPlanEditing] = useState(!monthPlan);
  const [planAmountText, setPlanAmountText] = useState(monthPlan ? String(monthPlan.amount) : "");
  const [planPaydayText, setPlanPaydayText] = useState(
    monthPlan?.paydayDayOfMonth ? String(monthPlan.paydayDayOfMonth) : "",
  );
  const [planIrregular, setPlanIrregular] = useState(monthPlan?.paySchedule === "irregular");
  const [planSavingsGoal, setPlanSavingsGoal] = useState(monthPlan?.savingsGoal ?? 0);
  const [planInvestmentsGoal, setPlanInvestmentsGoal] = useState(monthPlan?.investmentsGoal ?? 0);
  const { formatCurrency, currencySymbol } = useCurrencyFormatter();
  useEffect(() => {
    if (monthPlan) {
      setPlanAmountText(String(monthPlan.amount));
      setPlanPaydayText(monthPlan.paydayDayOfMonth ? String(monthPlan.paydayDayOfMonth) : "");
      setPlanIrregular(monthPlan.paySchedule === "irregular");
      setPlanSavingsGoal(monthPlan.savingsGoal ?? 0);
      setPlanInvestmentsGoal(monthPlan.investmentsGoal ?? 0);
      setIsPlanEditing(false);
    } else {
      setPlanAmountText("");
      setPlanPaydayText("");
      setPlanIrregular(false);
      setPlanSavingsGoal(0);
      setPlanInvestmentsGoal(0);
      setIsPlanEditing(true);
    }
  }, [monthPlan, snapshot.key]);
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
    const date = new Date(snapshot.currentDate);
    if (Number.isNaN(date.getTime())) {
      const fallback = new Date();
      fallback.setHours(0, 0, 0, 0);
      return fallback;
    }
    date.setHours(0, 0, 0, 0);
    return date;
  }, [snapshot.currentDate]);

  const incomeReceived = monthIncomes.reduce((sum, income) => {
    const parsed = new Date(income.date);
    parsed.setHours(0, 0, 0, 0);
    if (parsed.getTime() <= monthCurrentDate.getTime()) {
      return sum + income.amount;
    }
    return sum;
  }, 0);

  let budgetSource: "income" | "plan" | "none" = "none";
  let availableBudget = 0;
  if (incomeReceived > 0) {
    budgetSource = "income";
    availableBudget = incomeReceived;
  } else if (monthPlan) {
    budgetSource = "plan";
    availableBudget = monthPlan.amount;
  }
  const hasBudget = budgetSource !== "none";
  const totalBudget = hasBudget ? availableBudget : 0;
  const totalSpent = snapshot.totalSpent;
  const remainingBudget = totalBudget - totalSpent;
  const budgetHelperLabel = budgetSource === "plan" ? "Based on your monthly plan" : null;
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
  const avgSpendPerDay = snapshot.loggedDays ? totalSpent / snapshot.loggedDays : totalSpent;
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
  const headlineSubtitle = hasBudget
    ? budgetSource === "plan"
      ? "projected left"
      : "available"
    : "Add income or set a plan";
  const planAmountValue = useMemo(() => {
    const cleaned = planAmountText.replace(/,/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [planAmountText]);
  const planDayValue = useMemo(() => parseInt(planPaydayText, 10), [planPaydayText]);
  const normalizedPayday =
    !planIrregular && Number.isFinite(planDayValue) && planDayValue >= 1 && planDayValue <= 31 ? planDayValue : undefined;
  const isPlanFormValid = planAmountValue > 0;
  const planGoalsTotal = planSavingsGoal + planInvestmentsGoal;
  const planSpendable = planAmountValue > 0 ? Math.max(planAmountValue - planGoalsTotal, 0) : 0;
  const goalSliderMax = planAmountValue > 0 ? planAmountValue : Math.max(planGoalsTotal, 1);
  useEffect(() => {
    if (planAmountValue <= 0) {
      return;
    }
    const totalGoals = planSavingsGoal + planInvestmentsGoal;
    if (totalGoals <= planAmountValue) {
      return;
    }
    if (planInvestmentsGoal >= planSavingsGoal) {
      const nextInvestments = Math.max(0, planAmountValue - planSavingsGoal);
      if (nextInvestments !== planInvestmentsGoal) {
        setPlanInvestmentsGoal(nextInvestments);
      }
    } else {
      const nextSavings = Math.max(0, planAmountValue - planInvestmentsGoal);
      if (nextSavings !== planSavingsGoal) {
        setPlanSavingsGoal(nextSavings);
      }
    }
  }, [planAmountValue, planSavingsGoal, planInvestmentsGoal]);
  const handleSavingsGoalChange = useCallback(
    (next: number) => {
      if (planAmountValue > 0) {
        const capped = Math.max(0, Math.min(next, Math.max(planAmountValue - planInvestmentsGoal, 0)));
        setPlanSavingsGoal(capped);
      } else {
        setPlanSavingsGoal(Math.max(0, next));
      }
    },
    [planAmountValue, planInvestmentsGoal],
  );
  const handleInvestmentsGoalChange = useCallback(
    (next: number) => {
      if (planAmountValue > 0) {
        const capped = Math.max(0, Math.min(next, Math.max(planAmountValue - planSavingsGoal, 0)));
        setPlanInvestmentsGoal(capped);
      } else {
        setPlanInvestmentsGoal(Math.max(0, next));
      }
    },
    [planAmountValue, planSavingsGoal],
  );
  const handlePlanSave = () => {
    if (!isPlanFormValid) {
      return;
    }
    saveMonthlyPlan(snapshot.key, {
      amount: planAmountValue,
      paydayDayOfMonth: normalizedPayday,
      paySchedule: planIrregular ? "irregular" : "monthly",
      savingsGoal: planSavingsGoal,
      investmentsGoal: planInvestmentsGoal,
    });
    setIsPlanEditing(false);
  };
  const handleIncomeEdit = useCallback((income: IncomeEvent) => {
    setIncomeModalMode("edit");
    setEditingIncome(income);
    setShowIncomeModal(true);
  }, []);

  const weeklyPoints = snapshot.weekly;
  const weeklyTotals = weeklyPoints.map((point) => point.total);
  const weeklyPeak = weeklyTotals.length ? Math.max(...weeklyTotals) : 0;
  const weeklyMax = Math.max(weeklyPeak, 1);
  const weeklyTotal = weeklyTotals.reduce((sum, value) => sum + value, 0);
  const hasWeeklySpending = weeklyTotals.some((value) => value > 0);
  const displayWeeklyPoints = weeklyPoints;
  const weeklyAxisTicks = hasWeeklySpending ? computeAxisTicks(weeklyPeak) : [];
  const weeklyScaleMax = (weeklyAxisTicks[0] ?? weeklyMax) || 1;
  const planSummaryAmount = monthPlan?.amount ?? 0;
  const planSummarySavings = monthPlan?.savingsGoal ?? 0;
  const planSummaryInvestments = monthPlan?.investmentsGoal ?? 0;
  const monthPlanSavingsGoal = monthPlan?.savingsGoal;
  const monthPlanInvestmentsGoal = monthPlan?.investmentsGoal;
  const hasMonthlyPlan = Boolean(monthPlan);
  const planHasGoalInputs = hasMonthlyPlan && (monthPlanSavingsGoal !== undefined || monthPlanInvestmentsGoal !== undefined);
  const planGoalsPositive =
    hasMonthlyPlan && ((monthPlanSavingsGoal ?? 0) > 0 || (monthPlanInvestmentsGoal ?? 0) > 0);
  const planGoalsZero =
    hasMonthlyPlan && planHasGoalInputs && (monthPlanSavingsGoal ?? 0) === 0 && (monthPlanInvestmentsGoal ?? 0) === 0;
  const planSummaryGoals = planSummarySavings + planSummaryInvestments;
  const planSummarySpendable = Math.max(planSummaryAmount - planSummaryGoals, 0);
  const compactPlanSummary = width < 380;

  const goPrev = () => {
    setMonthIndex((prev) => Math.min(prev + 1, months.length - 1));
  };
  const goNext = () => {
    setMonthIndex((prev) => Math.max(prev - 1, 0));
  };
  const openIncomeModal = () => {
    setIncomeModalMode("add");
    setEditingIncome(null);
    setShowIncomeModal(true);
  };

  useEffect(() => {
    setActiveCategoryId(null);
    setActiveWeekIndex(null);
    setIsWeeklyLoading(true);
    const timer = setTimeout(() => setIsWeeklyLoading(false), 360);
    return () => clearTimeout(timer);
  }, [monthIndex]);

  const handleCategoryPress = (categoryId: string) => {
    setActiveCategoryId((prev) => (prev === categoryId ? null : categoryId));
  };

  const savingsActual = snapshot.savings.saved;
  const investmentsActual = snapshot.savings.invested;
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
  const pieSegments = snapshot.categories.reduce<
    { length: number; offset: number; color: string; id: string; label: string }[]
  >((acc, cat) => {
    const prevTotal = acc.reduce((sum, item) => sum + item.length, 0);
    const length = (cat.percent / 100) * circumference;
    const offset = prevTotal;
    return [...acc, { length, offset, color: cat.color, id: cat.id, label: getCategoryLabel(cat.id) }];
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={goPrev} style={styles.navButton} disabled={monthIndex >= months.length - 1}>
            <Text
              style={[
                styles.navIcon,
                monthIndex >= months.length - 1 && styles.navIconDisabled,
              ]}
            >
              ‹
            </Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.monthLabel}>{snapshot.label}</Text>
            <Text style={styles.subText}>
              Logged {snapshot.loggedDays}/{snapshot.totalDays} days
            </Text>
          </View>
          <Pressable onPress={goNext} style={styles.navButton} disabled={monthIndex === 0}>
            <Text style={[styles.navIcon, monthIndex === 0 && styles.navIconDisabled]}>›</Text>
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
            {budgetSource === "plan" ? (
              <Pressable style={[styles.summaryChip, styles.summaryChipGhost]} onPress={openIncomeModal}>
                <Text style={[styles.summaryChipText, styles.summaryChipGhostText]}>Add income</Text>
              </Pressable>
            ) : null}
            {hasBudget ? (
              <>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryCol}>
                    <Text style={styles.metricHelper}>Total budget</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(totalBudget)}</Text>
                    <Text style={[styles.summaryMeta, styles.summaryMetaLabel]}>
                      {budgetSource === "plan" ? "Projected" : "Available"}
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
            ) : (
              <View style={styles.summaryEmpty}>
                <Text style={styles.summaryEmptyTitle}>Plan your month</Text>
                <Text style={styles.summaryEmptyCopy}>
                  Add income or set a monthly plan to unlock pacing and insights.
                </Text>
                <View style={styles.summaryEmptyActions}>
                  <Pressable style={styles.summarySecondaryButton} onPress={() => setIsPlanEditing(true)}>
                    <Text style={styles.summarySecondaryText}>Set monthly plan</Text>
                  </Pressable>
                  <Pressable style={styles.summaryPrimaryButton} onPress={openIncomeModal}>
                    <Text style={styles.summaryPrimaryText}>Add income</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.surface, styles.planCard]}>
          {isPlanEditing ? (
            <View style={styles.planForm}>
              <View style={styles.planFormHeader}>
                <View>
                  <Text style={styles.planFormTitle}>Monthly plan</Text>
                  <Text style={styles.planFormSubtitle}>Projected income + goal allocations</Text>
                </View>
              </View>
              <View style={styles.planSummaryCard}>
                <View style={styles.planSummaryMetric}>
                  <Text style={styles.planMetricLabel}>Projected income *</Text>
                  <TextInput
                    style={styles.planSummaryInput}
                    placeholder={`${currencySymbol}0`}
                    keyboardType="decimal-pad"
                    value={planAmountText}
                    onChangeText={setPlanAmountText}
                  />
                </View>
                <View style={styles.planSummaryMetric}>
                  <Text style={styles.planMetricLabel}>Spendable (after goals)</Text>
                  <Text style={styles.planMetricValue}>{formatCurrency(planSpendable)}</Text>
                </View>
              </View>
              <View style={styles.planFieldRow}>
                <View style={styles.planFieldColumn}>
                  <Text style={styles.planFieldLabel}>Payday (day of month)</Text>
                  <TextInput
                    style={[styles.planInput, planIrregular && styles.planInputDisabled]}
                    placeholder="1"
                    editable={!planIrregular}
                    keyboardType="number-pad"
                    value={planIrregular ? "" : planPaydayText}
                    onChangeText={setPlanPaydayText}
                  />
                </View>
                <Pressable
                  style={[styles.planToggle, planIrregular && styles.planToggleActive]}
                  onPress={() => setPlanIrregular((prev) => !prev)}
                >
                  <Text style={[styles.planToggleLabel, planIrregular && styles.planToggleLabelActive]}>
                    Irregular
                  </Text>
                </Pressable>
              </View>
              <View style={styles.planSection}>
                <View style={styles.planSectionHeader}>
                  <Text style={styles.planSectionTitle}>Income streams</Text>
                  <Pressable style={styles.planAddButton} onPress={openIncomeModal}>
                    <Text style={styles.planAddButtonText}>+ Add</Text>
                  </Pressable>
                </View>
                {monthIncomes.length ? (
                  <View style={styles.planIncomeList}>
                    {monthIncomes.map((income) => (
                      <Pressable
                        key={income.id}
                        style={styles.planIncomeRow}
                        onPress={() => handleIncomeEdit(income)}
                      >
                        <View style={styles.planIncomeLeft}>
                          <View style={styles.planIncomeIndicator} />
                          <View>
                            <Text style={styles.planIncomeLabel}>{getIncomeTypeLabel(income.type)}</Text>
                            <Text style={styles.planIncomeMeta}>
                              {income.note
                                ? `${formatIncomeSchedule(income.date)} • ${income.note}`
                                : formatIncomeSchedule(income.date)}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.planIncomeAmount}>{formatCurrency(income.amount)}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={styles.planEmptyIncome}>
                    <Text style={styles.planEmptyTitle}>No income streams yet</Text>
                    <Text style={styles.planEmptyCopy}>Add your recurring salary or side gigs.</Text>
                  </View>
                )}
              </View>
              <View style={styles.planSection}>
                <Text style={styles.planSectionTitle}>Goal allocations</Text>
                <GoalSlider
                  label="Savings goal"
                  value={planSavingsGoal}
                  max={goalSliderMax}
                  onChange={handleSavingsGoalChange}
                  formatValue={(value) => `${formatCurrency(value)} / month`}
                />
                <GoalSlider
                  label="Investments goal"
                  value={planInvestmentsGoal}
                  max={goalSliderMax}
                  onChange={handleInvestmentsGoalChange}
                  formatValue={(value) => `${formatCurrency(value)} / month`}
                />
              </View>
              <Pressable
                style={[styles.planSaveButton, !isPlanFormValid && styles.planSaveButtonDisabled]}
                disabled={!isPlanFormValid}
                onPress={handlePlanSave}
              >
                <Text style={styles.planSaveButtonText}>Save monthly plan</Text>
              </Pressable>
            </View>
          ) : (
              <View style={styles.planWidget}>
                <View style={styles.planWidgetHeader}>
                  <View>
                    <Text style={styles.planFormTitle}>Monthly plan</Text>
                    <Text style={styles.planFormSubtitle}>Projected income + goal allocations</Text>
                  </View>
                  <Pressable style={styles.planEditButton} onPress={() => setIsPlanEditing(true)}>
                    <Text style={styles.planEditButtonText}>Edit</Text>
                  </Pressable>
                </View>
                <View style={styles.planSummaryCard}>
                  <View style={[styles.planSummaryRow, styles.planSummaryRowFirst]}>
                    <View>
                      <Text style={styles.planSummaryLabel}>Projected income</Text>
                      <Text style={styles.planSummaryMeta}>Based on income streams</Text>
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
                        Savings {formatCurrency(planSummarySavings)} · Investments{" "}
                        {formatCurrency(planSummaryInvestments)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.planSummaryValue,
                        compactPlanSummary && styles.planSummaryValueCompact,
                      ]}
                    >
                      {formatCurrency(planSummaryGoals)}
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
                <View style={styles.planSectionHeader}>
                  <Text style={styles.planSectionTitle}>Income streams</Text>
                </View>
              {monthIncomes.length ? (
                <View style={styles.planIncomeList}>
                  {monthIncomes.map((income) => (
                    <Pressable
                      key={income.id}
                      style={styles.planIncomeRow}
                      onPress={() => handleIncomeEdit(income)}
                    >
                      <View style={styles.planIncomeLeft}>
                        <View style={styles.planIncomeIndicator} />
                        <View>
                          <Text style={styles.planIncomeLabel}>{getIncomeTypeLabel(income.type)}</Text>
                          <Text style={styles.planIncomeMeta}>
                            {income.note
                              ? `${formatIncomeSchedule(income.date)} • ${income.note}`
                              : formatIncomeSchedule(income.date)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.planIncomeAmount}>{formatCurrency(income.amount)}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={styles.planEmptyIncome}>
                  <Text style={styles.planEmptyTitle}>No income streams yet</Text>
                  <Text style={styles.planEmptyCopy}>Add a plan to unlock pacing.</Text>
                  <Pressable style={styles.planAddButtonGhost} onPress={openIncomeModal}>
                    <Text style={styles.planAddButtonGhostText}>Add income</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
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
                <Text style={styles.donutValue}>{formatCurrency(snapshot.totalSpent)}</Text>
                <Text style={styles.donutLabel}>This month</Text>
              </View>
            </View>
          <View style={styles.legendColumns}>
            {(() => {
              const mid = Math.ceil(snapshot.categories.length / 2);
              const left = snapshot.categories.slice(0, mid);
              const right = snapshot.categories.slice(mid);
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
                You set both savings and investment goals to zero for this month. Update your monthly plan if you want to
                track contributions.
              </Text>
              <Pressable style={styles.savingsCtaButton} onPress={() => setIsPlanEditing(true)}>
                <Text style={styles.savingsCtaButtonText}>Adjust plan goals</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.savingsEmptyState}>
              <Text style={styles.savingsEmptyTitle}>
                {hasMonthlyPlan ? "Add savings & investment goals" : "Create a monthly plan"}
              </Text>
              <Text style={styles.savingsEmptyCopy}>
                {hasMonthlyPlan && planHasGoalInputs
                  ? "Enter goal amounts in your plan to start tracking progress."
                  : hasMonthlyPlan
                    ? "Set targets for savings and investments to unlock this widget."
                    : "Save a monthly plan with goal allocations to view your progress here."}
              </Text>
              <Pressable style={styles.savingsCtaButton} onPress={() => setIsPlanEditing(true)}>
                <Text style={styles.savingsCtaButtonText}>
                  {hasMonthlyPlan ? "Set goals" : "Open monthly plan"}
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
          {snapshot.categories.map((cat) => {
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
                  <View style={[styles.tableCell, styles.tableCategory, styles.tableCellRow]}>
                    <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                    <Text style={styles.tableText}>{catLabel}</Text>
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
                setIncomeModalMode("add");
                setEditingIncome(null);
                setShowIncomeModal(true);
              }}
            >
              <Text style={[styles.fabActionLabel, styles.fabActionLabelSecondary]}>Add income</Text>
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
      <AddSpendingModal visible={showAdd} onClose={() => setShowAdd(false)} />
      <AddIncomeModal
        visible={showIncomeModal}
        onClose={() => {
          setShowIncomeModal(false);
          setIncomeModalMode("add");
          setEditingIncome(null);
        }}
        monthKey={snapshot.key}
        currentDate={snapshot.currentDate}
        mode={incomeModalMode}
        initialIncome={editingIncome ?? undefined}
      />
    </SafeAreaView>
  );
}

type GoalSliderProps = {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
};

function GoalSlider({ label, value, max, onChange, formatValue }: GoalSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const normalizedMax = Math.max(max, 1);
  const percent = normalizedMax > 0 ? Math.min(Math.max(value / normalizedMax, 0), 1) : 0;
  const updateFromLocation = useCallback(
    (locationX: number) => {
      if (!trackWidth) {
        return;
      }
      const pct = Math.min(Math.max(locationX / trackWidth, 0), 1);
      const nextValue = Math.round(pct * normalizedMax);
      onChange(nextValue);
    },
    [trackWidth, normalizedMax, onChange],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => updateFromLocation(event.nativeEvent.locationX),
        onPanResponderMove: (event) => updateFromLocation(event.nativeEvent.locationX),
      }),
    [updateFromLocation],
  );

  return (
    <View style={styles.goalSlider}>
      <View style={styles.goalSliderHeader}>
        <Text style={styles.goalSliderLabel}>{label}</Text>
        <Text style={styles.goalSliderValue}>{formatValue(value)}</Text>
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
  planSummaryCard: {
    backgroundColor: "#f4f1ea",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
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
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#f9fafb",
  },
  planEditButtonText: {
    fontWeight: "600",
    color: "#111827",
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
});
