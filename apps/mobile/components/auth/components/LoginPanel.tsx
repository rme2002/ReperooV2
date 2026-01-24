import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import { supabase } from "@/lib/supabase";
import { alpha } from "@/constants/theme";

import { authFormStyles as styles } from "./AuthFormStyles";

export type LoginPanelProps = {
  onSubmitSuccess: () => void;
};

export function LoginPanel({ onSubmitSuccess }: LoginPanelProps) {
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
