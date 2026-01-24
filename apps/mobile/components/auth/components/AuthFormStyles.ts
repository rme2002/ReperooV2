import { StyleSheet } from "react-native";
import { alpha, colors, palette } from "@/constants/theme";

export const authFormStyles = StyleSheet.create({
  form: {
    gap: 14,
  },
  label: {
    color: palette.slate900,
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
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: alpha.ink08,
    color: palette.slate900,
    fontSize: 15,
  },
  inputError: {
    borderColor: alpha.red90,
  },
  primaryButton: {
    marginTop: 6,
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: "600",
  },
});
