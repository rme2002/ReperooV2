import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof params.email === "string") {
      setEmail(params.email);
    }
  }, [params.email]);

  const handleReset = async () => {
    if (loading) return;
    if (!email) {
      Alert.alert(
        "Missing email",
        "Enter your account email to receive a reset link.",
      );
      return;
    }
    setLoading(true);
    if (!isSupabaseConfigured) {
      setLoading(false);
      Alert.alert(
        "Reset link sent",
        "Mock mode: we'd email you a reset link once Supabase is configured.",
      );
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);

    if (error) {
      Alert.alert("Unable to send reset link", error.message);
      return;
    }

    Alert.alert(
      "Reset link sent",
      "Check your inbox to finish resetting your password.",
    );
  };

  return (
    <AuthScreenShell
      title="Reset access 🔐"
      subtitle="Send yourself a secure link and get back into your workspace."
      highlights={["2 minute recovery", "Device aware", "Secure by design"]}
      footer={
        <Pressable
          onPress={() => router.push("/login")}
          style={styles.secondaryAction}
        >
          <Text style={styles.secondaryText}>
            Never mind, take me back to sign in
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

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          (pressed || loading) && styles.primaryButtonPressed,
        ]}
        onPress={handleReset}
        disabled={loading}
      >
        <Text style={styles.primaryButtonText}>
          {loading ? "Sending…" : "Send reset link"}
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
    letterSpacing: 0.4,
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
  primaryButton: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 18,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
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
});
