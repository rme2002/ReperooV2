import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { colors } from "@/constants/theme";

// Contexts
import { useSupabaseAuthSync } from "@/hooks/useSupabaseAuthSync";

// Sections
import { AuthHero } from "@/components/auth/sections/AuthHero";
import { LoginForm } from "@/components/auth/sections/LoginForm";
import { SignupForm } from "@/components/auth/sections/SignupForm";
import { SessionNotice } from "@/components/auth/sections/SessionNotice";

// Widgets
import { AuthModeToggle } from "@/components/auth/widgets/AuthModeToggle";

// Custom hooks
import { useAuthLogin } from "@/hooks/useAuthLogin";
import { useAuthSignup } from "@/hooks/useAuthSignup";

type AuthMode = "login" | "signup";

export default function AuthTabScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const initialMode =
    params.mode === "signup"
      ? "signup"
      : params.mode === "login"
        ? "login"
        : "login";
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const { session } = useSupabaseAuthSync();

  // Login hook
  const {
    email: loginEmail,
    setEmail: setLoginEmail,
    password: loginPassword,
    setPassword: setLoginPassword,
    loading: loginLoading,
    handleLogin,
  } = useAuthLogin();

  // Signup hook
  const {
    email: signupEmail,
    setEmail: setSignupEmail,
    password: signupPassword,
    setPassword: setSignupPassword,
    confirmPassword: signupConfirm,
    setConfirmPassword: setSignupConfirm,
    loading: signupLoading,
    handleSignup,
  } = useAuthSignup();

  // Sync mode with route params
  useEffect(() => {
    if (params.mode === "signup") {
      setMode("signup");
    } else if (params.mode === "login") {
      setMode("login");
    }
  }, [params.mode]);

  const isSignedIn = useMemo(() => Boolean(session), [session]);

  const handleSignupSuccess = () => {
    setMode("login");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AuthHero />

      <AuthModeToggle mode={mode} onChangeMode={setMode} />

      {mode === "login" ? (
        <LoginForm
          email={loginEmail}
          password={loginPassword}
          onEmailChange={setLoginEmail}
          onPasswordChange={setLoginPassword}
          onSubmit={handleLogin}
          loading={loginLoading}
        />
      ) : (
        <SignupForm
          email={signupEmail}
          password={signupPassword}
          confirmPassword={signupConfirm}
          onEmailChange={setSignupEmail}
          onPasswordChange={setSignupPassword}
          onConfirmPasswordChange={setSignupConfirm}
          onSubmit={() => handleSignup(handleSignupSuccess)}
          loading={signupLoading}
        />
      )}

      {isSignedIn ? <SessionNotice /> : null}
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
});
