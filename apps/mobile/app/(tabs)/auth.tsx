import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSupabaseAuthSync } from "@/hooks/useSupabaseAuthSync";
import { colors } from "@/constants/theme";
import { signUpByEmailAndPassword } from "@/lib/gen/authentication/authentication";
import { supabase } from "@/lib/supabase";

type AuthMode = "login" | "signup";

export default function AuthTabScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const initialMode =
    params.mode === "signup" ? "signup" : params.mode === "login" ? "login" : "login";
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const { session } = useSupabaseAuthSync();

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Sign-up fields
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  useEffect(() => {
    if (params.mode === "signup") {
      setMode("signup");
    } else if (params.mode === "login") {
      setMode("login");
    }
  }, [params.mode]);

  const handleLogin = async () => {
    if (loginLoading) return;
    if (!loginEmail || !loginPassword) {
      Alert.alert("Missing info", "Enter email and password to continue.");
      return;
    }

    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoginLoading(false);

    if (error) {
      Alert.alert("Unable to sign in", error.message);
      return;
    }

    Alert.alert("Signed in", "You are now logged into Reperoo.");
  };

  const handleSignup = async () => {
    if (signupLoading) return;
    if (!signupEmail || !signupPassword || !signupConfirm) {
      Alert.alert("Missing info", "Fill out every field to continue.");
      return;
    }
    if (signupPassword !== signupConfirm) {
      Alert.alert("Passwords do not match", "Please re-enter matching passwords.");
      return;
    }

    setSignupLoading(true);
    try {
      const response = await signUpByEmailAndPassword({
        email: signupEmail,
        password: signupPassword,
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error(
          response.data.message || "Unable to create your Reperoo account right now.",
        );
      }

      Alert.alert(
        "Check your inbox",
        response.data.message ||
          "We sent a confirmation email to finish creating your account.",
      );
      setMode("login");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create your Reperoo account right now.";
      Alert.alert("Unable to sign up", message);
    } finally {
      setSignupLoading(false);
    }
  };

  const isSignedIn = useMemo(() => Boolean(session), [session]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.badge}>Reperoo</Text>
        <Text style={styles.heading}>Log in or start your budgeting streak.</Text>
        <Text style={styles.subtitle}>
          Use your email and password to get into Reperoo. Sign up goes straight to the
          FastAPI backend, while login uses Supabase.
        </Text>
      </View>

      <View style={styles.segmented}>
        {(["login", "signup"] as AuthMode[]).map((key) => (
          <Pressable
            key={key}
            onPress={() => setMode(key)}
            style={[
              styles.segmentButton,
              mode === key && styles.segmentButtonActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                mode === key && styles.segmentTextActive,
              ]}
            >
              {key === "login" ? "Log in" : "Create account"}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === "login" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Log in with Supabase</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={loginEmail}
              onChangeText={setLoginEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={loginPassword}
              onChangeText={setLoginPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || loginLoading) && styles.primaryButtonPressed,
            ]}
            onPress={handleLogin}
            disabled={loginLoading}
          >
            <Text style={styles.primaryButtonText}>
              {loginLoading ? "Signing in…" : "Continue"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create account via API</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={signupEmail}
              onChangeText={setSignupEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={signupPassword}
              onChangeText={setSignupPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              value={signupConfirm}
              onChangeText={setSignupConfirm}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              (pressed || signupLoading) && styles.secondaryButtonPressed,
            ]}
            onPress={handleSignup}
            disabled={signupLoading}
          >
            <Text style={styles.secondaryButtonText}>
              {signupLoading ? "Creating…" : "Create account"}
            </Text>
          </Pressable>
        </View>
      )}

      {isSignedIn ? (
        <View style={styles.sessionNotice}>
          <Text style={styles.sessionTitle}>Already signed in</Text>
          <Text style={styles.sessionDescription}>
            You are authenticated with Supabase. You can switch accounts from Settings if
            needed.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 18,
  },
  hero: {
    gap: 10,
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    color: colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  segmented: {
    flexDirection: "row",
    borderRadius: 14,
    backgroundColor: colors.borderLight,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentButtonActive: {
    backgroundColor: "rgba(31, 138, 91, 0.12)",
  },
  segmentText: {
    color: colors.textTertiary,
    fontSize: 14,
    fontWeight: "700",
  },
  segmentTextActive: {
    color: colors.text,
  },
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
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  input: {
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
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 8,
    backgroundColor: colors.primaryDark,
    borderRadius: 16,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonPressed: {
    opacity: 0.9,
  },
  secondaryButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: "700",
  },
  sessionNotice: {
    marginTop: 8,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: "rgba(31, 138, 91, 0.12)",
    gap: 6,
  },
  sessionTitle: {
    color: colors.success,
    fontSize: 14,
    fontWeight: "700",
  },
  sessionDescription: {
    color: colors.success,
    fontSize: 13,
    lineHeight: 18,
  },
});
