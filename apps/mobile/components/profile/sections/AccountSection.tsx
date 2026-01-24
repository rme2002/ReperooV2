import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import { FormField } from "../widgets/FormField";

type AccountSectionProps = {
  name: string;
  email: string | undefined;
  onChangeName: (name: string) => void;
  hasChanges: boolean;
  onSave: () => void;
  saving: boolean;
  errorMessage: string | null;
};

export function AccountSection({
  name,
  email,
  onChangeName,
  hasChanges,
  onSave,
  saving,
  errorMessage,
}: AccountSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      <View style={styles.card}>
        <FormField
          label="Name"
          value={name}
          onChangeText={onChangeName}
          placeholder="Add your name"
          maxLength={50}
        />
        <FormField label="Email" value={email ?? ""} editable={false} />
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {hasChanges ? (
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              (pressed || saving) && styles.saveButtonPressed,
            ]}
            onPress={onSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? "Saving…" : "Save changes"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 1,
    color: colors.textTertiary,
    fontWeight: "700",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
  },
  saveButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  saveButtonPressed: {
    opacity: 0.9,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textLight,
  },
});
