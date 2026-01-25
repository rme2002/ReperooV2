import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import type { ExpenseCategory } from "@/lib/gen/model";

type CategoryFilterChipsProps = {
  activeCategory: string | null;
  onSelect: (value: string | null) => void;
  bottomSpacing?: number;
  categories: ExpenseCategory[];
};

export function CategoryFilterChips({
  activeCategory,
  onSelect,
  bottomSpacing = 16,
  categories,
}: CategoryFilterChipsProps) {
  const chips = [
    { id: null, label: "All" },
    ...categories.map((cat) => ({ id: cat.id, label: cat.label })),
  ];

  return (
    <View style={{ marginBottom: bottomSpacing }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {chips.map((chip) => {
          const isActive =
            chip.id === activeCategory ||
            (chip.id === null && activeCategory === null);
          return (
            <Pressable
              key={chip.id ?? "all"}
              onPress={() => {
                if (chip.id === null) {
                  onSelect(null);
                  return;
                }
                onSelect(isActive ? null : chip.id);
              }}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text
                style={[styles.chipText, isActive && styles.chipTextActive]}
              >
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipScroll: {
    flexGrow: 0,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  chipTextActive: {
    color: colors.textLight,
  },
});
