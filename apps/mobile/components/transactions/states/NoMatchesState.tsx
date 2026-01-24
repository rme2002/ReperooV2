import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

type NoMatchesStateProps = {
  onClearFilters: () => void;
};

export function NoMatchesState({ onClearFilters }: NoMatchesStateProps) {
  return (
    <View style={[styles.emptyState, styles.listCard]}>
      <Text style={styles.emptyTitle}>No matches found</Text>
      <Text style={styles.emptyCopy}>Try a different search or clear filters.</Text>
      <Pressable style={styles.secondaryButton} onPress={onClearFilters}>
        <Text style={styles.secondaryButtonText}>Clear filters</Text>
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
  secondaryButton: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
});
