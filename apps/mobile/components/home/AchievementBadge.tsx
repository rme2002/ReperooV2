import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";

type BadgeTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

type AchievementBadgeProps = {
  days: number;
  name: string;
  xpReward: number;
  achieved: boolean;
  tier: BadgeTier;
  compact?: boolean;
};

// Badge tier colors
const TIER_COLORS: Record<BadgeTier, { primary: string; secondary: string; glow: string }> = {
  bronze: { primary: "#CD7F32", secondary: "#A0522D", glow: "rgba(205, 127, 50, 0.3)" },
  silver: { primary: "#C0C0C0", secondary: "#808080", glow: "rgba(192, 192, 192, 0.3)" },
  gold: { primary: "#FFD700", secondary: "#DAA520", glow: "rgba(255, 215, 0, 0.4)" },
  platinum: { primary: "#E5E4E2", secondary: "#A8A8A8", glow: "rgba(229, 228, 226, 0.4)" },
  diamond: { primary: "#B9F2FF", secondary: "#00CED1", glow: "rgba(185, 242, 255, 0.5)" },
};

// Get badge tier based on days
export function getBadgeTier(days: number): BadgeTier {
  if (days <= 14) return "bronze";
  if (days <= 60) return "silver";
  if (days <= 150) return "gold";
  if (days < 365) return "platinum";
  return "diamond";
}

// Get badge name based on days
export function getBadgeName(days: number): string {
  switch (days) {
    case 7: return "Week Warrior";
    case 14: return "Fortnight Champion";
    case 30: return "Monthly Master";
    case 60: return "Consistent Tracker";
    case 100: return "Century Club";
    case 150: return "Elite Saver";
    case 200: return "Financial Guru";
    case 365: return "Year Legend";
    default: return `${days} Day Streak`;
  }
}

// Badge Shield SVG Component
function BadgeShield({
  tier,
  achieved,
  size = 60,
}: {
  tier: BadgeTier;
  achieved: boolean;
  size?: number;
}) {
  const colors = TIER_COLORS[tier];
  const fillColor = achieved ? colors.primary : "#9ca3af";
  const strokeColor = achieved ? colors.secondary : "#6b7280";

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id={`grad-${tier}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={achieved ? colors.primary : "#d1d5db"} />
          <Stop offset="100%" stopColor={achieved ? colors.secondary : "#9ca3af"} />
        </LinearGradient>
      </Defs>

      {/* Shield shape */}
      <Path
        d="M32 4 L56 12 L56 32 C56 48 32 60 32 60 C32 60 8 48 8 32 L8 12 Z"
        fill={`url(#grad-${tier})`}
        stroke={strokeColor}
        strokeWidth="2"
      />

      {/* Star in center */}
      <Path
        d="M32 18 L34.5 26 L43 26 L36.5 31 L39 39 L32 34 L25 39 L27.5 31 L21 26 L29.5 26 Z"
        fill={achieved ? "#FFFFFF" : "#e5e7eb"}
        opacity={achieved ? 1 : 0.5}
      />

      {/* Lock overlay for locked badges */}
      {!achieved && (
        <>
          <Circle cx="32" cy="44" r="8" fill="#6b7280" />
          <Path
            d="M28 44 L28 40 C28 38 30 36 32 36 C34 36 36 38 36 40 L36 44"
            stroke="#9ca3af"
            strokeWidth="2"
            fill="none"
          />
          <Circle cx="32" cy="45" r="2" fill="#9ca3af" />
        </>
      )}
    </Svg>
  );
}

export function AchievementBadge({
  days,
  name,
  xpReward,
  achieved,
  tier,
  compact = false,
}: AchievementBadgeProps) {
  const scale = useSharedValue(achieved ? 1 : 0.95);
  const glowOpacity = useSharedValue(achieved ? 1 : 0);

  useEffect(() => {
    if (achieved) {
      // Entrance animation for unlocked badges
      scale.value = withSequence(
        withSpring(1.1, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
      glowOpacity.value = withTiming(1, { duration: 500 });
    }
  }, [achieved]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const colors = TIER_COLORS[tier];

  if (compact) {
    return (
      <Animated.View style={[styles.compactContainer, animatedStyle]}>
        {achieved && (
          <Animated.View
            style={[
              styles.glowEffect,
              { backgroundColor: colors.glow },
              glowStyle,
            ]}
          />
        )}
        <BadgeShield tier={tier} achieved={achieved} size={44} />
        <Text style={[styles.compactDays, !achieved && styles.lockedText]}>
          {days}d
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {achieved && (
        <Animated.View
          style={[
            styles.glowEffect,
            styles.glowEffectFull,
            { backgroundColor: colors.glow },
            glowStyle,
          ]}
        />
      )}
      <BadgeShield tier={tier} achieved={achieved} size={60} />
      <View style={styles.info}>
        <Text
          style={[styles.name, !achieved && styles.lockedText]}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text style={[styles.days, !achieved && styles.lockedText]}>
          {days} days
        </Text>
        <View style={[styles.xpBadge, !achieved && styles.xpBadgeLocked]}>
          <Text style={[styles.xpText, !achieved && styles.xpTextLocked]}>
            +{xpReward} XP
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 100,
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    gap: 8,
    position: "relative",
    overflow: "hidden",
  },
  compactContainer: {
    width: 64,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    gap: 4,
    position: "relative",
    overflow: "hidden",
  },
  glowEffect: {
    position: "absolute",
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 20,
  },
  glowEffectFull: {
    borderRadius: 24,
  },
  info: {
    alignItems: "center",
    gap: 2,
  },
  name: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  days: {
    fontSize: 10,
    fontWeight: "500",
    color: "#6b7280",
  },
  compactDays: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
  },
  xpBadge: {
    backgroundColor: "rgba(34, 164, 93, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  xpBadgeLocked: {
    backgroundColor: "rgba(156, 163, 175, 0.15)",
  },
  xpText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#22A45D",
  },
  xpTextLocked: {
    color: "#9ca3af",
  },
  lockedText: {
    color: "#9ca3af",
  },
});
