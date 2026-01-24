import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

type MonthNavigatorProps = {
  monthLabel: string;
  loggedDays: number;
  totalDays: number;
  onPrevious: () => void;
  onNext: () => void;
};

export function MonthNavigator({
  monthLabel,
  loggedDays,
  totalDays,
  onPrevious,
  onNext,
}: MonthNavigatorProps) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onPrevious} style={styles.navButton}>
        <Text style={styles.navIcon}>‹</Text>
      </Pressable>
      <View style={styles.headerCopy}>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Text style={styles.subText}>
          Logged {loggedDays}/{totalDays} days
        </Text>
      </View>
      <Pressable onPress={onNext} style={styles.navButton}>
        <Text style={styles.navIcon}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: colors.text,
  },
  subText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  navIcon: {
    fontSize: 18,
    color: colors.text,
  },
});
