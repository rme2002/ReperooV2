import { useCallback } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

/**
 * Return type for useProfileActions hook
 */
export interface UseProfileActionsReturn {
  handleLogout: () => void;
  handleResetPassword: () => void;
  handleContactSupport: () => void;
}

/**
 * Custom hook for profile action handlers
 * Handles logout, password reset, and contact support
 *
 * @param session - Current user session
 * @param isMockSession - Whether this is a mock session
 * @returns Object containing action handlers
 */
export function useProfileActions(
  session: Session | null,
  isMockSession: boolean
): UseProfileActionsReturn {
  const router = useRouter();

  const handleLogout = useCallback(() => {
    if (isMockSession) {
      router.replace("/(auth)/login");
      return;
    }
    if (!session) {
      router.replace("/(auth)/login");
      return;
    }
    Alert.alert("Log out?", "You'll return to the login screen.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            Alert.alert("Unable to sign out", error.message);
            return;
          }
          router.replace("/(auth)/login");
        },
      },
    ]);
  }, [session, isMockSession, router]);

  const handleResetPassword = useCallback(() => {
    const email = session?.user?.email;
    if (email) {
      router.push({ pathname: "/(auth)/forgot-password", params: { email } });
    } else {
      router.push("/(auth)/forgot-password");
    }
  }, [session?.user?.email, router]);

  const handleContactSupport = useCallback(() => {
    Alert.alert("Contact support", "Send us a note at support@reperoo.app");
  }, []);

  return {
    handleLogout,
    handleResetPassword,
    handleContactSupport,
  };
}
