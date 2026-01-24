import { StyleSheet, Text, View } from "react-native";
import { alpha, palette } from "@/constants/theme";

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Need a break?</Text>
        <Text style={styles.body}>
          This modal is a placeholder for future quick actions—alerts,
          escalations, or anything you need to surface outside the main
          navigation.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.slate950,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: alpha.ink95,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: alpha.slate35,
  },
  title: {
    color: palette.slate190,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
  body: {
    color: alpha.slate80,
    fontSize: 15,
    lineHeight: 22,
  },
});