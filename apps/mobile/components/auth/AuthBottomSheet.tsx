import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { signUpByEmailAndPassword } from "@/lib/gen/authentication/authentication";

type AuthBottomSheetProps = {
  visible: boolean;
  initialMode?: "login" | "register";
  onClose: () => void;
};

const SHEET_HEIGHT = 520;

export function AuthBottomSheet({
  visible,
  initialMode = "login",
  onClose,
}: AuthBottomSheetProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setMode(initialMode);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible, initialMode, translateY, overlayOpacity, mounted]);

  if (!mounted) return null;

  const handleClose = () => {
    if (visible) {
      onClose();
    }
  };

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.backdrop,
            { opacity: overlayOpacity },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.dragIndicator} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {mode === "login" ? "Welcome back" : "Create your account"}
            </Text>
            <Pressable onPress={handleClose} hitSlop={16}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.segmented}>
            {(["login", "register"] as const).map((key) => (
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
                  {key === "login" ? "Log in" : "Sign up"}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.sheetContent}>
            {mode === "login" ? (
              <LoginPanel onSubmitSuccess={handleClose} />
            ) : (
              <RegisterPanel onSubmitSuccess={() => setMode("login")} />
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type LoginPanelProps = {
  onSubmitSuccess: () => void;
};

function LoginPanel({ onSubmitSuccess }: LoginPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;
    if (!email || !password) {
      Alert.alert(
        "Missing information",
        "Enter email and password to continue.",
      );
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

    onSubmitSuccess();
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
        placeholderTextColor="rgba(255,255,255,0.5)"
        style={styles.input}
      />

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

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          (pressed || loading) && styles.primaryButtonPressed,
        ]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.primaryButtonText}>
          {loading ? "Signing in…" : "Continue"}
        </Text>
      </Pressable>
    </View>
  );
}

type RegisterPanelProps = {
  onSubmitSuccess: () => void;
};

function RegisterPanel({ onSubmitSuccess }: RegisterPanelProps) {
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
        placeholderTextColor="rgba(255,255,255,0.5)"
        style={styles.input}
      />

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

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Confirm password</Text>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="rgba(255,255,255,0.5)"
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

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(3, 7, 18, 0.75)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: SHEET_HEIGHT,
    backgroundColor: "#050814",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 32,
  },
  dragIndicator: {
    width: 60,
    height: 5,
    borderRadius: 999,
    alignSelf: "center",
    backgroundColor: "rgba(148,163,184,0.6)",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "600",
  },
  closeText: {
    color: "#94a3b8",
    fontSize: 15,
    fontWeight: "600",
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: "rgba(148,163,184,0.16)",
    borderRadius: 14,
    padding: 4,
    marginTop: 20,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentButtonActive: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
  },
  segmentText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#f8fafc",
  },
  sheetContent: {
    marginTop: 20,
  },
  form: {
    gap: 16,
  },
  label: {
    color: "rgba(248,250,252,0.8)",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  fieldGroup: {
    gap: 8,
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
  inputError: {
    borderColor: "rgba(248,113,113,0.8)",
  },
  primaryButton: {
    marginTop: 8,
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
    fontSize: 16,
    fontWeight: "600",
  },
});
