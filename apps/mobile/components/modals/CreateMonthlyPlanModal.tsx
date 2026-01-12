import { useCallback, useMemo, useState } from "react";
import {
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useCurrencyFormatter } from "@/components/profile/useCurrencyFormatter";

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
  const { formatCurrency } = useCurrencyFormatter();

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

  const sliderMax = 10000; // Default max for sliders when no expected income yet

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
                formatValue={(value) => `${formatCurrency(value)} / month`}
              />

              <GoalSlider
                label="Investments goal"
                value={investmentsGoal}
                max={sliderMax}
                onChange={setInvestmentsGoal}
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
  formatValue: (value: number) => string;
};

function GoalSlider({ label, value, max, onChange, formatValue }: GoalSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const normalizedMax = Math.max(max, 1);
  const percent = normalizedMax > 0 ? Math.min(Math.max(value / normalizedMax, 0), 1) : 0;

  const updateFromLocation = useCallback(
    (locationX: number) => {
      if (!trackWidth) {
        return;
      }
      const pct = Math.min(Math.max(locationX / trackWidth, 0), 1);
      const nextValue = Math.round(pct * normalizedMax);
      onChange(nextValue);
    },
    [trackWidth, normalizedMax, onChange],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => updateFromLocation(event.nativeEvent.locationX),
        onPanResponderMove: (event) => updateFromLocation(event.nativeEvent.locationX),
        onPanResponderRelease: (event) => updateFromLocation(event.nativeEvent.locationX),
        onPanResponderTerminate: (event) => updateFromLocation(event.nativeEvent.locationX),
      }),
    [updateFromLocation],
  );

  return (
    <View style={styles.goalSlider}>
      <View style={styles.goalSliderHeader}>
        <Text style={styles.goalSliderLabel}>{label}</Text>
        <Text style={styles.goalSliderValue}>{formatValue(value)}</Text>
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
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingTop: 20,
    shadowColor: "#0f172a",
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
    borderBottomColor: "#ede7dc",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  closeIcon: {
    fontSize: 28,
    color: "#6b7280",
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
    color: "#111827",
    marginTop: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: "#6b7280",
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
    color: "#374151",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#fff",
  },
  inputDisabled: {
    backgroundColor: "#f9fafb",
    color: "#9ca3af",
  },
  toggle: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  toggleActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  toggleLabelActive: {
    color: "#fff",
  },
  divider: {
    height: 1,
    backgroundColor: "#ede7dc",
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
    color: "#111827",
  },
  goalSliderValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  goalSliderTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "#ede7dc",
    position: "relative",
    overflow: "hidden",
  },
  goalSliderFill: {
    height: "100%",
    backgroundColor: "#111827",
  },
  goalSliderThumb: {
    position: "absolute",
    top: "50%",
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#111827",
    transform: [{ translateX: -11 }, { translateY: -11 }],
  },
  infoBox: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
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
    color: "#1e40af",
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#ede7dc",
  },
  submitButton: {
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  cancelButtonText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 16,
  },
});
