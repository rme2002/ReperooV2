import { View, Text, StyleSheet } from "react-native";

type LevelBadgeProps = {
  level: number;
  variant?: "dark" | "light";
};

export function LevelBadge({ level, variant = "dark" }: LevelBadgeProps) {
  const isDark = variant === "dark";

  return (
    <View
      style={[styles.badge, isDark ? styles.badgeDark : styles.badgeLight]}
    >
      <Text style={[styles.text, isDark ? styles.textDark : styles.textLight]}>
        Level {level}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeDark: {
    backgroundColor: "#111827",
  },
  badgeLight: {
    backgroundColor: "#22A45D",
  },
  text: {
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  textDark: {
    color: "#f8fafc",
  },
  textLight: {
    color: "#ffffff",
  },
});
