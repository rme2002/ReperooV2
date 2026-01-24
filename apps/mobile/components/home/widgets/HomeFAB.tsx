import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

type HomeFABProps = {
  showActions: boolean;
  onToggleActions: () => void;
  onAddExpense: () => void;
  onAddIncome: () => void;
};

export function HomeFAB({
  showActions,
  onToggleActions,
  onAddExpense,
  onAddIncome,
}: HomeFABProps) {
  return (
    <>
      {showActions ? (
        <Pressable style={styles.fabBackdrop} onPress={onToggleActions}>
          <View />
        </Pressable>
      ) : null}

      <View style={[styles.fabStack, { right: 16, bottom: 28 }]}>
        {showActions ? (
          <View style={styles.fabMenuColumn}>
            <Pressable
              style={({ pressed }) => [
                styles.fabAction,
                pressed && styles.fabActionPressed,
              ]}
              onPress={() => {
                onToggleActions();
                onAddExpense();
              }}
            >
              <Text style={styles.fabActionLabel}>Add expense</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.fabAction,
                styles.fabActionSecondary,
                pressed && styles.fabActionPressed,
              ]}
              onPress={() => {
                onToggleActions();
                onAddIncome();
              }}
            >
              <Text style={[styles.fabActionLabel, styles.fabActionLabelSecondary]}>
                Add income
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
            onPress={onToggleActions}
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
    backgroundColor: `${colors.text}33`,
  },
  fabStack: {
    position: "absolute",
    alignItems: "flex-end",
    gap: 8,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  fabPressed: {
    opacity: 0.9,
  },
  fabIcon: {
    color: colors.textLight,
    fontSize: 24,
    fontWeight: "800",
    marginTop: -2,
  },
  fabMenuColumn: {
    flexDirection: "column",
    gap: 6,
  },
  fabAction: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  fabActionSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  fabActionLabel: {
    color: colors.textLight,
    fontSize: 13,
    fontWeight: "700",
  },
  fabActionLabelSecondary: {
    color: colors.text,
  },
  fabActionPressed: {
    opacity: 0.85,
  },
});
