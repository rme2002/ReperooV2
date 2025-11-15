import { StyleSheet, Text, View } from "react-native";

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
    backgroundColor: "#030712",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "rgba(15,23,42,0.95)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
  },
  title: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
  body: {
    color: "rgba(226,232,240,0.8)",
    fontSize: 15,
    lineHeight: 22,
  },
});
