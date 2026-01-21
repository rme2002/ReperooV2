import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Circle, Svg } from "react-native-svg";

import spendingCategories from "../../../../shared/config/spending-categories.json";
import { AddExpenseModal } from "@/components/modals/AddExpenseModal";
import { useInsightsContext } from "@/components/insights/InsightsProvider";

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

const formatCurrency = (value: number) => `€${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
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

export default function InsightsScreen() {
  const { availableMonths, currentSnapshot, isLoading, error, fetchSnapshot, prefetchSnapshot } = useInsightsContext();
  const [monthIndex, setMonthIndex] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeWeekIndex, setActiveWeekIndex] = useState<number | null>(null);
  const [isWeeklyLoading, setIsWeeklyLoading] = useState(true);

  // Fetch snapshot when monthIndex changes
  useEffect(() => {
    if (availableMonths.length > 0 && availableMonths[monthIndex]) {
      const month = availableMonths[monthIndex];
      console.log(`[InsightsScreen] Fetching snapshot for ${month.label} (year: ${month.year}, month: ${month.month})`);
      fetchSnapshot(month.year, month.month);
    }
  }, [monthIndex, availableMonths, fetchSnapshot]);

  // Prefetch adjacent months for smoother navigation
  useEffect(() => {
    if (availableMonths.length > 1) {
      // Prefetch next month if available
      if (monthIndex > 0) {
        const prevMonth = availableMonths[monthIndex - 1];
        prefetchSnapshot(prevMonth.year, prevMonth.month);
      }
      // Prefetch previous month if available
      if (monthIndex < availableMonths.length - 1) {
        const nextMonth = availableMonths[monthIndex + 1];
        prefetchSnapshot(nextMonth.year, nextMonth.month);
      }
    }
  }, [monthIndex, availableMonths, prefetchSnapshot]);

  const snapshot = currentSnapshot;
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

  const goPrev = () => {
    if (monthIndex < availableMonths.length - 1) {
      const newIndex = monthIndex + 1;
      setMonthIndex(newIndex);
      // fetchSnapshot will be called automatically by the useEffect when monthIndex changes
    }
  };
  const goNext = () => {
    if (monthIndex > 0) {
      const newIndex = monthIndex - 1;
      setMonthIndex(newIndex);
      // fetchSnapshot will be called automatically by the useEffect when monthIndex changes
    }
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

  // Handle loading and error states
  if (isLoading || !snapshot) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.loadingText}>{isLoading ? "Loading insights..." : "No data available"}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error === "NO_BUDGET_PLAN") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.errorText}>Create a budget plan to view insights</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.errorText}>Failed to load insights</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Snapshot-dependent calculations (only reached after null checks)
  const remaining = snapshot.budget - snapshot.totalSpent;
  const remainingPct = snapshot.budget ? Math.max(0, remaining / snapshot.budget) : 0;
  const spentPct = snapshot.budget ? Math.min(1, snapshot.totalSpent / snapshot.budget) : 0;
  const onTrackBadge = remainingPct > 0.35 ? "On track" : remainingPct > 0.1 ? "Tight" : "Over";
  const badgeTone =
    onTrackBadge === "On track" ? styles.badgePositive : onTrackBadge === "Tight" ? styles.badgeWarn : styles.badgeDanger;
  const badgeTextTone =
    onTrackBadge === "On track"
      ? styles.badgeTextPositive
      : onTrackBadge === "Tight"
        ? styles.badgeTextWarn
        : styles.badgeTextDanger;

  const weeklyPoints = snapshot.weekly;
  const weeklyTotals = weeklyPoints.map((point) => point.total);
  const weeklyPeak = weeklyTotals.length ? Math.max(...weeklyTotals) : 0;
  const weeklyMax = Math.max(weeklyPeak, 1);
  const weeklyTotal = weeklyTotals.reduce((sum, value) => sum + value, 0);
  const hasWeeklySpending = weeklyTotals.some((value) => value > 0);
  const displayWeeklyPoints = weeklyPoints;
  const weeklyAxisTicks = hasWeeklySpending ? computeAxisTicks(weeklyPeak) : [];
  const weeklyScaleMax = (weeklyAxisTicks[0] ?? weeklyMax) || 1;

  const daysLeft = Math.max(snapshot.totalDays - snapshot.loggedDays, 0);
  const perDay = daysLeft > 0 ? remaining / daysLeft : remaining;
  const averagePerDay = snapshot.loggedDays ? snapshot.totalSpent / snapshot.loggedDays : snapshot.totalSpent;
  const lastDeltaText =
    snapshot.lastMonthDelta > 0
      ? `↑ ${formatPercent(snapshot.lastMonthDelta)} vs last month`
      : snapshot.lastMonthDelta < 0
        ? `↓ ${formatPercent(Math.abs(snapshot.lastMonthDelta))} vs last month`
        : "No change vs last month";

  const savingsTotal = snapshot.savings.saved + snapshot.savings.invested;
  const hasSavingsSplit = savingsTotal > 0;
  const savedShareWidth = hasSavingsSplit ? (snapshot.savings.saved / savingsTotal) * 100 : 0;
  const investedShareWidth = hasSavingsSplit ? (snapshot.savings.invested / savingsTotal) * 100 : 0;

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
          <Pressable onPress={goPrev} style={styles.navButton} disabled={monthIndex >= availableMonths.length - 1}>
            <Text
              style={[
                styles.navIcon,
                monthIndex >= availableMonths.length - 1 && styles.navIconDisabled,
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

        <View style={[styles.surface, { padding: cardPadding, gap: cardGap }]}>
          <View style={styles.insightWidget}>
            <View style={styles.insightHeader}>
              <View>
                <Text style={[styles.remainingValue, { fontSize: 34 * fontFactor }]}>
                  {formatCurrency(Math.max(remaining, 0))} left
                </Text>
                <Text style={[styles.metricLabel, { fontSize: 13 * fontFactor }]}>this month</Text>
              </View>
              <View style={[styles.badge, badgeTone]}>
                <Text style={[styles.badgeText, badgeTextTone]}>{onTrackBadge}</Text>
              </View>
            </View>
            <View style={styles.insightStatsRow}>
              <View style={styles.insightStatBlock}>
                <Text style={styles.metricHelper}>Total budget</Text>
                <Text style={styles.metricHelperBold}>{formatCurrency(snapshot.budget)}</Text>
              </View>
              <View style={styles.insightStatBlock}>
                <Text style={styles.metricHelper}>Total spent</Text>
                <Text style={styles.metricHelperBold}>{formatCurrency(snapshot.totalSpent)}</Text>
              </View>
            </View>
            <View style={styles.insightStatsRow}>
              <View style={styles.insightStatBlock}>
                <Text style={styles.metricHelper}>Average spend</Text>
                <Text style={styles.metricHelperBold}>{formatCurrency(Math.round(averagePerDay))} / day</Text>
              </View>
              <View style={styles.insightStatBlock}>
                <Text style={styles.metricHelper}>You can still spend</Text>
                <Text style={styles.metricHelperBold}>
                  {formatCurrency(Math.max(0, Math.floor(perDay)))} / day
                </Text>
              </View>
            </View>
            <View style={styles.insightWeeklyRow}>
              <Text style={styles.metricLabel}>Weekly spending</Text>
              <Text style={styles.metricHelperBold}>{formatCurrency(weeklyTotal)}</Text>
            </View>
            <View style={[styles.progressStack, { marginTop: 4 * scale }]}>
              <View style={[styles.progressTrack, { height: progressHeight }]}>
                <View style={[styles.progressFill, { width: `${spentPct * 100}%` }]} />
              </View>
              <Text style={[styles.metricDelta, { fontSize: 13 * fontFactor }]}>{lastDeltaText}</Text>
            </View>
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
          <View style={[styles.savingsRow, styles.savingsRowFirst]}>
            <View style={styles.savingsLabelGroup}>
              <View style={styles.savingsLegendRow}>
                <View style={[styles.savingsLegendDot, styles.savingsLegendSaved]} />
                <Text style={styles.progressLabel}>Saved</Text>
              </View>
            </View>
            <Text style={styles.savingsAmount}>{formatCurrency(snapshot.savings.saved)}</Text>
          </View>
          <View style={styles.savingsRow}>
            <View style={styles.savingsLabelGroup}>
              <View style={styles.savingsLegendRow}>
                <View style={[styles.savingsLegendDot, styles.savingsLegendInvested]} />
                <Text style={styles.progressLabel}>Invested</Text>
              </View>
            </View>
            <Text style={styles.savingsAmount}>{formatCurrency(snapshot.savings.invested)}</Text>
          </View>
          <View style={[styles.progressTrack, styles.progressMuted, styles.savingsTrack, styles.savingsCombinedTrack]}>
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

          <View style={styles.cardDivider} />
          <View style={styles.savingsSummaryRow}>
            <Text style={styles.progressLabel}>Total toward goals</Text>
            <Text style={styles.savingsAmount}>{formatCurrency(savingsTotal)}</Text>
          </View>
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
              <Text style={styles.sectionTitle}>Weekly spending</Text>
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

        <View style={styles.surface}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent transactions</Text>
            <Text style={styles.subText}>Last 5 expenses</Text>
          </View>
          <View style={styles.transactions}>
            {snapshot.transactions.map((tx, idx) => {
              const categoryLabel = getCategoryLabel(tx.categoryId);
              const subcategoryLabel = tx.subcategoryId
                ? getSubcategoryLabel(tx.categoryId, tx.subcategoryId)
                : null;
              return (
                <View key={`${tx.date}-${idx}`} style={styles.txRow}>
                  <View>
                    <Text style={styles.txAmount}>{formatCurrency(tx.amount)}</Text>
                    <Text style={styles.txCategory}>
                      {subcategoryLabel ? `${categoryLabel} · ${subcategoryLabel}` : categoryLabel}
                    </Text>
                  </View>
                  <Text style={styles.txDate}>{tx.date}</Text>
                </View>
              );
            })}
          </View>
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
              <Text style={styles.fabActionLabel}>Add spending</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.fabAction,
                styles.fabActionSecondary,
                pressed && styles.fabActionPressed,
              ]}
              onPress={() => {
                setShowActions(false);
                Alert.alert("Add income", "Income tracking is coming soon.");
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
      <AddExpenseModal visible={showAdd} onClose={() => setShowAdd(false)} />
    </SafeAreaView>
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
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
  },
  errorText: {
    fontSize: 16,
    color: "#b91c1c",
    textAlign: "center",
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
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ede7dc",
    gap: 12,
    marginBottom: 6,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    color: "#374151",
  },
  metricHelperBold: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "600",
  },
  insightWidget: {
    gap: 12,
  },
  insightHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  insightStatsRow: {
    flexDirection: "row",
    gap: 16,
  },
  insightStatBlock: {
    flex: 1,
    gap: 4,
  },
  insightWeeklyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressSubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  metricDelta: {
    fontSize: 13,
    color: "#6b7280",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  badgePositive: {
    backgroundColor: "rgba(22,163,74,0.12)",
    borderColor: "rgba(22,163,74,0.4)",
  },
  badgeWarn: {
    backgroundColor: "rgba(234,179,8,0.16)",
    borderColor: "rgba(234,179,8,0.4)",
  },
  badgeDanger: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderColor: "rgba(239,68,68,0.4)",
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
  progressStack: {
    gap: 8,
    marginTop: 8,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#ede7dc",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#111827",
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
  savingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  savingsRowFirst: {
    marginTop: 12,
  },
  progressLabelBlock: {
    flex: 1,
    gap: 4,
  },
  savingsLabelGroup: {
    flex: 1,
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
