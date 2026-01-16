import { View, StyleSheet } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

type RainbowArcsProps = {
  size: number;
};

const RAINBOW_GRADIENTS = [
  { id: "arc1", colors: ["#81C784", "#66BB6A"] }, // Outer - soft green
  { id: "arc2", colors: ["#FFD54F", "#FFCA28"] }, // Middle - golden yellow
  { id: "arc3", colors: ["#FFB088", "#FF8A65"] }, // Inner - warm coral/orange
];

export function RainbowArcs({ size }: RainbowArcsProps) {
  const strokeWidth = size * 0.08;
  const gap = size * 0.03;
  const centerX = size / 2;
  const svgHeight = size / 2 + strokeWidth;

  const arcs = RAINBOW_GRADIENTS.map((gradient, index) => {
    const radius =
      size / 2 - strokeWidth / 2 - index * (strokeWidth + gap) - gap;
    const circumference = 2 * Math.PI * radius;
    const arcLength = circumference * 0.5;

    return {
      ...gradient,
      radius,
      circumference,
      arcLength,
    };
  });

  return (
    <View style={[styles.container, { width: size, height: svgHeight }]}>
      <Svg width={size} height={svgHeight}>
        <Defs>
          {arcs.map((arc) => (
            <LinearGradient
              key={arc.id}
              id={arc.id}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <Stop offset="0%" stopColor={arc.colors[0]} />
              <Stop offset="100%" stopColor={arc.colors[1]} />
            </LinearGradient>
          ))}
        </Defs>
        {arcs.map((arc) => (
          <Circle
            key={arc.id}
            cx={centerX}
            cy={svgHeight}
            r={arc.radius}
            stroke={`url(#${arc.id})`}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arc.arcLength} ${arc.circumference}`}
            strokeLinecap="round"
            fill="none"
            rotation={-180}
            originX={centerX}
            originY={svgHeight}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
});
