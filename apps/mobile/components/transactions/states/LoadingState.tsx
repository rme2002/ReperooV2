import { StyleSheet, View } from "react-native";
import { colors } from "@/constants/theme";

export function LoadingState() {
  return (
    <View style={styles.listCard}>
      {[0, 1, 2].map((row) => (
        <View key={`skeleton-${row}`} style={styles.skeletonRow}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonBody}>
            <View style={styles.skeletonLineWide} />
            <View style={styles.skeletonLine} />
          </View>
          <View style={styles.skeletonValue} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 14,
    marginBottom: 12,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  skeletonIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.borderLight,
  },
  skeletonBody: {
    flex: 1,
    gap: 6,
  },
  skeletonLineWide: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.borderLight,
  },
  skeletonLine: {
    height: 10,
    width: "60%",
    borderRadius: 5,
    backgroundColor: colors.borderLight,
  },
  skeletonValue: {
    width: 60,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.borderLight,
  },
});
