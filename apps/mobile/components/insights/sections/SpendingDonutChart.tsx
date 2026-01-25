import { StyleSheet, Text, View } from "react-native";
import { Circle, Svg } from "react-native-svg";
import { colors } from "@/constants/theme";
import { getCategoryLabel } from "@/utils/categoryLookup";

interface CategoryData {
  id: string;
  percent: number;
  color: string;
  total?: number;
}

type SpendingDonutChartProps = {
  categories: CategoryData[];
  totalSpent: number;
  formatCurrency: (value: number) => string;
  width: number;
};

export function SpendingDonutChart({
  categories,
  totalSpent,
  formatCurrency,
  width,
}: SpendingDonutChartProps) {
  const chartSize = Math.max(200, Math.min(width - 48, 260));
  const pieStroke = Math.max(14, chartSize * 0.12);
  const pieRadius = chartSize / 2 - pieStroke / 2;
  const centerSize = chartSize * 0.56;
  const circumference = 2 * Math.PI * pieRadius;

  const pieSegments = categories.reduce<
    {
      length: number;
      offset: number;
      color: string;
      id: string;
      label: string;
    }[]
  >((acc, cat) => {
    const prevTotal = acc.reduce((sum, item) => sum + item.length, 0);
    const length = (cat.percent / 100) * circumference;
    const offset = prevTotal;
    return [
      ...acc,
      {
        length,
        offset,
        color: cat.color,
        id: cat.id,
        label: getCategoryLabel(cat.id),
      },
    ];
  }, []);

  const mid = Math.ceil(categories.length / 2);
  const left = categories.slice(0, mid);
  const right = categories.slice(mid);

  return (
    <View style={styles.surface}>
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
              stroke={colors.borderLight}
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
              {
                width: centerSize,
                height: centerSize,
                borderRadius: centerSize / 2,
              },
            ]}
          >
            <Text style={styles.donutValue}>{formatCurrency(totalSpent)}</Text>
            <Text style={styles.donutLabel}>This month</Text>
          </View>
        </View>
        <View style={styles.legendColumns}>
          <View style={styles.legendColumn}>
            {left.map((cat) => {
              const label = getCategoryLabel(cat.id);
              return (
                <View key={`legend-left-${cat.id}`} style={styles.legendRow}>
                  <View style={styles.legendLeft}>
                    <View
                      style={[styles.legendDot, { backgroundColor: cat.color }]}
                    />
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
                    <View
                      style={[styles.legendDot, { backgroundColor: cat.color }]}
                    />
                    <Text style={styles.legendLabel}>{label}</Text>
                  </View>
                  <Text style={styles.legendPercent}>{cat.percent}%</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
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
  sectionHeaderCentered: {
    alignItems: "center",
    gap: 4,
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
  donutRow: {
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
  },
  donut: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  svg: {
    position: "absolute",
  },
  donutCenter: {
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  donutValue: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
  },
  donutLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  legendColumns: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
  },
  legendColumn: {
    flex: 1,
    gap: 8,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  legendLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "500",
    flex: 1,
  },
  legendPercent: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "600",
  },
});
