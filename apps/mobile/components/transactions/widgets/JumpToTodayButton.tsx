import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "@/constants/theme";

type JumpToTodayButtonProps = {
  onPress: () => void;
  visible: boolean;
};

export function JumpToTodayButton({
  onPress,
  visible,
}: JumpToTodayButtonProps) {
  if (!visible) return null;

  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.buttonText}>Today</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textLight,
  },
});
