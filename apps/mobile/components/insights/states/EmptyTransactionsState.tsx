import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

type EmptyTransactionsStateProps = {
  onAddTransaction: () => void;
};

export function EmptyTransactionsState({
  onAddTransaction,
}: EmptyTransactionsStateProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.emptyTitle}>No transactions yet</Text>
        <Text style={styles.emptyCopy}>
          You haven't logged any transactions for this month
        </Text>
        <Pressable style={styles.primaryButton} onPress={onAddTransaction}>
          <Text style={styles.primaryButtonText}>Add Transaction</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyCopy: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: "600",
  },
});
