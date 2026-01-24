import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AddExpenseModal } from "@/components/modals/AddExpenseModal";
import { profileOverview, profileQuickStats } from "@/components/dummy_data/profile";
import { useCurrencyFormatter } from "@/components/profile/useCurrencyFormatter";
import { alpha, colors, palette } from "@/constants/theme";

const overview = profileOverview;
const quickStats = profileQuickStats;

export default function OverviewScreen() {
  const [showAdd, setShowAdd] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const { width } = useWindowDimensions();
  const { formatCurrency } = useCurrencyFormatter();
  const fabSize = Math.max(52, Math.min(64, width * 0.16));
  const monthlySpent = Math.max(overview.monthlyBudget - overview.monthlyRemaining, 0);
  const progress = overview.monthlyBudget ? Math.min(monthlySpent / overview.monthlyBudget, 1) : 0;
  const monthlyStatus =
    progress < 0.75 ? "On track" : progress < 0.95 ? "Tight" : "Needs focus";
  const statusTone =
    monthlyStatus === "On track"
      ? styles.badgePositive
      : monthlyStatus === "Tight"
        ? styles.badgeWarn
        : styles.badgeDanger;
  const statusTextTone =
    monthlyStatus === "On track"
      ? styles.badgeTextPositive
      : monthlyStatus === "Tight"
        ? styles.badgeTextWarn
        : styles.badgeTextDanger;
  const todayLine = `Today: ${formatCurrency(overview.todayAmount, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} · ${overview.todayItems} items`;

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
              <Text style={styles.streakTitle}>{overview.streakDays}-day streak</Text>
              <Text style={styles.streakMeta}>+{overview.xp} XP on the board</Text>
            </View>
          </View>

          <View style={styles.todayBlock}>
            <Text style={styles.todayLine}>{todayLine}</Text>
            {overview.hasLoggedToday ? (
              <Text style={styles.todaySub}>You've logged today 🎉</Text>
            ) : (
              <Text style={styles.todaySub}>Log now to keep the streak alive</Text>
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

        <View style={styles.surface}>
          <View style={styles.spendingWidget}>
            <View style={styles.spendingTopRow}>
              <View>
                <Text style={styles.spendingRemaining}>
                  {formatCurrency(overview.monthlyRemaining)} left
                </Text>
                <Text style={styles.spendingSpent}>{formatCurrency(monthlySpent)} spent</Text>
              </View>
              <View style={[styles.badge, statusTone]}>
                <Text style={[styles.badgeText, statusTextTone]}>{monthlyStatus}</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <View style={styles.progressCaptionRow}>
              <Text style={styles.progressCaption}>Monthly budget</Text>
              <Text style={styles.progressCaption}>{`${Math.round(progress * 100)}% used`}</Text>
            </View>
            <View style={[styles.quickGrid, styles.quickGridInline]}>
              {quickStats.map((item) => (
                <View key={item.label} style={[styles.statCard, styles.inlineStatCard]}>
                  <Text style={styles.statLabel}>{item.label}</Text>
                  <Text style={styles.statValue}>{formatCurrency(item.value)}</Text>
                  <Text style={styles.statHint}>
                    {item.hintValue != null
                      ? `${item.hintPrefix ?? ""}${formatCurrency(item.hintValue)}`
                      : item.hintText ?? ""}
                  </Text>
                </View>
              ))}
            </View>
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
    color: colors.text,
  },
  levelPill: {
    backgroundColor: palette.gray900,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  levelText: {
    color: palette.slate190,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  surface: {
    backgroundColor: palette.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.sand200,
    gap: 16,
    shadowColor: palette.slate900,
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
    color: palette.gray900,
  },
  streakMeta: {
    marginTop: 4,
    color: palette.gray500,
    fontSize: 15,
  },
  todayBlock: {
    gap: 6,
  },
  todayLine: {
    fontSize: 20,
    fontWeight: "800",
    color: palette.gray900,
  },
  todaySub: {
    color: palette.gray500,
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  primaryButtonPressed: {
    opacity: 0.92,
    borderColor: colors.primaryDark,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textLight,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: palette.sand200,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: palette.gray900,
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
    borderColor: alpha.green40,
    backgroundColor: alpha.green12,
  },
  badgeWarn: {
    borderColor: alpha.amber40,
    backgroundColor: alpha.amber16,
  },
  badgeDanger: {
    borderColor: alpha.red40,
    backgroundColor: alpha.red12,
  },
  badgeTextPositive: {
    color: palette.green800,
  },
  badgeTextWarn: {
    color: palette.amber800,
  },
  badgeTextDanger: {
    color: palette.red700,
  },
  spendingWidget: {
    gap: 12,
  },
  spendingTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  spendingRemaining: {
    fontSize: 34,
    fontWeight: "800",
    color: palette.gray900,
  },
  spendingSpent: {
    fontSize: 16,
    color: palette.gray500,
  },
  progressCaptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressCaption: {
    fontSize: 13,
    color: palette.gray500,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.gray900,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickGridInline: {
    marginTop: 12,
    flexWrap: "nowrap",
  },
  statCard: {
    flexGrow: 1,
    minWidth: "30%",
    padding: 12,
    borderRadius: 12,
    backgroundColor: palette.sand130,
    borderWidth: 1,
    borderColor: palette.sand200,
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: palette.gray500,
    letterSpacing: 0.2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: palette.gray900,
  },
  statHint: {
    fontSize: 13,
    color: palette.gray500,
  },
  inlineStatCard: {
    flex: 1,
    minWidth: 0,
    flexBasis: "48%",
  },
  fabBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: alpha.ink20,
  },
  fabStack: {
    position: "absolute",
    alignItems: "flex-end",
    gap: 10,
  },
  fab: {
    backgroundColor: palette.gray900,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.slate900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: palette.slate910,
  },
  fabMenuColumn: {
    flexDirection: "column",
    gap: 8,
  },
  fabAction: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: palette.gray900,
    borderWidth: 1,
    borderColor: palette.gray900,
    shadowColor: palette.slate900,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  fabActionSecondary: {
    backgroundColor: palette.slate190,
    borderColor: palette.slate230,
  },
  fabActionLabel: {
    color: palette.slate190,
    fontSize: 14,
    fontWeight: "700",
  },
  fabActionLabelSecondary: {
    color: palette.slate900,
  },
  fabActionPressed: {
    opacity: 0.85,
  },
  fabPressed: {
    opacity: 0.9,
  },
  fabIcon: {
    color: palette.slate190,
    fontSize: 26,
    fontWeight: "800",
    marginTop: -2,
  },
});
