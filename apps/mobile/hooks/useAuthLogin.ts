import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { validateLoginForm } from "@/utils/authValidation";

/**
 * Return type for useAuthLogin hook
 */
export interface UseAuthLoginReturn {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  loading: boolean;
  handleLogin: () => Promise<void>;
}

/**
 * Custom hook for managing login form state and submission
 * Handles email, password, validation, and login API call
 *
 * @returns Object containing login form state and handlers
 */
export function useAuthLogin(): UseAuthLoginReturn {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    if (loading) return;

    const validation = validateLoginForm(email, password);
    if (!validation.valid) {
      Alert.alert(
        validation.errorTitle ?? "Error",
        validation.errorMessage ?? "Invalid input"
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

    Alert.alert("Signed in", "You are now logged into Reperoo.");
  }, [email, password, loading]);

  return {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    handleLogin,
  };
}
