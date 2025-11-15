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
    if (error) {
      Alert.alert("Unable to sign in", error.message);
    }
    setLoading(false);
  };

  return (
    <AuthScreenShell
      title="Welcome back 👋"
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
          placeholderTextColor="rgba(255,255,255,0.5)"
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
          placeholderTextColor="rgba(255,255,255,0.5)"
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
  fieldGroup: {
    marginTop: 16,
  },
  helperText: {
    marginTop: 18,
    color: "#93c5fd",
    fontSize: 13,
    fontWeight: "600",
  },
  primaryButton: {
    marginTop: 24,
    backgroundColor: "#2563eb",
    borderRadius: 18,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  secondaryAction: {
    alignItems: "center",
  },
  secondaryText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
  },
  secondaryTextAccent: {
    color: "#c084fc",
    fontWeight: "600",
  },
});
