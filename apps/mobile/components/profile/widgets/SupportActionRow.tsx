import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "@/constants/theme";

type SupportActionRowProps = {
  title: string;
  subtitle: string;
  onPress: () => void;
};

export function SupportActionRow({
  title,
  subtitle,
  onPress,
}: SupportActionRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.supportButton,
        pressed && styles.supportButtonPressed,
      ]}
      onPress={onPress}
    >
      <Text style={styles.supportButtonText}>{title}</Text>
      <Text style={styles.supportSubtext}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
});
