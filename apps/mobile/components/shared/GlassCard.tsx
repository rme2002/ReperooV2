import { ReactNode } from "react";
import { StyleSheet, ViewStyle, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

type GlassCardProps = {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  pressable?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassCard({
  children,
  style,
  onPress,
  pressable = false,
}: GlassCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (pressable || onPress) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    if (pressable || onPress) {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    }
  };

  if (onPress || pressable) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.container, animatedStyle, style]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View style={[styles.container, style]}>{children}</Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.7)",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
});
