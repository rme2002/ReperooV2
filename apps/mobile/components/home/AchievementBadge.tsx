import { useEffect } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
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

// Badge image mapping
const BADGE_IMAGES: Record<number, any> = {
  7: require("@/assets/images/achievementBadges/achievementBadge1.png"),
  14: require("@/assets/images/achievementBadges/achievementBadge2.png"),
  30: require("@/assets/images/achievementBadges/achievementBadge3.png"),
  60: require("@/assets/images/achievementBadges/achievementBadge4.png"),
  100: require("@/assets/images/achievementBadges/achievementBadge5.png"),
  150: require("@/assets/images/achievementBadges/achievementBadge6.png"),
  200: require("@/assets/images/achievementBadges/achievementBadge7.png"),
  365: require("@/assets/images/achievementBadges/achievementBadge8.png"),
};

// Badge tier colors
const TIER_COLORS: Record<
  BadgeTier,
  { primary: string; secondary: string; glow: string }
> = {
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
    case 7:
      return "Week Warrior";
    case 14:
      return "Habit Hunter";
    case 30:
      return "Month Master";
    case 60:
      return "Knight of the Budget";
    case 100:
      return "Wealth Crafter";
    case 150:
      return "Capital Keeper";
    case 200:
      return "Finance Architect";
    case 365:
      return "Reperoo Legend";
    default:
      return `${days} Day Streak`;
  }
}

// Badge Image Component
function BadgeImage({
  days,
  achieved,
  size = 60,
}: {
  days: number;
  achieved: boolean;
  size?: number;
}) {
  const badgeImage = BADGE_IMAGES[days];

  if (!badgeImage) {
    return null;
  }

  if (!achieved) {
    // For locked badges, render with a strong grey effect and lock icon
    return (
      <View
        style={{
          position: "relative",
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Image
          source={badgeImage}
          style={{
            width: size,
            height: size,
            tintColor: palette.gray700,
            opacity: 0.25,
          }}
          resizeMode="contain"
        />
        {/* Lock icon overlay */}
        <Ionicons
          name="lock-closed"
          size={size * 0.25}
          color={palette.gray500}
          style={{ position: "absolute" }}
        />
      </View>
    );
  }

  return (
    <Image
      source={badgeImage}
      style={{
        width: size,
        height: size,
      }}
      resizeMode="contain"
    />
  );
}

// Sparkle component with quick shine effect at random locations
function SparkleEffect({
  size,
  delay = 0,
  duration = 800,
  containerSize = 100,
}: {
  size: number;
  delay?: number;
  duration?: number;
  containerSize?: number;
}) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    // Start after delay
    const timeout = setTimeout(() => {
      const totalCycleDuration = duration + 1500; // shine duration + wait time

      opacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(0.9, { duration: duration * 0.3 }),
          withTiming(0, { duration: duration * 0.7 }),
          withTiming(0, { duration: 1500 }), // wait before next shine
        ),
        -1,
        false,
      );

      // Jump to new random position at the start of each cycle
      const animatePosition = () => {
        translateX.value = withRepeat(
          withSequence(
            withTiming((Math.random() - 0.5) * containerSize * 0.6, {
              duration: 0,
            }),
            withTiming((Math.random() - 0.5) * containerSize * 0.6, {
              duration: totalCycleDuration,
            }),
          ),
          -1,
          false,
        );

        translateY.value = withRepeat(
          withSequence(
            withTiming((Math.random() - 0.5) * containerSize * 0.6, {
              duration: 0,
            }),
            withTiming((Math.random() - 0.5) * containerSize * 0.6, {
              duration: totalCycleDuration,
            }),
          ),
          -1,
          false,
        );
      };

      animatePosition();
    }, delay);

    return () => clearTimeout(timeout);
  }, [containerSize, delay, duration, opacity, translateX, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.Image
      source={require("@/assets/images/sparkles.png")}
      style={[
        {
          position: "absolute",
          width: size * 0.35,
          height: size * 0.35,
        },
        animatedStyle,
      ]}
      resizeMode="contain"
    />
  );
}

// Generate random sparkle positions based on badge days (consistent per badge)
function getRandomSparkles(days: number, count: number, containerSize: number) {
  const sparkles: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    delay: number;
    duration: number;
  }[] = [];

  // Use days as seed for consistent randomness per badge
  const random = (index: number, max: number) => {
    const seed = (days * 9301 + index * 49297) % 233280;
    return (seed / 233280) * max;
  };

  for (let i = 0; i < count; i++) {
    const positionType = Math.floor(random(i, 4));
    const delay = random(i + 100, 2000);
    const duration = 600 + random(i + 200, 400);

    let position: {
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
      delay: number;
      duration: number;
    };

    switch (positionType) {
      case 0: // Top area
        position = {
          top: random(i + 10, containerSize * 0.3),
          left: random(i + 20, containerSize * 0.8),
          delay,
          duration,
        };
        break;
      case 1: // Right area
        position = {
          top: random(i + 30, containerSize * 0.6),
          right: random(i + 40, containerSize * 0.3),
          delay,
          duration,
        };
        break;
      case 2: // Bottom area
        position = {
          bottom: random(i + 50, containerSize * 0.4),
          left: random(i + 60, containerSize * 0.8),
          delay,
          duration,
        };
        break;
      default: // Left area
        position = {
          top: random(i + 70, containerSize * 0.6),
          left: random(i + 80, containerSize * 0.3),
          delay,
          duration,
        };
    }

    sparkles.push(position);
  }

  return sparkles;
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
      // Faster, less dramatic entrance animation
      scale.value = withSequence(
        withSpring(1.05, { damping: 10, stiffness: 300 }),
        withSpring(1, { damping: 15, stiffness: 300 }),
      );
      glowOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [achieved, glowOpacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const colors = TIER_COLORS[tier];
  const compactSparkles = getRandomSparkles(days, 5, 100);
  const fullSparkles = getRandomSparkles(days, 6, 120);

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
        <BadgeImage days={days} achieved={achieved} size={100} />
        {achieved && (
          <>
            {/* Random sparkles at different positions */}
            {compactSparkles.map((sparkle, index) => (
              <View
                key={index}
                style={{
                  position: "absolute",
                  top: sparkle.top,
                  bottom: sparkle.bottom,
                  left: sparkle.left,
                  right: sparkle.right,
                }}
              >
                <SparkleEffect
                  size={100}
                  delay={sparkle.delay}
                  duration={sparkle.duration}
                  containerSize={100}
                />
              </View>
            ))}
          </>
        )}
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
      <BadgeImage days={days} achieved={achieved} size={110} />
      {achieved && (
        <>
          {/* Random sparkles at different positions */}
          {fullSparkles.map((sparkle, index) => (
            <View
              key={index}
              style={{
                position: "absolute",
                top: sparkle.top,
                bottom: sparkle.bottom,
                left: sparkle.left,
                right: sparkle.right,
              }}
            >
              <SparkleEffect
                size={110}
                delay={sparkle.delay}
                duration={sparkle.duration}
                containerSize={120}
              />
            </View>
          ))}
        </>
      )}
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
    width: 120,
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
    width: 72,
    height: 92,
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
