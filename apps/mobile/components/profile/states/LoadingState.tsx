import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colors } from "@/constants/theme";

export function LoadingState() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
