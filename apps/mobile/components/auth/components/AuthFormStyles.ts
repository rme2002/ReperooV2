import { StyleSheet } from "react-native";

export const authFormStyles = StyleSheet.create({
  form: {
    gap: 16,
  },
  label: {
    color: "rgba(248,250,252,0.8)",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  fieldGroup: {
    gap: 8,
  },
  input: {
    marginTop: 8,
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    color: "#ffffff",
    fontSize: 16,
  },
  inputError: {
    borderColor: "rgba(248,113,113,0.8)",
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: "#2563eb",
    borderRadius: 18,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
