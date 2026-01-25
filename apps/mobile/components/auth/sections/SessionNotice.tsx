import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

export function SessionNotice() {
  return (
    <View style={styles.sessionNotice}>
      <Text style={styles.sessionTitle}>Already signed in</Text>
      <Text style={styles.sessionDescription}>
        You are authenticated with Supabase. You can switch accounts from
        Settings if needed.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sessionNotice: {
    marginTop: 8,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: "rgba(31, 138, 91, 0.12)",
    gap: 6,
  },
  sessionTitle: {
    color: colors.success,
    fontSize: 14,
    fontWeight: "700",
  },
  sessionDescription: {
    color: colors.success,
    fontSize: 13,
    lineHeight: 18,
  },
});
