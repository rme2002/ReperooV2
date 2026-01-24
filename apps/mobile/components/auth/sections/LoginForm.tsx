import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import { AuthFormField } from "../widgets/AuthFormField";
import { AuthButton } from "../widgets/AuthButton";

type LoginFormProps = {
  email: string;
  password: string;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: () => void;
  loading: boolean;
};

export function LoginForm({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  loading,
}: LoginFormProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Log in with Supabase</Text>
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
      <AuthButton
        title={loading ? "Signing in…" : "Continue"}
        onPress={onSubmit}
        loading={loading}
        variant="primary"
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
