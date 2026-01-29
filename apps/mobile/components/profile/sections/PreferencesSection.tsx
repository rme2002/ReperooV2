import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import { PreferenceRow } from "../widgets/PreferenceRow";

type PreferencesSectionProps = {
  currencyLabel: string;
  onCurrencyPress: () => void;
  decimalSeparatorLabel: string;
  onDecimalSeparatorPress: () => void;
};

export function PreferencesSection({
  currencyLabel,
  onCurrencyPress,
  decimalSeparatorLabel,
  onDecimalSeparatorPress,
}: PreferencesSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>PREFERENCES</Text>
      <View style={styles.card}>
        <PreferenceRow
          label="Currency"
          value={currencyLabel}
          onPress={onCurrencyPress}
        />
        <PreferenceRow
          label="Decimal separator"
          value={decimalSeparatorLabel}
          onPress={onDecimalSeparatorPress}
        />
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
});
