import { useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import { signUpByEmailAndPassword } from "@/lib/gen/authentication/authentication";
import { alpha } from "@/constants/theme";

import { authFormStyles as styles } from "./AuthFormStyles";

export type RegisterPanelProps = {
  onSubmitSuccess: () => void;
};

export function RegisterPanel({ onSubmitSuccess }: RegisterPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordsMismatch = useMemo(
    () =>
      password.length > 0 &&
      confirmPassword.length > 0 &&
      password !== confirmPassword,
    [password, confirmPassword],
  );

  const handleRegister = async () => {
    if (loading) return;
    if (!email || !password || !confirmPassword) {
      Alert.alert("Missing information", "Complete every field to continue.");
      return;
    }

    if (passwordsMismatch) {
      Alert.alert(
        "Passwords do not match",
        "Please re-enter matching passwords.",
      );
      return;
    }

    setLoading(true);
    try {
      const response = await signUpByEmailAndPassword({ email, password });

      if (response.status < 200 || response.status >= 300) {
        throw new Error(
          response.data.message || "Unable to create account right now.",
        );
      }

      Alert.alert(
        "Check your inbox",
        response.data.message ||
          "Confirm your email to finish creating the account.",
      );
      onSubmitSuccess();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create account right now.";
      Alert.alert("Unable to register", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.form}>
      <Text style={styles.label}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="you@domain.com"
        placeholderTextColor={alpha.ink35}
        style={styles.input}
      />

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={alpha.ink35}
          style={styles.input}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Confirm password</Text>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={alpha.ink35}
          style={[styles.input, passwordsMismatch && styles.inputError]}
        />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          (pressed || loading) && styles.primaryButtonPressed,
        ]}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.primaryButtonText}>
          {loading ? "Creating…" : "Create account"}
        </Text>
      </Pressable>
    </View>
  );
}
