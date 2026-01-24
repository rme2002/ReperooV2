import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useCurrencyFormatter } from "@/components/profile/useCurrencyFormatter";
import { alpha, colors, palette } from "@/constants/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    savings_goal: number | null;
    investment_goal: number | null;
  }) => Promise<void>;
  isSaving?: boolean;
};

export function CreateMonthlyPlanModal({ visible, onClose, onSubmit, isSaving = false }: Props) {
  const [savingsGoal, setSavingsGoal] = useState(0);
  const [investmentsGoal, setInvestmentsGoal] = useState(0);
  const { formatCurrency, currencySymbol } = useCurrencyFormatter();

  const handleSubmit = async () => {
    try {
      await onSubmit({
        savings_goal: savingsGoal > 0 ? savingsGoal : null,
        investment_goal: investmentsGoal > 0 ? investmentsGoal : null,
      });
      handleClose();
    } catch (err) {
      console.error("Failed to create plan:", err);
    }
  };

  const handleClose = () => {
    setSavingsGoal(0);
    setInvestmentsGoal(0);
    onClose();
  };

  const sliderMax = 10000;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Monthly Plan</Text>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeIcon}>×</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
              <Text style={styles.sectionTitle}>Monthly Goals</Text>
              <Text style={styles.sectionDescription}>
                Set savings and investment targets. You can adjust these anytime.
              </Text>

              <GoalSlider
                label="Savings goal"
                value={savingsGoal}
                max={sliderMax}
                onChange={setSavingsGoal}
                currencySymbol={currencySymbol}
                formatValue={(value) => `${formatCurrency(value)} / month`}
              />

              <GoalSlider
                label="Investments goal"
                value={investmentsGoal}
                max={sliderMax}
                onChange={setInvestmentsGoal}
                currencySymbol={currencySymbol}
                formatValue={(value) => `${formatCurrency(value)} / month`}
              />

              <View style={styles.infoBox}>
                <Text style={styles.infoIcon}>💡</Text>
                <Text style={styles.infoText}>
                  Recurring income and income transactions will automatically show up in your monthly plan widget
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSaving}
            >
              <Text style={styles.submitButtonText}>
                {isSaving ? "Creating..." : "Create Plan"}
              </Text>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type GoalSliderProps = {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
  currencySymbol: string;
  formatValue: (value: number) => string;
};

const SLIDER_STEP = 10;
const LINEAR_MAX = 200;
const LINEAR_PORTION = 0.5;

const formatNumber = (value: number) => value.toLocaleString("en-US");

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const snapGoalValue = (value: number, maxValue: number) =>
  clamp(Math.round(value / SLIDER_STEP) * SLIDER_STEP, 0, maxValue);

function valueFromPercent(percent: number, maxValue: number) {
  const pct = clamp(percent, 0, 1);
  if (pct <= LINEAR_PORTION) {
    return (pct / LINEAR_PORTION) * LINEAR_MAX;
  }
  const t = (pct - LINEAR_PORTION) / (1 - LINEAR_PORTION);
  return LINEAR_MAX + (maxValue - LINEAR_MAX) * t * t;
}

function percentFromValue(value: number, maxValue: number) {
  const clamped = clamp(value, 0, maxValue);
  if (clamped <= LINEAR_MAX) {
    return (clamped / LINEAR_MAX) * LINEAR_PORTION;
  }
  const t = Math.sqrt((clamped - LINEAR_MAX) / (maxValue - LINEAR_MAX));
  return LINEAR_PORTION + t * (1 - LINEAR_PORTION);
}

