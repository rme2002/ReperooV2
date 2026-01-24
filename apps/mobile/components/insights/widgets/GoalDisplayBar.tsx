import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

type GoalDisplayBarProps = {
  label: string;
  value: number;
  max: number;
  formatValue: (value: number) => string;
  actual?: number;
  showProgress?: boolean;
};

export function GoalDisplayBar({
  label,
  value,
  max,
  formatValue,
  actual,
  showProgress,
}: GoalDisplayBarProps) {
  const normalizedMax = Math.max(max, value, 1);

  // Calculate percentage based on mode
  const percent = showProgress
    ? value > 0
      ? Math.min((actual ?? 0) / value, 1)
      : 0
    : value / normalizedMax;

  // Format display text based on mode
  const displayText = showProgress
    ? `${formatValue(actual ?? 0)} of ${formatValue(value)}`
    : formatValue(value);

  // Calculate actual percentage for display (can exceed 100%)
  const actualPercent =
    showProgress && value > 0
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
            { width: `${percent * 100}%` },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  goalSlider: {
    gap: 12,
  },
  goalSliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  goalSliderLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  goalSliderValue: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  goalDisplayValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  goalProgressPercent: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  goalSliderTrack: {
    height: 8,
    backgroundColor: colors.borderLight,
    borderRadius: 4,
    position: "relative",
    overflow: "hidden",
  },
  goalSliderFill: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  goalSliderFillReadonly: {
    backgroundColor: colors.primary,
  },
  goalSliderFillProgress: {
    backgroundColor: colors.success,
  },
});
