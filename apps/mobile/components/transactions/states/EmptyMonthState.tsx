import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

type EmptyMonthStateProps = {
  onAddTransaction: () => void;
};

export function EmptyMonthState({ onAddTransaction }: EmptyMonthStateProps) {
  return (
    <View style={[styles.emptyState, styles.listCard]}>
      <Text style={styles.emptyTitle}>No transactions yet</Text>
      <Text style={styles.emptyCopy}>Log spending to see it appear here.</Text>
      <Pressable style={styles.primaryButton} onPress={onAddTransaction}>
        <Text style={styles.primaryButtonText}>Log spending</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  listCard: {
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  emptyCopy: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: "700",
  },
});
