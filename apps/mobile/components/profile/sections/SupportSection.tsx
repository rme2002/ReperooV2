import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import { SupportActionRow } from "../widgets/SupportActionRow";

type SupportSectionProps = {
  onResetPassword: () => void;
  onContactSupport: () => void;
};

export function SupportSection({
  onResetPassword,
  onContactSupport,
}: SupportSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>SUPPORT</Text>
      <View style={styles.card}>
        <SupportActionRow
          title="Reset password"
          subtitle="Opens the forgot-password flow"
          onPress={onResetPassword}
        />
        <View style={styles.divider} />
        <SupportActionRow
          title="Contact support"
          subtitle="Email support@reperoo.app"
          onPress={onContactSupport}
        />
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
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
});
