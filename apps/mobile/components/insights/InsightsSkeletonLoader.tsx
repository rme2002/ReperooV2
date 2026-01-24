import { View, StyleSheet, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette } from "@/constants/theme";

export function InsightsSkeletonLoader() {
  const { width } = useWindowDimensions();
  const scale = Math.min(Math.max(width / 375, 0.85), 1.25);
  const cardPadding = 16 * scale;
  const cardGap = 12 * scale;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Month header skeleton */}
        <View style={[styles.headerSkeleton, { marginBottom: cardGap }]}>
          <View style={[styles.skeletonBox, { width: 150, height: 28 }]} />
          <View style={[styles.skeletonBox, { width: 100, height: 20 }]} />
        </View>

        {/* Budget summary card skeleton */}
        <View style={[styles.card, { padding: cardPadding, marginBottom: cardGap }]}>
          <View style={[styles.skeletonBox, { width: 120, height: 48, marginBottom: 8 }]} />
          <View style={[styles.skeletonBox, { width: 180, height: 20, marginBottom: 16 }]} />
          <View style={[styles.skeletonBox, { width: "100%", height: 8, marginBottom: 12 }]} />
          <View style={styles.row}>
            <View style={[styles.skeletonBox, { width: 100, height: 16 }]} />
            <View style={[styles.skeletonBox, { width: 80, height: 16 }]} />
          </View>
        </View>

        {/* Budget plan card skeleton */}
        <View style={[styles.card, { padding: cardPadding, marginBottom: cardGap }]}>
          <View style={[styles.skeletonBox, { width: 140, height: 24, marginBottom: 16 }]} />
          <View style={styles.row}>
            <View style={[styles.skeletonBox, { width: 100, height: 40 }]} />
            <View style={[styles.skeletonBox, { width: 100, height: 40 }]} />
          </View>
        </View>

        {/* Chart skeleton */}
        <View style={[styles.card, { padding: cardPadding, marginBottom: cardGap }]}>
          <View style={[styles.skeletonBox, { width: 160, height: 24, marginBottom: 16 }]} />
          <View style={[styles.skeletonCircle, { alignSelf: "center", marginBottom: 16 }]} />
          <View style={[styles.skeletonBox, { width: "100%", height: 100 }]} />
        </View>

        {/* Category list skeleton */}
        <View style={[styles.card, { padding: cardPadding }]}>
          <View style={[styles.skeletonBox, { width: 180, height: 24, marginBottom: 16 }]} />
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.categoryRow, { marginBottom: 12 }]}>
              <View style={[styles.skeletonBox, { width: 40, height: 40, borderRadius: 8 }]} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={[styles.skeletonBox, { width: "60%", height: 18, marginBottom: 6 }]} />
                <View style={[styles.skeletonBox, { width: "40%", height: 14 }]} />
              </View>
              <View style={[styles.skeletonBox, { width: 60, height: 18 }]} />
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.slate170,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerSkeleton: {
    alignItems: "center",
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: 12,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  skeletonBox: {
    backgroundColor: palette.slate220,
    borderRadius: 6,
  },
  skeletonCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: palette.slate220,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
