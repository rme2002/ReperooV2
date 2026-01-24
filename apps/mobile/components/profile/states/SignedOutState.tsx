import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

type SignedOutStateProps = {
  onGoToLogin: () => void;
};

export function SignedOutState({ onGoToLogin }: SignedOutStateProps) {
  return (
    <View style={styles.signedOutCard}>
      <Text style={styles.title}>You're signed out</Text>
      <Text style={styles.subtitle}>
        Log back in to change your display name, currency, or account actions.
      </Text>
      <Pressable
        onPress={onGoToLogin}
        style={({ pressed }) => [
          styles.primaryCta,
          pressed && styles.primaryCtaPressed,
        ]}
      >
        <Text style={styles.primaryCtaLabel}>Go to login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  signedOutCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  primaryCta: {
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryCtaPressed: {
    opacity: 0.9,
  },
  primaryCtaLabel: {
    color: colors.textLight,
    fontSize: 15,
    fontWeight: "700",
  },
});