function GoalSlider({ label, value, max, onChange, currencySymbol, formatValue }: GoalSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [inputValue, setInputValue] = useState(formatNumber(value));
  const maxValue = Math.max(max, LINEAR_MAX, 1);
  const percent = percentFromValue(value, maxValue);

  useEffect(() => {
    setInputValue(formatNumber(value));
  }, [value]);

  const updateFromLocation = useCallback(
    (locationX: number, shouldSnap = false) => {
      if (!trackWidth) {
        return;
      }
      const pct = Math.min(Math.max(locationX / trackWidth, 0), 1);
      const rawValue = valueFromPercent(pct, maxValue);
      const nextValue = shouldSnap ? snapGoalValue(rawValue, maxValue) : clamp(rawValue, 0, maxValue);
      onChange(nextValue);
    },
    [trackWidth, maxValue, onChange],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => updateFromLocation(event.nativeEvent.locationX),
        onPanResponderMove: (event) => updateFromLocation(event.nativeEvent.locationX),
        onPanResponderRelease: (event) => updateFromLocation(event.nativeEvent.locationX, true),
        onPanResponderTerminate: (event) => updateFromLocation(event.nativeEvent.locationX, true),
      }),
    [updateFromLocation],
  );

  return (
    <View style={styles.goalSlider}>
      <View style={styles.goalSliderHeader}>
        <Text style={styles.goalSliderLabel}>{label}</Text>
        <Text style={styles.goalSliderValue}>{formatValue(value)}</Text>
      </View>
      <View style={styles.goalSliderInputRow}>
        <Text style={styles.goalSliderInputPrefix}>{currencySymbol}</Text>
        <TextInput
          value={inputValue}
          onChangeText={(text) => {
            const digitsOnly = text.replace(/[^\d]/g, "");
            if (!digitsOnly) {
              setInputValue("");
              onChange(0);
              return;
            }
            const numericValue = clamp(Number(digitsOnly), 0, maxValue);
            onChange(numericValue);
            setInputValue(formatNumber(numericValue));
          }}
          onBlur={() => {
            if (!inputValue) {
              setInputValue(formatNumber(0));
            }
          }}
          keyboardType="number-pad"
          style={styles.goalSliderInput}
          placeholder="0"
          placeholderTextColor={palette.gray400}
        />
      </View>
      <View
        style={styles.goalSliderTrack}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={[styles.goalSliderFill, { width: `${percent * 100}%` }]} />
        <View style={[styles.goalSliderThumb, { left: `${percent * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: alpha.ink50,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingTop: 20,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.borderLight,
  },
  closeIcon: {
    fontSize: 28,
    color: colors.textSecondary,
    marginTop: -2,
  },
  scrollView: {
    maxHeight: 500,
  },
  form: {
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginTop: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-end",
    marginTop: 12,
  },
  fieldColumn: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    color: palette.gray700,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: palette.slate220,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: palette.gray900,
    backgroundColor: palette.white,
  },
  inputDisabled: {
    backgroundColor: palette.slate180,
    color: palette.gray400,
  },
  toggle: {
    borderWidth: 1,
    borderColor: palette.slate220,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.white,
  },
  toggleActive: {
    backgroundColor: palette.gray900,
    borderColor: palette.gray900,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.gray700,
  },
  toggleLabelActive: {
    color: palette.white,
  },
  divider: {
    height: 1,
    backgroundColor: palette.sand200,
    marginVertical: 8,
  },
  goalSlider: {
    gap: 10,
    marginTop: 12,
  },
  goalSliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  goalSliderLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.gray900,
  },
  goalSliderValue: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.gray900,
  },
  goalSliderInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  goalSliderInputPrefix: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.gray900,
  },
  goalSliderInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.slate220,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: palette.gray900,
    backgroundColor: palette.white,
  },
  goalSliderTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: palette.sand200,
    position: "relative",
    overflow: "hidden",
  },
  goalSliderFill: {
    height: "100%",
    backgroundColor: palette.gray900,
  },
  goalSliderThumb: {
    position: "absolute",
    top: "50%",
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: palette.white,
    borderWidth: 2,
    borderColor: palette.gray900,
    transform: [{ translateX: -11 }, { translateY: -11 }],
  },
  infoBox: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: palette.blue150,
    borderWidth: 1,
    borderColor: palette.blue250,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: palette.blue800,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: palette.sand200,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.textLight,
    fontWeight: "700",
    fontSize: 16,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 16,
  },
});
