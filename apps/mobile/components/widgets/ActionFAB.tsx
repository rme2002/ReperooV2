import { Pressable, StyleSheet, Text, View } from "react-native";
import { alpha, colors } from "@/constants/theme";

type ActionFABProps = {
  showActions: boolean;
  onToggleActions: (show: boolean) => void;
  onAddExpense: () => void;
  onAddIncome: () => void;
  fabSize?: number;
};

export function ActionFAB({
  showActions = false,
  onToggleActions = () => {},
  onAddExpense,
  onAddIncome,
  fabSize = 56,
}: ActionFABProps) {
  return (
    <>
      {showActions && (
        <Pressable
          style={styles.fabBackdrop}
          onPress={() => onToggleActions(false)}
        >
          <View />
        </Pressable>
      )}
      <View style={[styles.fabStack, { right: 16, bottom: 28 }]}>
        {showActions ? (
          <View style={styles.fabMenuColumn}>
            <Pressable
              style={({ pressed }) => [
                styles.fabAction,
                pressed && styles.fabActionPressed,
              ]}
              onPress={onAddExpense}
            >
              <Text style={styles.fabActionLabel}>Add expense</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.fabAction,
                styles.fabActionSecondary,
                pressed && styles.fabActionPressed,
              ]}
              onPress={onAddIncome}
            >
              <Text
                style={[
                  styles.fabActionLabel,
                  styles.fabActionLabelSecondary,
                ]}
              >
                Add income
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.fab,
              {
                width: fabSize,
                height: fabSize,
                borderRadius: fabSize / 2,
              },
              pressed && styles.fabPressed,
            ]}
            onPress={() => onToggleActions(true)}
          >
            <Text style={styles.fabIcon}>+</Text>
          </Pressable>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fabBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: alpha.ink20,
  },
  fabStack: {
    position: "absolute",
    alignItems: "flex-end",
    gap: 10,
  },
  fab: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primaryDark,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  fabMenuColumn: {
    flexDirection: "column",
    gap: 8,
  },
  fabAction: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  fabActionSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  fabActionLabel: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: "700",
  },
  fabActionLabelSecondary: {
    color: colors.text,
  },
  fabActionPressed: {
    opacity: 0.85,
  },
  fabPressed: {
    opacity: 0.9,
  },
  fabIcon: {
    color: colors.textLight,
    fontSize: 26,
    fontWeight: "800",
    marginTop: -2,
  },
});
