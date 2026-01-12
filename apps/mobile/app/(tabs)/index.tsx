import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { AddExpenseModal } from "@/components/modals/AddExpenseModal";
import { AddIncomeModal } from "@/components/modals/AddIncomeModal";
import { profileOverview } from "@/components/dummy_data/profile";
import { useCurrencyFormatter } from "@/components/profile/useCurrencyFormatter";
import { insightMonths } from "@/components/dummy_data/insights";
import { useBudgetContext } from "@/components/budget/BudgetProvider";

const overview = profileOverview;
const currentMonthSnapshot = insightMonths[0];
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export default function OverviewScreen() {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const { width } = useWindowDimensions();
  const { formatCurrency } = useCurrencyFormatter();
  const fabSize = Math.max(52, Math.min(64, width * 0.16));
  const monthSnapshot = currentMonthSnapshot;

  const { budgetPlan, isLoading } = useBudgetContext();

  const monthCurrentDate = useMemo(() => {
    const date = new Date(monthSnapshot.currentDate);
    if (Number.isNaN(date.getTime())) {
      const fallback = new Date();
      fallback.setHours(0, 0, 0, 0);
      return fallback;
    }
    date.setHours(0, 0, 0, 0);
    return date;
  }, [monthSnapshot.currentDate]);

  const hasBudget = Boolean(budgetPlan);
  const totalBudget = budgetPlan?.expected_income ?? 0;
  const totalSpent = monthSnapshot.totalSpent;
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
  const avgSpendPerDay = monthSnapshot.loggedDays
    ? totalSpent / monthSnapshot.loggedDays
    : totalSpent;
  const safeDaysLeft = Math.max(daysLeft, 0);
  const dailyPace = safeDaysLeft > 0 ? remainingBudget / safeDaysLeft : 0;
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
  let statusBadgeLabel: "On track" | "Attention" | "Risk" | null = null;
  let badgeTone = styles.badgePositive;
  let badgeTextTone = styles.badgeTextPositive;
  if (hasBudget) {
    if (remainingBudget < 0) {
      statusBadgeLabel = "Risk";
      badgeTone = styles.badgeDanger;
      badgeTextTone = styles.badgeTextDanger;
    } else if (avgSpendPerDay > dailyPace && safeDaysLeft > 0) {
      statusBadgeLabel = "Attention";
      badgeTone = styles.badgeWarn;
      badgeTextTone = styles.badgeTextWarn;
    } else {
      statusBadgeLabel = "On track";
    }
  }
  const todayFormatted = formatCurrency(overview.todayAmount, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const todayLine = `Today: ${todayFormatted} · ${overview.todayItems} items`;
  const handleSetPlanPress = () => {
    router.push("/(tabs)/insights");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <Text style={styles.mascot}>🦘</Text>
            <Text style={styles.brand}>Reperoo</Text>
          </View>
          <View style={styles.levelPill}>
            <Text style={styles.levelText}>Level {overview.level}</Text>
          </View>
        </View>

        <View style={styles.surface}>
          <View style={styles.streakRow}>
            <Text style={styles.streakIcon}>🔥</Text>
            <View style={styles.streakCopy}>
              <Text style={styles.streakTitle}>
                {overview.streakDays}-day streak
              </Text>
              <Text style={styles.streakMeta}>
                +{overview.xp} XP on the board
              </Text>
            </View>
          </View>

          <View style={styles.todayBlock}>
            <Text style={styles.todayLine}>{todayLine}</Text>
            {overview.hasLoggedToday ? (
              <Text style={styles.todaySub}>You've logged today 🎉</Text>
            ) : (
              <Text style={styles.todaySub}>
                Log now to keep the streak alive
              </Text>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
            onPress={() => setShowAdd(true)}
          >
            <Text style={styles.primaryButtonText}>Log today's spending</Text>
          </Pressable>
        </View>

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
                {statusBadgeLabel ? (
                  <View style={[styles.badge, badgeTone]}>
                    <Text style={[styles.badgeText, badgeTextTone]}>
                      {statusBadgeLabel}
                    </Text>
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
      </ScrollView>
      {showActions ? (
        <Pressable
          style={styles.fabBackdrop}
          onPress={() => setShowActions(false)}
        >
          <View />
        </Pressable>
      ) : null}
      <View style={[styles.fabStack, { right: 16, bottom: 28 }]}>
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
      </View>
      <AddExpenseModal visible={showAdd} onClose={() => setShowAdd(false)} />
      <AddIncomeModal
        visible={showIncome}
        onClose={() => setShowIncome(false)}
        monthKey={monthSnapshot.key}
        currentDate={monthSnapshot.currentDate}
      />
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
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 32,
    flexGrow: 1,
    minHeight: "100%",
    gap: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mascot: {
    fontSize: 26,
  },
  brand: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  levelPill: {
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  levelText: {
    color: "#f8fafc",
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  surface: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ede7dc",
    gap: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  streakIcon: {
    fontSize: 28,
  },
  streakCopy: {
    gap: 2,
  },
  streakTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  streakMeta: {
    marginTop: 4,
    color: "#6b7280",
    fontSize: 15,
  },
  todayBlock: {
    gap: 6,
  },
  todayLine: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  todaySub: {
    color: "#6b7280",
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#0b1222",
  },
  primaryButtonPressed: {
    opacity: 0.92,
    borderColor: "#1f2937",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
  },
  overviewCard: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    borderColor: "#ede7dc",
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
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  badgePositive: {
    borderColor: "rgba(22,163,74,0.4)",
    backgroundColor: "rgba(22,163,74,0.12)",
  },
  badgeWarn: {
    borderColor: "rgba(234,179,8,0.4)",
    backgroundColor: "rgba(234,179,8,0.16)",
  },
  badgeDanger: {
    borderColor: "rgba(239,68,68,0.4)",
    backgroundColor: "rgba(239,68,68,0.12)",
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
  spendingWidget: {
    gap: 12,
  },
  spendingTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  headlineStack: {
    flex: 1,
    gap: 4,
  },
  spendingRemaining: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111827",
  },
  spendingSpent: {
    fontSize: 16,
    color: "#6b7280",
  },
  progressCaptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressCaption: {
    fontSize: 13,
    color: "#6b7280",
  },
  budgetHelper: {
    fontSize: 13,
    color: "#6b7280",
  },
  summaryHeaderActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  inlineCta: {
    borderWidth: 1,
    borderColor: "#111827",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  inlineCtaPressed: {
    opacity: 0.9,
  },
  inlineCtaText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  metricHelper: {
    fontSize: 13,
    color: "#6b7280",
    letterSpacing: 0.2,
  },
  summaryHint: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  suggestedCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#f6f3ed",
    borderWidth: 1,
    borderColor: "#ede7dc",
    borderTopWidth: 1.4,
    borderTopColor: "#e5ddcf",
    gap: 2,
  },
  suggestedValue: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
  },
  summaryEmpty: {
    marginTop: 6,
    gap: 8,
  },
  summaryEmptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  summaryEmptyCopy: {
    fontSize: 14,
    color: "#6b7280",
  },
  summaryEmptyActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  summaryPrimaryButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#111827",
    paddingVertical: 12,
    alignItems: "center",
  },
  summaryPrimaryText: {
    color: "#f8fafc",
    fontWeight: "700",
  },
  summarySecondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#111827",
    paddingVertical: 12,
    alignItems: "center",
  },
  summarySecondaryText: {
    color: "#111827",
    fontWeight: "700",
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
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#0b1222",
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
