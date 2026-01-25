import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import type { WeeklyPoint } from "@/hooks/useInsightsWeekly";

type WeeklySpendingChartProps = {
  weeklyPoints: WeeklyPoint[];
  weeklyTotal: number;
  weeklyScaleMax: number;
  weeklyAxisTicks: number[];
  hasWeeklySpending: boolean;
  isLoading: boolean;
  activeWeekIndex: number | null;
  setActiveWeekIndex: (index: number | null) => void;
  formatCurrency: (value: number) => string;
  width: number;
};

export function WeeklySpendingChart({
  weeklyPoints,
  weeklyTotal,
  weeklyScaleMax,
  weeklyAxisTicks,
  hasWeeklySpending,
  isLoading,
  activeWeekIndex,
  setActiveWeekIndex,
  formatCurrency,
  width,
}: WeeklySpendingChartProps) {
  const weeklyChartHeight = Math.min(320, Math.max(200, width * 0.55));
  const weeklyAxisWidth = Math.min(84, Math.max(56, width * 0.16));
  const weeklyTooltipWidth = Math.min(160, Math.max(110, width * 0.32));

  return (
    <View style={styles.surface}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Last 7 days</Text>
          <Text style={styles.subText}>Total spent per week this month</Text>
        </View>
        <Text style={styles.weeklyTotalLabel}>
          {formatCurrency(weeklyTotal)}
        </Text>
      </View>
      {isLoading ? (
        <View style={[styles.weeklySkeletonRow, { height: weeklyChartHeight }]}>
          {Array.from({ length: 5 }).map((_, idx) => (
            <View
              key={`weekly-skeleton-${idx}`}
              style={styles.weeklySkeletonBar}
            />
          ))}
        </View>
      ) : hasWeeklySpending ? (
        <View style={styles.weeklyChartBlock}>
          <View style={styles.weeklyPlotWrapper}>
            <View
              style={[
                styles.weeklyAxisColumn,
                { width: weeklyAxisWidth, height: weeklyChartHeight },
              ]}
            >
              {weeklyAxisTicks.map((value, idx) => (
                <Text
                  key={`weekly-axis-${value}-${idx}`}
                  style={styles.weeklyAxisLabel}
                >
                  {formatCurrency(value)}
                </Text>
              ))}
            </View>
            <View
              style={[styles.weeklyPlotArea, { height: weeklyChartHeight }]}
            >
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
                  weeklyPoints.length === 1 && styles.weeklyBarsRowSingle,
                ]}
              >
                {weeklyPoints.map((point, idx) => {
                  const ratio = weeklyScaleMax
                    ? (point.total / weeklyScaleMax) * 100
                    : 0;
                  const heightPct = point.total === 0 ? 4 : Math.max(12, ratio);
                  const isActive = activeWeekIndex === idx;
                  return (
                    <Pressable
                      key={`week-${point.week}-${idx}`}
                      onPress={() => setActiveWeekIndex(isActive ? null : idx)}
                      style={styles.weeklyBarPressable}
                    >
                      <View
                        style={[
                          styles.weeklyBarWrapper,
                          { minHeight: weeklyChartHeight - 40 },
                        ]}
                      >
                        {isActive ? (
                          <View
                            pointerEvents="none"
                            style={[
                              styles.weeklyTooltip,
                              {
                                width: weeklyTooltipWidth,
                                marginLeft: -weeklyTooltipWidth / 2,
                              },
                            ]}
                          >
                            <Text style={styles.weeklyTooltipValue}>
                              {formatCurrency(point.total)}
                            </Text>
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
        <View
          style={[
            styles.weeklyEmptyState,
            { minHeight: weeklyChartHeight - 20 },
          ]}
        >
          <Text style={styles.weeklyEmptyText}>
            No spending logged this month yet.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    marginBottom: 6,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  subText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  weeklyTotalLabel: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  weeklySkeletonRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-evenly",
    gap: 8,
    paddingHorizontal: 20,
  },
  weeklySkeletonBar: {
    flex: 1,
    backgroundColor: colors.borderLight,
    borderRadius: 8,
    height: "60%",
  },
  weeklyChartBlock: {
    gap: 8,
  },
  weeklyPlotWrapper: {
    flexDirection: "row",
    gap: 8,
  },
  weeklyAxisColumn: {
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  weeklyAxisLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: "500",
    textAlign: "right",
  },
  weeklyPlotArea: {
    flex: 1,
    position: "relative",
  },
  weeklyGridLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  weeklyGridLine: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  weeklyGridLineZero: {
    backgroundColor: colors.border,
  },
  weeklyBarsRow: {
    flexDirection: "row",
    height: "100%",
    gap: 4,
    paddingHorizontal: 4,
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
    justifyContent: "flex-end",
    alignItems: "center",
    position: "relative",
  },
  weeklyBar: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 8,
  },
  weeklyBarActive: {
    backgroundColor: colors.primaryDark,
  },
  weeklyTooltip: {
    position: "absolute",
    top: -32,
    backgroundColor: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  weeklyTooltipValue: {
    color: colors.textLight,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  weeklyXAxisLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "600",
    textAlign: "center",
  },
  weeklyEmptyState: {
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  weeklyEmptyText: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: "center",
  },
});
