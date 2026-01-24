import { useCallback, useEffect, useMemo, useState } from "react";
import { PanResponder, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "@/constants/theme";
import {
  clamp,
  percentFromValue,
  sanitizeGoalValue,
  snapGoalValue,
  valueFromPercent,
} from "@/utils/insightsMath";
import { formatNumber } from "@/utils/insightsFormatters";
import { LINEAR_MAX } from "@/utils/insightsConstants";

type GoalSliderProps = {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
  currencySymbol: string;
  formatValue: (value: number) => string;
};

export function GoalSlider({
  label,
  value,
  max,
  onChange,
  currencySymbol,
  formatValue,
}: GoalSliderProps) {
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
      const nextValue = shouldSnap
        ? snapGoalValue(rawValue, maxValue)
        : sanitizeGoalValue(rawValue, maxValue);
      onChange(nextValue);
    },
    [trackWidth, maxValue, onChange]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) =>
          updateFromLocation(event.nativeEvent.locationX),
        onPanResponderMove: (event) =>
          updateFromLocation(event.nativeEvent.locationX),
        onPanResponderRelease: (event) =>
          updateFromLocation(event.nativeEvent.locationX, true),
        onPanResponderTerminate: (event) =>
          updateFromLocation(event.nativeEvent.locationX, true),
      }),
    [updateFromLocation]
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
          placeholderTextColor={colors.textTertiary}
        />
      </View>
      <View
        style={styles.goalSliderTrack}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={[styles.goalSliderFill, { width: `${percent * 100}%` }]} />
        <View
          style={[styles.goalSliderThumb, { left: `${percent * 100}%` }]}
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
  goalSliderInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  goalSliderInputPrefix: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  goalSliderInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    padding: 0,
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
  goalSliderThumb: {
    position: "absolute",
    top: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.surface,
    marginLeft: -10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
