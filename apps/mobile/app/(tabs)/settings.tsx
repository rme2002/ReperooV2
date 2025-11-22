import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
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
    backgroundColor: "#050814",
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#f8fafc",
  },
  subheading: {
    fontSize: 15,
    color: "rgba(248,250,252,0.7)",
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
    borderColor: "rgba(148,163,184,0.35)",
    backgroundColor: "rgba(15,23,42,0.8)",
    flexDirection: "row",
    alignItems: "center",
  },
  cardPressed: {
    opacity: 0.8,
    borderColor: "rgba(148,163,184,0.6)",
  },
  cardDanger: {
    borderColor: "rgba(248,113,113,0.45)",
    backgroundColor: "rgba(30,8,8,0.7)",
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e2e8f0",
  },
  cardTitleDanger: {
    color: "#fca5a5",
  },
  cardDescription: {
    color: "rgba(226,232,240,0.75)",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  cardDescriptionAccent: {
    color: "#93c5fd",
  },
  cardDescriptionDanger: {
    color: "rgba(248,113,113,0.7)",
  },
  chevron: {
    fontSize: 28,
    color: "#94a3b8",
    marginLeft: 12,
  },
});
