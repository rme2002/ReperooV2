import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { alpha, colors } from "@/constants/theme";
import {
  formatDecimalExample,
  type DecimalSeparator,
  type DecimalSeparatorPreference,
} from "@/utils/decimalSeparator";

type DecimalSeparatorPickerModalProps = {
  visible: boolean;
  selected: DecimalSeparatorPreference;
  localeSeparator: DecimalSeparator;
  onSelect: (preference: DecimalSeparatorPreference) => void;
  onClose: () => void;
};

const OPTION_STYLES = {
  title: "Choose decimal separator",
};

export function DecimalSeparatorPickerModal({
  visible,
  selected,
  localeSeparator,
  onSelect,
  onClose,
}: DecimalSeparatorPickerModalProps) {
  const options: {
    value: DecimalSeparatorPreference;
    label: string;
    helper: string;
  }[] = [
    {
      value: "auto",
      label: "Phone default",
      helper: `Example: ${formatDecimalExample(localeSeparator)}`,
    },
    {
      value: ".",
      label: "Dot (.)",
      helper: "Example: 1.23",
    },
    {
      value: ",",
      label: "Comma (,)",
      helper: "Example: 1,23",
    },
  ];

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.pickerOverlay}>
        <Pressable style={styles.pickerBackdrop} onPress={onClose} />
        <View style={styles.pickerSheet}>
          <Text style={styles.pickerTitle}>{OPTION_STYLES.title}</Text>
          {options.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.pickerRow,
                selected === option.value && styles.pickerRowActive,
              ]}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
            >
              <View>
                <Text style={styles.pickerRowLabel}>{option.label}</Text>
                <Text style={styles.pickerRowHelper}>{option.helper}</Text>
              </View>
              <View style={styles.pickerRowValue}>
                <Text style={styles.pickerRowValueText}>
                  {formatDecimalExample(
                    option.value === "auto" ? localeSeparator : option.value,
                  )}
                </Text>
              </View>
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
  pickerRowHelper: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pickerRowValue: {
    minWidth: 48,
    alignItems: "flex-end",
  },
  pickerRowValueText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
});
