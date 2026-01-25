import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

type AddTransactionMenuProps = {
  visible: boolean;
  onAddExpense: () => void;
  onAddIncome: () => void;
  onClose: () => void;
};

export function AddTransactionMenu({
  visible,
  onAddExpense,
  onAddIncome,
  onClose,
}: AddTransactionMenuProps) {
  if (!visible) {
    return null;
  }

  return (
    <>
      <Pressable style={styles.addMenuBackdrop} onPress={onClose} />
      <View style={styles.addMenuCard}>
        <Pressable style={styles.addMenuOption} onPress={onAddExpense}>
          <Text style={styles.addMenuOptionLabel}>Add Expense</Text>
        </Pressable>
        <Pressable
          style={[styles.addMenuOption, styles.addMenuOptionSecondary]}
          onPress={onAddIncome}
        >
          <Text
            style={[
              styles.addMenuOptionLabel,
              styles.addMenuOptionLabelSecondary,
            ]}
          >
            Add Income
          </Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  addMenuBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  addMenuCard: {
    position: "absolute",
    top: 44,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    gap: 6,
    minWidth: 156,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 20,
  },
  addMenuOption: {
    borderRadius: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addMenuOptionSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addMenuOptionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textLight,
    textAlign: "center",
  },
  addMenuOptionLabelSecondary: {
    color: colors.text,
  },
});
