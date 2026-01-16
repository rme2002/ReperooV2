import { View, Image, Text, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from "react-native-reanimated";
import { RainbowArcs } from "./RainbowArcs";
import { LevelBadge } from "./LevelBadge";

type MascotHeroSectionProps = {
  userName?: string;
  level: number;
  xp: number;
  xpMax: number;
  rooStage: string;
  streakDays: number;
  scrollY: SharedValue<number>;
};

const HERO_HEIGHT_EXPANDED = 240;
const HERO_HEIGHT_COLLAPSED = 56;
const COLLAPSE_START = 0;
const COLLAPSE_END = 120;

export function MascotHeroSection({
  userName,
  level,
  xp,
  xpMax,
  rooStage,
  streakDays,
  scrollY,
}: MascotHeroSectionProps) {
  const { width } = useWindowDimensions();
  const containerWidth = Math.min(width - 40, 320);
  const arcSize = containerWidth * 0.85;
  const mascotSize = containerWidth * 0.45;
  const miniMascotSize = 40;

  const xpProgress = xpMax > 0 ? (xp / xpMax) * 100 : 0;

  const animatedContainerStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [COLLAPSE_START, COLLAPSE_END],
      [HERO_HEIGHT_EXPANDED, HERO_HEIGHT_COLLAPSED],
      Extrapolation.CLAMP
    );
    return { height };
  });

  const animatedHeroStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [COLLAPSE_START, COLLAPSE_END * 0.6],
      [1, 0],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      scrollY.value,
      [COLLAPSE_START, COLLAPSE_END],
      [1, 0.5],
      Extrapolation.CLAMP
    );
    return { opacity, transform: [{ scale }] };
  });

  const animatedCollapsedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [COLLAPSE_END * 0.7, COLLAPSE_END],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const animatedLevelBadgeStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [COLLAPSE_START, COLLAPSE_END],
      [0, 8],
      Extrapolation.CLAMP
    );
    return { transform: [{ translateY }] };
  });

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      {/* Level badge - top right (only persistent level indicator) */}
      <Animated.View style={[styles.levelBadgeContainer, animatedLevelBadgeStyle]}>
        <LevelBadge level={level} variant="light" />
      </Animated.View>

      {/* Expanded state: Full hero with arcs and mascot */}
      <Animated.View style={[styles.heroContent, { width: containerWidth }, animatedHeroStyle]}>
        <View style={styles.arcsContainer}>
          <RainbowArcs size={arcSize} />
        </View>

        <View
          style={[
            styles.mascotContainer,
            { width: mascotSize, height: mascotSize, marginTop: -(arcSize * 0.32) },
          ]}
        >
          <Image
            source={require("@/assets/images/mascotV1.png")}
            style={styles.mascotImage}
            resizeMode="contain"
          />
        </View>

        {/* XP Progress bar */}
        <View style={styles.xpContainer}>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${xpProgress}%` }]} />
          </View>
          <Text style={styles.xpText}>{xp} / {xpMax} XP</Text>
        </View>

        {/* Streak indicator */}
        <View style={styles.streakIndicator}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakNumber}>{streakDays}</Text>
        </View>
      </Animated.View>

      {/* Collapsed state: Mini mascot avatar */}
      <Animated.View style={[styles.collapsedRow, animatedCollapsedStyle]}>
        <View style={styles.miniMascotContainer}>
          <Image
            source={require("@/assets/images/mascotV1.png")}
            style={[styles.miniMascot, { width: miniMascotSize, height: miniMascotSize }]}
            resizeMode="contain"
          />
        </View>
        <View style={styles.collapsedInfo}>
          <View style={styles.collapsedTopRow}>
            <Text style={styles.collapsedXpText}>{xp}/{xpMax} XP</Text>
            <View style={styles.miniStreakIndicator}>
              <Text style={styles.miniStreakEmoji}>🔥</Text>
              <Text style={styles.miniStreakNumber}>{streakDays}</Text>
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
    paddingTop: 10,
    paddingBottom: 8,
    position: "relative",
    overflow: "hidden",
  },
  levelBadgeContainer: {
    position: "absolute",
    top: 10,
    right: 0,
    zIndex: 10,
  },
  heroContent: {
    alignItems: "center",
    position: "relative",
  },
  arcsContainer: {
    alignItems: "center",
  },
  mascotContainer: {
    zIndex: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  mascotImage: {
    width: "100%",
    height: "100%",
  },
  xpContainer: {
    marginTop: 10,
    alignItems: "center",
    gap: 4,
  },
  xpTrack: {
    width: 140,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#ede7dc",
    overflow: "hidden",
  },
  xpFill: {
    height: "100%",
    backgroundColor: "#22A45D",
    borderRadius: 999,
  },
  xpText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  streakIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  streakEmoji: {
    fontSize: 18,
  },
  streakNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
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
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 4,
    shadowColor: "#0f172a",
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
    color: "#111827",
  },
  miniStreakIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  miniStreakEmoji: {
    fontSize: 12,
  },
  miniStreakNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  miniXpTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "#ede7dc",
    overflow: "hidden",
    maxWidth: 100,
  },
  miniXpFill: {
    height: "100%",
    backgroundColor: "#22A45D",
    borderRadius: 999,
  },
});
