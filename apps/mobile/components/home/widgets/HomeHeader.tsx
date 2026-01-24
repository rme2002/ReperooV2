import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

export function HomeHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <Text style={styles.mascot}>🦘</Text>
        <Text style={styles.brand}>Reperoo</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mascot: {
    fontSize: 24,
  },
  brand: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
});
