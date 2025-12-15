import { StyleSheet } from "react-native";

export const authFormStyles = StyleSheet.create({
  form: {
    gap: 14,
  },
  label: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  fieldGroup: {
    gap: 6,
  },
  input: {
    marginTop: 6,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    color: "#0f172a",
    fontSize: 15,
  },
  inputError: {
    borderColor: "rgba(248,113,113,0.9)",
  },
  primaryButton: {
    marginTop: 6,
    backgroundColor: "#0f172a",
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
