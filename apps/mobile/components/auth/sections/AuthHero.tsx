import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

export function AuthHero() {
  return (
    <View style={styles.hero}>
      <Text style={styles.badge}>Reperoo</Text>
      <Text style={styles.heading}>Log in or start your budgeting streak.</Text>
      <Text style={styles.subtitle}>
        Use your email and password to get into Reperoo. Sign up goes straight to
        the FastAPI backend, while login uses Supabase.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 10,
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    color: colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
