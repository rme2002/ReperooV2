import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSupabaseAuthSync } from "@/hooks/useSupabaseAuthSync";
import { supabase } from "@/lib/supabase";
import { alpha, colors } from "@/constants/theme";
import {
  CURRENCY_OPTIONS,
  type CurrencyCode,
  useUserPreferences,
} from "@/components/profile/UserPreferencesProvider";

const showToast = (message: string) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert(message);
  }
};

type CurrencyPickerProps = {
  visible: boolean;
  selected: CurrencyCode;
  onSelect: (code: CurrencyCode) => void;
  onClose: () => void;
};

function CurrencyPicker({ visible, selected, onSelect, onClose }: CurrencyPickerProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <Pressable style={styles.pickerBackdrop} onPress={onClose} />
        <View style={styles.pickerSheet}>
          <Text style={styles.pickerTitle}>Choose currency</Text>
          {CURRENCY_OPTIONS.map((option) => (
            <Pressable
              key={option.code}
              style={[styles.pickerRow, selected === option.code && styles.pickerRowActive]}
              onPress={() => {
                onSelect(option.code);
                onClose();
              }}
            >
              <View>
                <Text style={styles.pickerRowLabel}>{option.label}</Text>
                <Text style={styles.pickerRowCode}>{option.code}</Text>
              </View>
              <Text style={styles.pickerRowSymbol}>{option.symbol}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { session, initializing, isMockSession } = useSupabaseAuthSync();
  const { currency, setCurrencyFromProfile } = useUserPreferences();
  const [name, setName] = useState("");
  const [initialName, setInitialName] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(currency);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const metadataName =
      typeof session?.user?.user_metadata?.display_name === "string"
        ? (session.user.user_metadata.display_name as string)
        : "";
    setInitialName(metadataName);
    setName(metadataName);
  }, [session?.user?.id, session?.user?.user_metadata?.display_name]);

  useEffect(() => {
    setSelectedCurrency(currency);
  }, [currency]);

  const trimmedName = name.trim();
  const trimmedInitial = initialName.trim();
  const hasChanges = useMemo(() => {
    if (!session) return false;
    return trimmedName !== trimmedInitial || selectedCurrency !== currency;
  }, [session, trimmedName, trimmedInitial, selectedCurrency, currency]);

  const selectedCurrencyLabel = CURRENCY_OPTIONS.find((option) => option.code === selectedCurrency)?.label;

  const handleSave = async () => {
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
      setSaving(false);
      showToast("Saved");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        display_name: payloadName.length ? payloadName : null,
        preferred_currency: selectedCurrency,
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
    setSaving(false);
    showToast("Saved");
  };

  const handleLogout = () => {
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
  };

  const handleResetPassword = () => {
    const email = session?.user?.email;
    if (email) {
      router.push({ pathname: "/(auth)/forgot-password", params: { email } });
    } else {
      router.push("/(auth)/forgot-password");
    }
  };

  const handleContactSupport = () => {
    Alert.alert("Contact support", "Send us a note at support@reperoo.app");
  };

  if (initializing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>Sign in to manage your preferences.</Text>
          </View>
          <View style={styles.signedOutCard}>
            <Text style={styles.supportButtonText}>You're signed out</Text>
            <Text style={styles.supportSubtext}>
              Log back in to change your display name, currency, or account actions.
            </Text>
            <Pressable onPress={() => router.replace("/(auth)/login")}
              style={({ pressed }) => [styles.primaryCta, pressed && styles.primaryCtaPressed]}>
              <Text style={styles.primaryCtaLabel}>Go to login</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const email = session.user.email;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          {email ? <Text style={styles.subtitle}>{email}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Add your name"
                placeholderTextColor={colors.textTertiary}
                maxLength={50}
                style={styles.input}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput value={email ?? ""} editable={false} style={[styles.input, styles.inputReadonly]} />
            </View>
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            {hasChanges ? (
              <Pressable
                style={({ pressed }) => [styles.saveButton, (pressed || saving) && styles.saveButtonPressed]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>{saving ? "Saving…" : "Save changes"}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PREFERENCES</Text>
          <View style={styles.card}>
            <Pressable
              style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}
              onPress={() => setPickerVisible(true)}
            >
              <View>
                <Text style={styles.rowLabel}>Currency</Text>
                <Text style={styles.rowValue}>{selectedCurrencyLabel ?? selectedCurrency}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SUPPORT</Text>
          <View style={styles.card}>
            <Pressable
              style={({ pressed }) => [styles.supportButton, pressed && styles.supportButtonPressed]}
              onPress={handleResetPassword}
            >
              <Text style={styles.supportButtonText}>Reset password</Text>
              <Text style={styles.supportSubtext}>Opens the forgot-password flow</Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              style={({ pressed }) => [styles.supportButton, pressed && styles.supportButtonPressed]}
              onPress={handleContactSupport}
            >
              <Text style={styles.supportButtonText}>Contact support</Text>
              <Text style={styles.supportSubtext}>Email support@reperoo.app</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DANGER ZONE</Text>
          <View style={[styles.card, styles.dangerCard]}>
            <Pressable
              style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
              onPress={handleLogout}
            >
              <Text style={styles.logoutLabel}>Log out</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <CurrencyPicker
        visible={pickerVisible}
        selected={selectedCurrency}
        onSelect={setSelectedCurrency}
        onClose={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 40,
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
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 1,
    color: colors.textTertiary,
    fontWeight: "700",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputReadonly: {
    backgroundColor: colors.borderLight,
    color: colors.textTertiary,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
  },
  saveButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  saveButtonPressed: {
    opacity: 0.9,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textLight,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listRowPressed: {
    opacity: 0.85,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  rowValue: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 4,
  },
  chevron: {
    fontSize: 22,
    color: colors.textTertiary,
  },
  supportButton: {
    gap: 2,
  },
  supportButtonPressed: {
    opacity: 0.85,
  },
  supportButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  supportSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  dangerCard: {
    borderColor: colors.error,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  logoutButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.error,
    paddingVertical: 12,
    alignItems: "center",
  },
  logoutButtonPressed: {
    opacity: 0.85,
  },
  logoutLabel: {
    color: colors.error,
    fontSize: 16,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  signedOutCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 12,
  },
  primaryCta: {
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryCtaPressed: {
    opacity: 0.9,
  },
  primaryCtaLabel: {
    color: colors.textLight,
    fontSize: 15,
    fontWeight: "700",
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: alpha.ink35,
    justifyContent: "flex-end",
    padding: 20,
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  pickerSheet: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 20,
    gap: 8,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  pickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  pickerRowActive: {
    backgroundColor: "rgba(31, 138, 91, 0.12)",
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  pickerRowLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  pickerRowCode: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pickerRowSymbol: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
});
