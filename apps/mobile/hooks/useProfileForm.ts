import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { showToast } from "@/utils/profileHelpers";
import type { Session } from "@supabase/supabase-js";
import type { CurrencyCode } from "@/components/profile/UserPreferencesProvider";
import type { DecimalSeparatorPreference } from "@/utils/decimalSeparator";

/**
 * Return type for useProfileForm hook
 */
export interface UseProfileFormReturn {
  name: string;
  setName: (name: string) => void;
  selectedCurrency: CurrencyCode;
  setSelectedCurrency: (currency: CurrencyCode) => void;
  selectedDecimalSeparator: DecimalSeparatorPreference;
  setSelectedDecimalSeparator: (separator: DecimalSeparatorPreference) => void;
  hasChanges: boolean;
  saving: boolean;
  errorMessage: string | null;
  handleSave: () => Promise<void>;
}

/**
 * Custom hook for managing profile form state and save logic
 * Handles name and currency changes with change detection
 *
 * @param session - Current user session
 * @param isMockSession - Whether this is a mock session
 * @param currentCurrency - Current currency from preferences
 * @param setCurrencyFromProfile - Function to update currency in preferences
 * @param currentDecimalSeparator - Current decimal separator preference
 * @param setDecimalSeparatorFromProfile - Function to update decimal separator preference
 * @returns Object containing form state and save handler
 */
export function useProfileForm(
  session: Session | null,
  isMockSession: boolean,
  currentCurrency: CurrencyCode,
  setCurrencyFromProfile: (currency: CurrencyCode) => void,
  currentDecimalSeparator: DecimalSeparatorPreference,
  setDecimalSeparatorFromProfile: (
    separator: DecimalSeparatorPreference,
  ) => void,
): UseProfileFormReturn {
  const [name, setName] = useState("");
  const [initialName, setInitialName] = useState("");
  const [selectedCurrency, setSelectedCurrency] =
    useState<CurrencyCode>(currentCurrency);
  const [selectedDecimalSeparator, setSelectedDecimalSeparator] =
    useState<DecimalSeparatorPreference>(currentDecimalSeparator);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load initial data from session
  useEffect(() => {
    const metadataName =
      typeof session?.user?.user_metadata?.display_name === "string"
        ? (session.user.user_metadata.display_name as string)
        : "";
    setInitialName(metadataName);
    setName(metadataName);
  }, [session?.user?.id, session?.user?.user_metadata?.display_name]);

  // Sync currency with preferences
  useEffect(() => {
    setSelectedCurrency(currentCurrency);
  }, [currentCurrency]);

  useEffect(() => {
    setSelectedDecimalSeparator(currentDecimalSeparator);
  }, [currentDecimalSeparator]);

  // Detect changes
  const trimmedName = name.trim();
  const trimmedInitial = initialName.trim();
  const hasChanges = useMemo(() => {
    if (!session) return false;
    return (
      trimmedName !== trimmedInitial ||
      selectedCurrency !== currentCurrency ||
      selectedDecimalSeparator !== currentDecimalSeparator
    );
  }, [
    session,
    trimmedName,
    trimmedInitial,
    selectedCurrency,
    currentCurrency,
    selectedDecimalSeparator,
    currentDecimalSeparator,
  ]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!session || saving || !hasChanges) {
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    const payloadName = trimmedName;

    if (isMockSession) {
      setInitialName(payloadName);
      setName(payloadName);
      setCurrencyFromProfile(selectedCurrency);
      setDecimalSeparatorFromProfile(selectedDecimalSeparator);
      setSaving(false);
      showToast("Saved");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        display_name: payloadName.length ? payloadName : null,
        preferred_currency: selectedCurrency,
        preferred_decimal_separator:
          selectedDecimalSeparator === "auto"
            ? null
            : selectedDecimalSeparator,
      },
    });
    if (error) {
      setErrorMessage("Could not save, try again");
      setSaving(false);
      return;
    }
    setInitialName(payloadName);
    setName(payloadName);
    setCurrencyFromProfile(selectedCurrency);
    setDecimalSeparatorFromProfile(selectedDecimalSeparator);
    setSaving(false);
    showToast("Saved");
  }, [
    session,
    saving,
    hasChanges,
    trimmedName,
    isMockSession,
    selectedCurrency,
    setCurrencyFromProfile,
    selectedDecimalSeparator,
    setDecimalSeparatorFromProfile,
  ]);

  return {
    name,
    setName,
    selectedCurrency,
    setSelectedCurrency,
    selectedDecimalSeparator,
    setSelectedDecimalSeparator,
    hasChanges,
    saving,
    errorMessage,
    handleSave,
  };
}
