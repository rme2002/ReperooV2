import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { alpha, colors } from "@/constants/theme";
import {
  CURRENCY_OPTIONS,
  type CurrencyCode,
} from "@/components/profile/UserPreferencesProvider";

type CurrencyPickerModalProps = {
  visible: boolean;
  selected: CurrencyCode;
  onSelect: (code: CurrencyCode) => void;
  onClose: () => void;
};

export function CurrencyPickerModal({
  visible,
  selected,
  onSelect,
  onClose,
}: CurrencyPickerModalProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <Pressable style={styles.pickerBackdrop} onPress={onClose} />
        <View style={styles.pickerSheet}>
          <Text style={styles.pickerTitle}>Choose currency</Text>
          {CURRENCY_OPTIONS.map((option) => (
            <Pressable
              key={option.code}
              style={[
                styles.pickerRow,
                selected === option.code && styles.pickerRowActive,
              ]}
              onPress={() => {
                onSelect(option.code);
                onClose();
              }}
            >
              <View>
                <Text style={styles.pickerRowLabel}>{option.label}</Text>
                <Text style={styles.pickerRowCode}>{option.code}</Text>
              </View>
              <Text style={styles.pickerRowSymbol}>{option.symbol}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pickerOverlay: {
    flex: 1,
    backgroundColor: alpha.ink35,
    justifyContent: "flex-end",
    padding: 20,
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  pickerSheet: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 20,
    gap: 8,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  pickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  pickerRowActive: {
    backgroundColor: "rgba(31, 138, 91, 0.12)",
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  pickerRowLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  pickerRowCode: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pickerRowSymbol: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
});
