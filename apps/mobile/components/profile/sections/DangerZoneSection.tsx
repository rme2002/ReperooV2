import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

type DangerZoneSectionProps = {
  onLogout: () => void;
};

export function DangerZoneSection({ onLogout }: DangerZoneSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>DANGER ZONE</Text>
      <View style={[styles.card, styles.dangerCard]}>
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
          ]}
          onPress={onLogout}
        >
          <Text style={styles.logoutLabel}>Log out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
