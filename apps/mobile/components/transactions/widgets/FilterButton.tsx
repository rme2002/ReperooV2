import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

type FilterButtonProps = {
  activeFilterCount: number;
  onPress: () => void;
};

export function FilterButton({
  activeFilterCount,
  onPress,
}: FilterButtonProps) {
  const buttonText =
    activeFilterCount > 0 ? `Filter (${activeFilterCount})` : "Filter";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.filterButton,
        pressed && styles.filterButtonPressed,
      ]}
      onPress={onPress}
    >
      <Text style={styles.filterIcon}>⚙</Text>
      <Text style={styles.filterText}>{buttonText}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filterButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 6,
  },
  filterButtonPressed: {
    opacity: 0.7,
  },
  filterIcon: {
    fontSize: 16,
  },
  filterText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
});
