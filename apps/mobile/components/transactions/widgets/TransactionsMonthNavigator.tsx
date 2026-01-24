import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

type TransactionsMonthNavigatorProps = {
  monthLabel: string;
  entryCount: number;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
};

export function TransactionsMonthNavigator({
  monthLabel,
  entryCount,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
}: TransactionsMonthNavigatorProps) {
  return (
    <>
      <View style={styles.monthSelector}>
        <Pressable
          onPress={onPrevious}
          disabled={!canGoPrevious}
          style={[
            styles.monthArrow,
            !canGoPrevious && styles.monthArrowDisabled,
          ]}
        >
          <Text style={styles.monthArrowText}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable
          onPress={onNext}
          disabled={!canGoNext}
          style={[styles.monthArrow, !canGoNext && styles.monthArrowDisabled]}
        >
          <Text style={styles.monthArrowText}>›</Text>
        </Pressable>
      </View>
      <Text style={styles.entryCount}>{entryCount} entries</Text>
    </>
  );
}

const styles = StyleSheet.create({
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  monthArrowDisabled: {
    opacity: 0.4,
  },
  monthArrowText: {
    fontSize: 18,
    color: colors.text,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  entryCount: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
