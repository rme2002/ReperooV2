import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

export type CurrencyCode = "EUR" | "USD" | "GBP";

export type CurrencyOption = {
  code: CurrencyCode;
  label: string;
  symbol: string;
};

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "EUR", label: "Euro (€)", symbol: "€" },
  { code: "USD", label: "US Dollar ($)", symbol: "$" },
  { code: "GBP", label: "British Pound (£)", symbol: "£" },
];

export const currencySymbolMap: Record<CurrencyCode, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
};

const currencySet = new Set<CurrencyCode>(
  CURRENCY_OPTIONS.map((option) => option.code),
);

const localeCurrencyMap: Record<string, CurrencyCode> = {
  US: "USD",
  GB: "GBP",
  IE: "EUR",
  FR: "EUR",
  DE: "EUR",
  ES: "EUR",
  IT: "EUR",
  PT: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  FI: "EUR",
  GR: "EUR",
};

const getLocaleCurrency = (): CurrencyCode => {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? "";
    const region = locale.split("-")[1]?.toUpperCase();
    if (region && localeCurrencyMap[region]) {
      return localeCurrencyMap[region];
    }
  } catch {
    // Default below when Intl is unavailable
  }
  return "EUR";
};

const sessionCurrency = (
  session: Session | null | undefined,
): CurrencyCode | null => {
  const metadataValue = session?.user?.user_metadata?.preferred_currency;
  if (
    typeof metadataValue === "string" &&
    currencySet.has(metadataValue as CurrencyCode)
  ) {
    return metadataValue as CurrencyCode;
  }
  return null;
};

type ContextValue = {
  currency: CurrencyCode;
  setCurrencyFromProfile: (code: CurrencyCode) => void;
};

const UserPreferencesContext = createContext<ContextValue | null>(null);

export function UserPreferencesProvider({
  session,
  children,
}: {
  session: Session | null;
  children: ReactNode;
}) {
  const [currency, setCurrency] = useState<CurrencyCode>(() => {
    return sessionCurrency(session) ?? getLocaleCurrency();
  });

  useEffect(() => {
    const metadataCurrency = sessionCurrency(session);
    if (metadataCurrency) {
      setCurrency((current) =>
        current === metadataCurrency ? current : metadataCurrency,
      );
      return;
    }
    const fallback = getLocaleCurrency();
    setCurrency((current) => (current === fallback ? current : fallback));
  }, [session]);

  const value = useMemo<ContextValue>(
    () => ({
      currency,
      setCurrencyFromProfile: setCurrency,
    }),
    [currency],
  );

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error(
      "useUserPreferences must be used within a UserPreferencesProvider",
    );
  }
  return context;
}
