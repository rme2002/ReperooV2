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
import { profileOverview } from "@/components/dummy_data/profile";
import { useCurrencyFormatter } from "@/components/profile/useCurrencyFormatter";
import { useInsightsContext } from "@/components/insights/InsightsProvider";
import { useBudgetContext } from "@/components/budget/BudgetProvider";
import { MascotHeroSection } from "@/components/home/MascotHeroSection";

const overview = profileOverview;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Design constants
const CARD_RADIUS = 24;
const CARD_PADDING = 18;
const CARD_GAP = 4;
const FAB_BOTTOM_OFFSET = 100; // Space for FAB above bottom nav

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

  const { budgetPlan, isLoading } = useBudgetContext();

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

  const headlineValue = hasBudget
    ? formatCurrency(remainingBudget)
    : "No monthly plan";
  const subLabel = hasBudget ? "Left this month" : "Create a plan in Insights";
  const budgetHelperLabel = hasBudget ? "Based on recurring income" : undefined;
  const daysLeft = useMemo(() => {
    const endOfMonth = new Date(monthCurrentDate);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
    endOfMonth.setHours(0, 0, 0, 0);
    const diff = endOfMonth.getTime() - monthCurrentDate.getTime();
    if (diff < 0) {
      return 0;
    }
    return Math.floor(diff / DAY_IN_MS) + 1;
  }, [monthCurrentDate]);
  const safeDaysLeft = Math.max(daysLeft, 0);
  const showSuggestedToday = hasBudget && safeDaysLeft > 0;
  const suggestedTodayValue = showSuggestedToday
    ? Math.max(0, Math.round(remainingBudget / safeDaysLeft))
    : 0;
  const suggestedHelper = showSuggestedToday
    ? `Based on ${formatCurrency(Math.max(remainingBudget, 0))} left · ${safeDaysLeft}d`
    : "";
  const progressUsedPct =
    hasBudget && totalBudget > 0
      ? Math.min(Math.max(totalSpent / totalBudget, 0), 1)
      : 0;
  const progressLabel = `${Math.round(progressUsedPct * 100)}% of budget used`;
  const todayFormatted = formatCurrency(overview.todayAmount, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
          <View style={styles.headerRow}>
            <View style={styles.brandRow}>
              <Text style={styles.mascot}>🦘</Text>
              <Text style={styles.brand}>Reperoo</Text>
            </View>
          </View>

          <MascotHeroSection
            userName="Tayner"
            level={overview.level}
            xp={overview.xp}
            xpMax={overview.xpMax}
            rooStage={overview.rooStage}
            streakDays={overview.streakDays}
            scrollY={scrollY}
          />

          {/* Parent Widget Container */}
          <View style={styles.parentWidget}>
            {/* Level indicator at top */}
            <View style={styles.parentLevelHeader}>
              <Text style={styles.parentLevelText}>Level {overview.level}</Text>
            </View>

            {/* Today's Activity Card */}
            <View style={[styles.surface, styles.streakCard]}>
              <View style={styles.streakHeader}>
                <View style={styles.streakTitleBlock}>
                  <Text style={styles.streakTitle}>You're on fire!</Text>
                  <Text style={styles.streakSubtitle}>{overview.streakDays}-day streak</Text>
                </View>
                <View style={styles.xpBadge}>
                  <Text style={styles.xpBadgeText}>+1 XP</Text>
                </View>
              </View>

              <View style={styles.todayBlock}>
                <Text style={styles.xpLine}>
                  +{overview.xp} XP · {todayFormatted} logged today
                </Text>
                {overview.hasLoggedToday ? (
                  <Text style={styles.todaySub}>
                    Logged {overview.todayItems} items today
                  </Text>
                ) : (
                  <Text style={styles.todaySub}>
                    Log now to keep the streak alive
                  </Text>
                )}
              </View>

              {/* Slimmer CTA row instead of big button */}
              <Pressable
                style={({ pressed }) => [
                  styles.slimCta,
                  pressed && styles.slimCtaPressed,
                ]}
                onPress={() => setShowAdd(true)}
              >
                <Text style={styles.slimCtaText}>Log today's spending</Text>
                <View style={styles.slimCtaIcon}>
                  <Text style={styles.slimCtaPlus}>+</Text>
                </View>
              </Pressable>
            </View>

            {/* Budget Overview Card */}
            <View style={[styles.surface, styles.overviewCard]}>
            <View style={styles.spendingWidget}>
              <View style={styles.spendingTopRow}>
                <View style={styles.headlineStack}>
                  <Text style={styles.spendingRemaining}>{headlineValue}</Text>
                  <Text style={styles.spendingSpent}>{subLabel}</Text>
                  {budgetHelperLabel ? (
                    <Text style={styles.budgetHelper}>{budgetHelperLabel}</Text>
                  ) : null}
                </View>
                <View style={styles.summaryHeaderActions}>
                  {hasBudget ? (
                    <View style={styles.trendBadge}>
                      <Text style={styles.trendBadgeText}>
                        +{Math.round((1 - progressUsedPct) * 100)}%
                      </Text>
                      <Text style={styles.trendBadgeIcon}>↗</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              {hasBudget ? (
                <>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${progressUsedPct * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressCaption}>{progressLabel}</Text>
                  {showSuggestedToday ? (
                    <View style={styles.suggestedCard}>
                      <Text style={styles.metricHelper}>Suggested today</Text>
                      <Text style={styles.suggestedValue}>
                        {formatCurrency(suggestedTodayValue)}
                      </Text>
                      <Text style={styles.summaryHint}>{suggestedHelper}</Text>
                    </View>
                  ) : null}
                </>
              ) : isLoading ? (
                <View style={styles.summaryEmpty}>
                  <Text style={styles.summaryEmptyTitle}>
                    Loading budget plan...
                  </Text>
                </View>
              ) : (
                <View style={styles.summaryEmpty}>
                  <Text style={styles.summaryEmptyTitle}>
                    Create your monthly plan
                  </Text>
                  <Text style={styles.summaryEmptyCopy}>
                    Set up your monthly plan in the Insights tab with savings and investment goals.
                  </Text>
                  <View style={styles.summaryEmptyActions}>
                    <Pressable
                      style={styles.summaryPrimaryButton}
                      onPress={handleSetPlanPress}
                    >
                      <Text style={styles.summaryPrimaryText}>
                        Go to Insights
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>
          </View>

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
      <Animated.View style={[styles.fabStack, { right: 20, bottom: 24 }, animatedFabStyle]}>
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
    gap: CARD_GAP,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
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
  parentWidget: {
    backgroundColor: "#ede7dc",
    borderRadius: 28,
    padding: 14,
    paddingTop: 12,
    gap: 12,
    marginTop: -110,
    marginHorizontal: -20,
    zIndex: 10,
  },
  parentLevelHeader: {
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  parentLevelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
    letterSpacing: 0.3,
  },
  surface: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: CARD_RADIUS,
    padding: CARD_PADDING,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.7)",
    gap: 14,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  streakCard: {
    // Slightly more prominent
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
  },
  streakHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  streakTitleBlock: {
    flex: 1,
  },
  streakTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  streakSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9ca3af",
    marginTop: 2,
  },
  xpBadge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  xpBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E65100",
  },
  todayBlock: {
    gap: 4,
  },
  xpLine: {
    fontSize: 16,
    fontWeight: "700",
    color: "#22A45D",
  },
  todaySub: {
    color: "#6b7280",
    fontSize: 14,
  },
  slimCta: {
    backgroundColor: "#22A45D",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#1E8F52",
  },
  slimCtaPressed: {
    opacity: 0.92,
  },
  slimCtaText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  slimCtaIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  slimCtaPlus: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    marginTop: -1,
  },
  overviewCard: {
    padding: CARD_PADDING,
    borderRadius: CARD_RADIUS,
    backgroundColor: "#ffffff",
    borderColor: "#ede7dc",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#ede7dc",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#22A45D",
  },
  spendingWidget: {
    gap: 10,
  },
  spendingTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headlineStack: {
    flex: 1,
    gap: 3,
  },
  spendingRemaining: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
  },
  spendingSpent: {
    fontSize: 15,
    color: "#6b7280",
  },
  progressCaption: {
    fontSize: 12,
    color: "#6b7280",
  },
  budgetHelper: {
    fontSize: 12,
    color: "#6b7280",
  },
  summaryHeaderActions: {
    alignItems: "flex-end",
    gap: 6,
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34,164,93,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(34,164,93,0.3)",
    gap: 3,
  },
  trendBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#22A45D",
  },
  trendBadgeIcon: {
    fontSize: 11,
    color: "#22A45D",
  },
  metricHelper: {
    fontSize: 12,
    color: "#6b7280",
    letterSpacing: 0.2,
  },
  summaryHint: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 1,
  },
  suggestedCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f6f3ed",
    borderWidth: 1,
    borderColor: "#ede7dc",
    gap: 2,
  },
  suggestedValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  summaryEmpty: {
    marginTop: 4,
    gap: 6,
  },
  summaryEmptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  summaryEmptyCopy: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  summaryEmptyActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  summaryPrimaryButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#22A45D",
    paddingVertical: 11,
    alignItems: "center",
  },
  summaryPrimaryText: {
    color: "#f8fafc",
    fontWeight: "700",
    fontSize: 14,
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
