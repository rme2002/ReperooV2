import { useEffect } from "react";
import {
  View,
  Image,
  Text,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  interpolate,
  Extrapolation,
  SharedValue,
} from "react-native-reanimated";
import { EvolutionStage } from "@/lib/gen/model";
import {
  getEvolutionImage,
  getEvolutionDisplayName,
} from "@/utils/evolutionHelpers";
import { colors } from "@/constants/theme";

type MascotHeroSectionProps = {
  evolutionStage: EvolutionStage;
  level: number;
  currentXP: number;
  maxXP: number;
  streakDays: number;
  scrollY: SharedValue<number>;
};

// Layout constants
const HERO_HEIGHT_EXPANDED = 240;
const HERO_HEIGHT_COLLAPSED = 56;
const COLLAPSE_START = 0;
const COLLAPSE_END = 120;

// Sparkle configuration - 8 positions with random durations
const SPARKLE_POSITIONS = [
  { x: -85, y: -60, duration: 600 },
  { x: 90, y: -50, duration: 450 },
  { x: -80, y: 50, duration: 550 },
  { x: 95, y: 40, duration: 700 },
  { x: -50, y: -80, duration: 500 },
  { x: 55, y: 70, duration: 650 },
  { x: -95, y: 0, duration: 400 },
  { x: 100, y: -10, duration: 750 },
];

type SparkleProps = {
  offsetX: number;
  offsetY: number;
  delay: number;
  duration: number;
};

function Sparkle({ offsetX, offsetY, delay, duration }: SparkleProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    // Simple looping animation: fade in -> fade out -> repeat with random duration
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration }), withTiming(0, { duration })),
        -1,
        false,
      ),
    );

    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration }),
          withTiming(0.5, { duration }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, duration, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Image
      source={require("@/assets/images/sparkles.png")}
      style={[
        styles.sparkle,
        { marginLeft: offsetX, marginTop: offsetY },
        animatedStyle,
      ]}
      resizeMode="contain"
    />
  );
}

export function MascotHeroSection({
  evolutionStage,
  level,
  currentXP,
  maxXP,
  streakDays,
  scrollY,
}: MascotHeroSectionProps) {
  const { width } = useWindowDimensions();

  // Sizing
  const containerWidth = Math.min(width - 40, 320);
  const heroBaseSize = containerWidth * 1.1;
  const miniMascotSize = 40;

  const xpProgress = maxXP > 0 ? (currentXP / maxXP) * 100 : 0;

  // Container height animation
  const animatedContainerStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [COLLAPSE_START, COLLAPSE_END],
      [HERO_HEIGHT_EXPANDED, HERO_HEIGHT_COLLAPSED],
      Extrapolation.CLAMP,
    );
    return { height };
  });

  // Hero base animation - stays visible longest
  const animatedHeroStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [COLLAPSE_START, COLLAPSE_END * 0.8],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      scrollY.value,
      [COLLAPSE_START, COLLAPSE_END],
      [1, 0.75],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [COLLAPSE_START, COLLAPSE_END],
      [0, -30],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ scale }, { translateY }] };
  });

  // Collapsed state animation
  const animatedCollapsedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [COLLAPSE_END * 0.7, COLLAPSE_END],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      {/* Expanded state: Hero base image */}
      <View style={[styles.heroContent, { width: containerWidth }]}>
        <Animated.View style={[styles.heroImageWrapper, animatedHeroStyle]}>
          <Image
            source={getEvolutionImage(evolutionStage)}
            style={[
              styles.heroBase,
              { width: heroBaseSize, height: heroBaseSize },
            ]}
            resizeMode="contain"
          />

          {/* Sparkles (continuous animation) */}
          <View style={styles.sparkleContainer}>
            {SPARKLE_POSITIONS.map((pos, index) => (
              <Sparkle
                key={index}
                offsetX={pos.x}
                offsetY={pos.y}
                delay={index * 150}
                duration={pos.duration}
              />
            ))}
          </View>

          {/* Stage name display */}
          <Animated.View style={[styles.stageNameContainer, animatedHeroStyle]}>
            <Text style={styles.stageNameText}>
              Level {level} · {getEvolutionDisplayName(evolutionStage)}
            </Text>
          </Animated.View>
        </Animated.View>
      </View>

      {/* Collapsed state: Mini mascot avatar */}
      <Animated.View style={[styles.collapsedRow, animatedCollapsedStyle]}>
        <View style={styles.miniMascotContainer}>
          <Image
            source={getEvolutionImage(evolutionStage)}
            style={[
              styles.miniMascot,
              { width: miniMascotSize, height: miniMascotSize },
            ]}
            resizeMode="contain"
          />
        </View>
        <View style={styles.collapsedInfo}>
          <View style={styles.collapsedTopRow}>
            <Text style={styles.collapsedXpText}>
              {currentXP}/{maxXP} XP
            </Text>
            <View style={styles.miniStreakIndicator}>
              <Text style={styles.miniStreakNumber}>{streakDays}d</Text>
            </View>
          </View>
          <View style={styles.miniXpTrack}>
            <View style={[styles.miniXpFill, { width: `${xpProgress}%` }]} />
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: 0,
    paddingBottom: -50,
    position: "relative",
    overflow: "hidden",
  },
  heroContent: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  heroImageWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -110,
  },
  heroBase: {
    zIndex: 1,
  },
  sparkleContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
  },
  sparkle: {
    position: "absolute",
    width: 48,
    height: 48,
  },
  stageNameContainer: {
    marginTop: 8,
    alignItems: "center",
  },
  stageNameText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  collapsedRow: {
    position: "absolute",
    top: 8,
    left: 0,
    right: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 4,
  },
  miniMascotContainer: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 4,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  miniMascot: {
    borderRadius: 16,
  },
  collapsedInfo: {
    flex: 1,
    gap: 4,
  },
  collapsedTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  collapsedXpText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  miniStreakIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  miniStreakNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  miniXpTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: "hidden",
    maxWidth: 100,
  },
  miniXpFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
});
