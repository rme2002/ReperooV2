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
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

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
          placeholderTextColor="rgba(255,255,255,0.5)"
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
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  input: {
    marginTop: 8,
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    color: "#ffffff",
    fontSize: 16,
  },
  primaryButton: {
    marginTop: 24,
    backgroundColor: "#f97316",
    borderRadius: 18,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: "#041019",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  secondaryAction: {
    alignItems: "center",
  },
  secondaryText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginTop: 8,
  },
});
