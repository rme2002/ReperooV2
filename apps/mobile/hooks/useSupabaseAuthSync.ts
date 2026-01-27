import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const MOCK_SESSION: Session = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  provider_token: null,
  provider_refresh_token: null,
  user: {
    id: "00000000-0000-0000-0000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "jane.smith@email.com",
    email_confirmed_at: new Date().toISOString(),
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    phone: "",
    app_metadata: { provider: "email" },
    user_metadata: {
      display_name: "Jane Smith",
      preferred_currency: "EUR",
    },
    identities: [],
  },
};

export function useSupabaseAuthSync() {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const useMockSession = process.env.EXPO_PUBLIC_USE_MOCK_SESSION === "true";

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession(useMockSession ? MOCK_SESSION : null);
      setInitializing(false);
      return;
    }

    let isMounted = true;

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (isMounted) {
          setSession(session);
          setInitializing(false);
        }
      } catch (error) {
        console.warn("Failed to fetch Supabase session", error);
        if (isMounted) {
          setInitializing(false);
        }
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    initializing,
    isMockSession: !isSupabaseConfigured && useMockSession,
  };
}
