import { useState } from "react";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

// Contexts
import { useSupabaseAuthSync } from "@/hooks/useSupabaseAuthSync";
import {
  CURRENCY_OPTIONS,
  useUserPreferences,
} from "@/components/profile/UserPreferencesProvider";
import { formatDecimalExample } from "@/utils/decimalSeparator";

// State components
import { LoadingState } from "@/components/profile/states/LoadingState";
import { SignedOutState } from "@/components/profile/states/SignedOutState";

// Widgets
import { CurrencyPickerModal } from "@/components/profile/widgets/CurrencyPickerModal";
import { DecimalSeparatorPickerModal } from "@/components/profile/widgets/DecimalSeparatorPickerModal";

// Sections
import { AccountSection } from "@/components/profile/sections/AccountSection";
import { PreferencesSection } from "@/components/profile/sections/PreferencesSection";
import { SupportSection } from "@/components/profile/sections/SupportSection";
import { DangerZoneSection } from "@/components/profile/sections/DangerZoneSection";

// Custom hooks
import { useProfileForm } from "@/hooks/useProfileForm";
import { useProfileActions } from "@/hooks/useProfileActions";
import { useTabSafePadding } from "@/hooks/useTabSafePadding";

export default function ProfileScreen() {
  const router = useRouter();
  const { session, initializing, isMockSession } = useSupabaseAuthSync();
  const {
    currency,
    decimalSeparator,
    decimalSeparatorPreference,
    setCurrencyFromProfile,
    setDecimalSeparatorFromProfile,
  } = useUserPreferences();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [decimalPickerVisible, setDecimalPickerVisible] = useState(false);
  const { bottomPadding } = useTabSafePadding();

  // Form management
  const {
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
  } = useProfileForm(
    session,
    isMockSession,
    currency,
    setCurrencyFromProfile,
    decimalSeparatorPreference,
    setDecimalSeparatorFromProfile,
  );

  // Actions
  const { handleLogout, handleResetPassword, handleContactSupport } =
    useProfileActions(session, isMockSession);

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: bottomPadding,
      gap: 24,
    },
    header: {
      gap: 6,
    },
    title: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
  });

  // Loading state
  if (initializing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  // Signed out state
  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>
              Sign in to manage your preferences.
            </Text>
          </View>
          <SignedOutState onGoToLogin={() => router.replace("/(auth)/login")} />
        </View>
      </SafeAreaView>
    );
  }

  const email = session.user.email;
  const selectedCurrencyLabel =
    CURRENCY_OPTIONS.find((option) => option.code === selectedCurrency)
      ?.label ?? selectedCurrency;
  const decimalSeparatorExample = formatDecimalExample(
    selectedDecimalSeparator === "auto"
      ? decimalSeparator
      : selectedDecimalSeparator,
  );
  const decimalSeparatorLabel =
    selectedDecimalSeparator === "auto"
      ? `Phone default (${decimalSeparatorExample})`
      : selectedDecimalSeparator === "."
        ? "Dot (1.23)"
        : "Comma (1,23)";

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          {email ? <Text style={styles.subtitle}>{email}</Text> : null}
        </View>

        <AccountSection
          name={name}
          email={email}
          onChangeName={setName}
          hasChanges={hasChanges}
          onSave={handleSave}
          saving={saving}
          errorMessage={errorMessage}
        />

        <PreferencesSection
          currencyLabel={selectedCurrencyLabel}
          onCurrencyPress={() => setPickerVisible(true)}
          decimalSeparatorLabel={decimalSeparatorLabel}
          onDecimalSeparatorPress={() => setDecimalPickerVisible(true)}
        />

        <SupportSection
          onResetPassword={handleResetPassword}
          onContactSupport={handleContactSupport}
        />

        <DangerZoneSection onLogout={handleLogout} />
      </ScrollView>

      <CurrencyPickerModal
        visible={pickerVisible}
        selected={selectedCurrency}
        onSelect={setSelectedCurrency}
        onClose={() => setPickerVisible(false)}
      />
      <DecimalSeparatorPickerModal
        visible={decimalPickerVisible}
        selected={selectedDecimalSeparator}
        localeSeparator={decimalSeparator}
        onSelect={setSelectedDecimalSeparator}
        onClose={() => setDecimalPickerVisible(false)}
      />
    </SafeAreaView>
  );
}
