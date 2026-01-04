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

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (loading) return;
    if (!email || !password) {
      Alert.alert("Missing info", "Please enter both email and password.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      Alert.alert("Unable to sign in", error.message);
      return;
    }
    router.replace("/(tabs)");
  };

  return (
    <AuthScreenShell
      title="Welcome back"
      subtitle="Sign in to keep your workspace in perfect flow."
      highlights={["Secure sync", "Realtime updates", "Powered by AI"]}
      footer={
        <Pressable
          onPress={() => router.push("/register")}
          style={styles.secondaryAction}
        >
          <Text style={styles.secondaryText}>
            New here?{" "}
            <Text style={styles.secondaryTextAccent}>Create account</Text>
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
          placeholderTextColor="#9ca3af"
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
          placeholderTextColor="#9ca3af"
          style={styles.input}
        />
      </View>

      <Pressable onPress={() => router.push("/forgot-password")}>
        <Text style={styles.helperText}>Forgot password?</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          (pressed || loading) && styles.primaryButtonPressed,
        ]}
        onPress={handleSignIn}
        disabled={loading}
      >
        <Text style={styles.primaryButtonText}>
          {loading ? "Signing in…" : "Continue"}
        </Text>
      </Pressable>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  label: {
    color: "#6b7280",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  input: {
    marginTop: 8,
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ede7dc",
    color: "#111827",
    fontSize: 16,
  },
  fieldGroup: {
    marginTop: 16,
  },
  helperText: {
    marginTop: 18,
    color: "#111827",
    fontSize: 13,
    fontWeight: "600",
  },
  primaryButton: {
    marginTop: 24,
    backgroundColor: "#111827",
    borderRadius: 18,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#0b1222",
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  secondaryAction: {
    alignItems: "center",
  },
  secondaryText: {
    color: "#6b7280",
    fontSize: 14,
  },
  secondaryTextAccent: {
    color: "#111827",
    fontWeight: "600",
  },
});
