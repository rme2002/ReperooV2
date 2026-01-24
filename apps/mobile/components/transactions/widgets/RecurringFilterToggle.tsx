import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

type RecurringFilterToggleProps = {
  showRecurringOnly: boolean;
  onToggle: () => void;
};

export function RecurringFilterToggle({
  showRecurringOnly,
  onToggle,
}: RecurringFilterToggleProps) {
  return (
    <View style={styles.recurringFilterRow}>
      <Pressable
        onPress={onToggle}
        style={[
          styles.recurringFilterChip,
          showRecurringOnly && styles.recurringFilterChipActive,
        ]}
      >
        <Text
          style={[
            styles.recurringFilterText,
            showRecurringOnly && styles.recurringFilterTextActive,
          ]}
        >
          Recurring only
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  recurringFilterRow: {
    marginTop: 12,
    marginBottom: 8,
  },
  recurringFilterChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  recurringFilterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  recurringFilterText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  recurringFilterTextActive: {
    color: colors.textLight,
  },
});
