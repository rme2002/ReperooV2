import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, palette, shadows } from "@/constants/theme";

type ActiveFiltersChipsProps = {
  activeCategories: string[];
  showRecurringOnly: boolean;
  onRemoveCategory: (categoryId: string) => void;
  onRemoveRecurring: () => void;
  getCategoryLabel: (id: string) => string;
};

export function ActiveFiltersChips({
  activeCategories,
  showRecurringOnly,
  onRemoveCategory,
  onRemoveRecurring,
  getCategoryLabel,
}: ActiveFiltersChipsProps) {
  const hasFilters = activeCategories.length > 0 || showRecurringOnly;

  if (!hasFilters) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.chipsWrapper}>
        {activeCategories.map((categoryId) => (
          <Pressable
            key={categoryId}
            style={({ pressed }) => [
              styles.chip,
              pressed && styles.chipPressed,
            ]}
            onPress={() => onRemoveCategory(categoryId)}
          >
            <Text style={styles.chipText}>
              {getCategoryLabel(categoryId)}
            </Text>
            <Text style={styles.chipClose}>×</Text>
          </Pressable>
        ))}
        {showRecurringOnly && (
          <Pressable
            style={({ pressed }) => [
              styles.chip,
              pressed && styles.chipPressed,
            ]}
            onPress={onRemoveRecurring}
          >
            <Text style={styles.chipText}>Recurring</Text>
            <Text style={styles.chipClose}>×</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  chipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.slate190,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.slate270,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
    ...shadows.small,
  },
  chipPressed: {
    opacity: 0.7,
    backgroundColor: palette.slate200,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.gray900,
    letterSpacing: 0.2,
  },
  chipClose: {
    fontSize: 16,
    fontWeight: '500',
    color: palette.gray600,
    lineHeight: 16,
    marginTop: -1,
  },
});
