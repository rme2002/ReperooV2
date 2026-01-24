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
import { alpha, colors, palette } from "@/constants/theme";

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
  bronze: {
    primary: palette.metalBronze,
    secondary: palette.metalBronzeDark,
    glow: alpha.bronze30,
  },
  silver: {
    primary: palette.metalSilver,
    secondary: palette.metalSilverDark,
    glow: alpha.silver30,
  },
  gold: {
    primary: palette.metalGold,
    secondary: palette.metalGoldDark,
    glow: alpha.gold40,
  },
  platinum: {
    primary: palette.metalPlatinum,
    secondary: palette.metalPlatinumDark,
    glow: alpha.platinum40,
  },
  diamond: {
    primary: palette.metalDiamond,
    secondary: palette.cyan500,
    glow: alpha.diamond50,
  },
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
  const fillColor = achieved ? colors.primary : palette.gray400;
  const strokeColor = achieved ? colors.secondary : palette.gray500;

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id={`grad-${tier}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop
            offset="0%"
            stopColor={achieved ? colors.primary : palette.slate260}
          />
          <Stop
            offset="100%"
            stopColor={achieved ? colors.secondary : palette.gray400}
          />
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
        fill={achieved ? palette.white : palette.slate220}
        opacity={achieved ? 1 : 0.5}
      />

      {/* Lock overlay for locked badges */}
      {!achieved && (
        <>
          <Circle cx="32" cy="44" r="8" fill={palette.gray500} />
          <Path
            d="M28 44 L28 40 C28 38 30 36 32 36 C34 36 36 38 36 40 L36 44"
            stroke={palette.gray400}
            strokeWidth="2"
            fill="none"
          />
          <Circle cx="32" cy="45" r="2" fill={palette.gray400} />
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
    backgroundColor: `${colors.surface}CC`,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 8,
    position: "relative",
    overflow: "hidden",
  },
  compactContainer: {
    width: 64,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${colors.surface}CC`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
    color: colors.text,
    textAlign: "center",
  },
  days: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  compactDays: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
  },
  xpBadge: {
    backgroundColor: `${colors.gold}26`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  xpBadgeLocked: {
    backgroundColor: `${colors.textTertiary}26`,
  },
  xpText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.gold,
  },
  xpTextLocked: {
    color: colors.textTertiary,
  },
  lockedText: {
    color: colors.textTertiary,
  },
});
