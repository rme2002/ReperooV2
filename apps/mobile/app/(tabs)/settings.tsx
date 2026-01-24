import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { colors } from "@/constants/theme";
import { useSupabaseAuthSync } from "@/hooks/useSupabaseAuthSync";
import { AuthBottomSheet } from "@/components/auth/AuthBottomSheet";

const baseSettings = [
  {
    key: "profile",
    title: "Profile & Identity",
    description: "Update your name, avatar, and connected identities.",
  },
  {
    key: "notifications",
    title: "Notifications",
    description: "Control push, email, and workspace notification rules.",
  },
  {
    key: "workspace",
    title: "Workspace access",
    description: "Manage member roles and approvals for new devices.",
  },
];

export default function SettingsScreen() {
  const [signingOut, setSigningOut] = useState(false);
  const [authSheetOpen, setAuthSheetOpen] = useState(false);
  const { session } = useSupabaseAuthSync();

  const settingsItems = useMemo(() => {
    if (session) {
      return [
        ...baseSettings,
        {
          key: "logout",
          title: "Sign out",
          description: "Securely disconnect from this device.",
          danger: true,
        },
      ];
    }

    return [
      ...baseSettings,
      {
        key: "login",
        title: "Sign in",
        description: "Authenticate to access the backoffice workspace.",
        accent: true,
      },
    ];
  }, [session]);

  const handleItemPress = async (itemKey: string) => {
    if (itemKey === "logout") {
      if (signingOut) return;
      setSigningOut(true);
      const { error } = await supabase.auth.signOut();
      setSigningOut(false);

      if (error) {
        console.warn("Failed to sign out", error);
        return;
      }
      return;
    }

    if (itemKey === "login") {
      setAuthSheetOpen(true);
      return;
    }

    // Placeholder for future navigation/actions.
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Settings</Text>
      <Text style={styles.subheading}>
        Personalize how your workspace behaves—security, notifications, and
        more.
      </Text>

      <FlatList
        data={settingsItems}
        keyExtractor={(item) => item.key}
        scrollEnabled={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleItemPress(item.key)}
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
              item.danger && styles.cardDanger,
            ]}
          >
            <View style={styles.cardContent}>
              <Text
                style={[
                  styles.cardTitle,
                  item.danger && styles.cardTitleDanger,
                ]}
              >
                {item.key === "logout" && signingOut
                  ? "Signing out…"
                  : item.title}
              </Text>
              <Text
                style={[
                  styles.cardDescription,
                  item.accent && styles.cardDescriptionAccent,
                  item.danger && styles.cardDescriptionDanger,
                ]}
              >
                {item.description}
              </Text>
            </View>
            <Text
              style={[styles.chevron, item.danger && styles.cardTitleDanger]}
            >
              ›
            </Text>
          </Pressable>
        )}
      />

      <AuthBottomSheet
        visible={authSheetOpen}
        onClose={() => setAuthSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
  },
  subheading: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 24,
  },
  list: {
    gap: 14,
  },
  card: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
  },
  cardPressed: {
    opacity: 0.8,
    borderColor: colors.border,
  },
  cardDanger: {
    borderColor: colors.error,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  cardTitleDanger: {
    color: colors.error,
  },
  cardDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  cardDescriptionAccent: {
    color: colors.primary,
  },
  cardDescriptionDanger: {
    color: colors.error,
  },
  chevron: {
    fontSize: 28,
    color: colors.textTertiary,
    marginLeft: 12,
  },
});
