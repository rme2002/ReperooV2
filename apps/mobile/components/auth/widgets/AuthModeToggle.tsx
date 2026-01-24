import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

type AuthMode = "login" | "signup";

type AuthModeToggleProps = {
  mode: AuthMode;
  onChangeMode: (mode: AuthMode) => void;
};

export function AuthModeToggle({ mode, onChangeMode }: AuthModeToggleProps) {
  return (
    <View style={styles.segmented}>
      {(["login", "signup"] as AuthMode[]).map((key) => (
        <Pressable
          key={key}
          onPress={() => onChangeMode(key)}
          style={[styles.segmentButton, mode === key && styles.segmentButtonActive]}
        >
          <Text style={[styles.segmentText, mode === key && styles.segmentTextActive]}>
            {key === "login" ? "Log in" : "Create account"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  segmented: {
    flexDirection: "row",
    borderRadius: 14,
    backgroundColor: colors.borderLight,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentButtonActive: {
    backgroundColor: "rgba(31, 138, 91, 0.12)",
  },
  segmentText: {
    color: colors.textTertiary,
    fontSize: 14,
    fontWeight: "700",
  },
  segmentTextActive: {
    color: colors.text,
  },
});
