import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "@/constants/theme";

type AuthButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary";
  disabled?: boolean;
};

export function AuthButton({
  title,
  onPress,
  loading = false,
  variant = "primary",
  disabled = false,
}: AuthButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      style={({ pressed }) => [
        isPrimary ? styles.primaryButton : styles.secondaryButton,
        (pressed || loading || disabled) && styles.buttonPressed,
      ]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      <Text
        style={
          isPrimary ? styles.primaryButtonText : styles.secondaryButtonText
        }
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    marginTop: 8,
    backgroundColor: colors.primaryDark,
    borderRadius: 16,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: "700",
  },
});
