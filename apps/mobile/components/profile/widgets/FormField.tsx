import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "@/constants/theme";

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  maxLength?: number;
};

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  maxLength,
}: FormFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        maxLength={maxLength}
        editable={editable}
        style={[styles.input, !editable && styles.inputReadonly]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputReadonly: {
    backgroundColor: colors.borderLight,
    color: colors.textTertiary,
  },
});
