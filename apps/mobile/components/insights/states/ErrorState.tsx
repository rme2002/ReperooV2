import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

type ErrorStateProps = {
  error?: string;
  onRetry: () => void;
};

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.emptyTitle}>Error loading insights</Text>
        <Text style={styles.emptyCopy}>
          {error || "We couldn't load your insights data. Please try again."}
        </Text>
        <Pressable style={styles.primaryButton} onPress={onRetry}>
          <Text style={styles.primaryButtonText}>Retry</Text>
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
