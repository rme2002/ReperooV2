import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import { AuthFormField } from "../widgets/AuthFormField";
import { AuthButton } from "../widgets/AuthButton";

type SignupFormProps = {
  email: string;
  password: string;
  confirmPassword: string;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange: (password: string) => void;
  onSubmit: () => void;
  loading: boolean;
};

export function SignupForm({
  email,
  password,
  confirmPassword,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  loading,
}: SignupFormProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Create account via API</Text>
      <AuthFormField
        label="Email"
        value={email}
        onChangeText={onEmailChange}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <AuthFormField
        label="Password"
        value={password}
        onChangeText={onPasswordChange}
        secureTextEntry
        placeholder="••••••••"
      />
      <AuthFormField
        label="Confirm password"
        value={confirmPassword}
        onChangeText={onConfirmPasswordChange}
        secureTextEntry
        placeholder="••••••••"
      />
      <AuthButton
        title={loading ? "Creating…" : "Create account"}
        onPress={onSubmit}
        loading={loading}
        variant="secondary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
});
