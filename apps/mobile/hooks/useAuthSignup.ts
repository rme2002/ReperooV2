import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { signUpByEmailAndPassword } from "@/lib/gen/authentication/authentication";
import { validateSignupForm } from "@/utils/authValidation";

/**
 * Return type for useAuthSignup hook
 */
export interface UseAuthSignupReturn {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  confirmPassword: string;
  setConfirmPassword: (password: string) => void;
  loading: boolean;
  handleSignup: (onSuccess: () => void) => Promise<void>;
}

/**
 * Custom hook for managing signup form state and submission
 * Handles email, password, confirmation, validation, and signup API call
 *
 * @returns Object containing signup form state and handlers
 */
export function useAuthSignup(): UseAuthSignupReturn {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = useCallback(
    async (onSuccess: () => void) => {
      if (loading) return;

      const validation = validateSignupForm(email, password, confirmPassword);
      if (!validation.valid) {
        Alert.alert(
          validation.errorTitle ?? "Error",
          validation.errorMessage ?? "Invalid input"
        );
        return;
      }

      setLoading(true);
      try {
        const response = await signUpByEmailAndPassword({
          email,
          password,
        });

        if (response.status < 200 || response.status >= 300) {
          throw new Error(
            response.data.message ||
              "Unable to create your Reperoo account right now."
          );
        }

        Alert.alert(
          "Check your inbox",
          response.data.message ||
            "We sent a confirmation email to finish creating your account."
        );
        onSuccess();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to create your Reperoo account right now.";
        Alert.alert("Unable to sign up", message);
      } finally {
        setLoading(false);
      }
    },
    [email, password, confirmPassword, loading]
  );

  return {
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    handleSignup,
  };
}
