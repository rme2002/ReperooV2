import { useState } from "react";
import { useRouter } from "expo-router";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AuthScreenShell } from "@/components/auth/AuthScreenShell";
import { colors } from "@/constants/theme";
import { signUpByEmailAndPassword } from "@/lib/gen/authentication/authentication";

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (loading) return;
    if (!email || !password || !confirmPassword) {
      Alert.alert("Missing info", "Please fill out every field.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(
        "Passwords do not match",
        "Please confirm the same password.",
      );
      return;
    }

    setLoading(true);
    try {
      const response = await signUpByEmailAndPassword({ email, password });

      if (response.status < 200 || response.status >= 300) {
        throw new Error(
          response.data.message || "Unable to register right now.",
        );
      }

      Alert.alert(
        "Account created",
        response.data.message || "Check your email to confirm your account.",
        [{ text: "OK", onPress: () => router.replace("/login") }],
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to register right now.";
      Alert.alert("Unable to register", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenShell
      title="Create your space"
      subtitle="Personalize your workspace and invite your team in seconds."
      highlights={["Shared workspaces", "Secure access", "Instant insights"]}
      footer={
        <Pressable
          onPress={() => router.push("/login")}
          style={styles.secondaryAction}
        >
          <Text style={styles.secondaryText}>
            Already have an account?{" "}
            <Text style={styles.secondaryTextAccent}>Sign in</Text>
          </Text>
        </Pressable>
      }
    >
      <View>
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="you@domain.com"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.textTertiary}
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
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
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
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  input: {
    marginTop: 8,
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
  },
  fieldGroup: {
    marginTop: 16,
  },
  primaryButton: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 18,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: colors.textLight,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  secondaryAction: {
    alignItems: "center",
  },
  secondaryText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
  secondaryTextAccent: {
    color: colors.text,
    fontWeight: "600",
  },
});
