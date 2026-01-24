import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

type PreferenceRowProps = {
  label: string;
  value: string;
  onPress: () => void;
};

export function PreferenceRow({ label, value, onPress }: PreferenceRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}
      onPress={onPress}
    >
      <View>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listRowPressed: {
    opacity: 0.85,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  rowValue: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 4,
  },
  chevron: {
    fontSize: 22,
    color: colors.textTertiary,
  },
});
