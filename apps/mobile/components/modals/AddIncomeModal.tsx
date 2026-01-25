import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  ToastAndroid,
  UIManager,
  View,
} from "react-native";

import { incomeTypeOptions, type IncomeEvent } from "@/components/budget/types";
import { useCurrencyFormatter } from "@/components/profile/useCurrencyFormatter";
import {
  createIncomeTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/lib/gen/transactions/transactions";
import { createRecurringIncomeTemplate } from "@/lib/gen/recurring-templates/recurring-templates";
import { useSupabaseAuthSync } from "@/hooks/useSupabaseAuthSync";
import { alpha, colors, palette } from "@/constants/theme";

type Props = {
  visible: boolean;
  monthKey: string;
  currentDate: string;
  onClose: () => void;
  mode?: "add" | "edit" | "view";
  initialIncome?: IncomeEvent | null;
  onEditRequest?: () => void;
  onSuccess?: (date: Date) => void | Promise<void>;
};

const MAX_NOTE_LENGTH = 120;

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const getMonthStart = (date: Date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getMonthDays = (monthStart: Date) => {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const startDay = new Date(year, month, 1);
  const endDay = new Date(year, month + 1, 0);
  const daysInMonth = endDay.getDate();
  const offset = startDay.getDay();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

const showToast = (message: string) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert(message);
  }
};

export function AddIncomeModal({
  visible,
  monthKey,
  currentDate,
  onClose,
  mode = "add",
  initialIncome,
  onEditRequest,
  onSuccess,
}: Props) {
  const { session } = useSupabaseAuthSync();
  const [savingIncome, setSavingIncome] = useState(false);

  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);
  const today = useMemo(() => {
    const parsed = new Date(currentDate);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }, [currentDate]);
  const [amountText, setAmountText] = useState(
    initialIncome ? String(initialIncome.amount) : "",
  );
  const [type, setType] = useState(initialIncome?.type ?? null);
  const [note, setNote] = useState(initialIncome?.note ?? "");
  const defaultDate = useMemo(() => {
    if (initialIncome) {
      const existing = new Date(initialIncome.date);
      existing.setHours(0, 0, 0, 0);
      return existing;
    }
    return today;
  }, [initialIncome, today]);
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate);
  const [monthCursor, setMonthCursor] = useState<Date>(
    getMonthStart(defaultDate),
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const [isRecurring, setIsRecurring] = useState(
    Boolean(initialIncome?.isRecurring),
  );
  const [recurringDayOfMonth, setRecurringDayOfMonth] = useState<number>(
    initialIncome?.recurringDayOfMonth ?? defaultDate.getDate(),
  );
  const [recurringDayDirty, setRecurringDayDirty] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<
    "monthly" | "weekly" | "biweekly"
  >("monthly");
  const isViewMode = mode === "view";
  const { currencySymbol } = useCurrencyFormatter();

  const dayOfWeekNames = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const recurringDayOfWeek = useMemo(() => {
    const day = selectedDate.getDay();
    return day === 0 ? 6 : day - 1;
  }, [selectedDate]);

  const amountValue = useMemo(() => {
    const cleaned = amountText.replace(/,/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [amountText]);

  const isAmountValid = amountValue > 0;
  const isTypeValid = Boolean(type);
  const isFormValid = isAmountValid && isTypeValid;

  const monthDays = useMemo(() => getMonthDays(monthCursor), [monthCursor]);

  const clearState = useCallback(() => {
    setAmountText("");
    setType(null);
    setNote("");
    setSelectedDate(today);
    setMonthCursor(getMonthStart(today));
    setShowCalendar(false);
    setIsRecurring(false);
    setRecurringDayOfMonth(today.getDate());
    setRecurringDayDirty(false);
    setRecurringFrequency("monthly");
  }, [today]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if ((mode === "edit" || mode === "view") && initialIncome) {
      setAmountText(String(initialIncome.amount));
      setType(initialIncome.type);
      setNote(initialIncome.note ?? "");
      const existing = new Date(initialIncome.date);
      existing.setHours(0, 0, 0, 0);
      setSelectedDate(existing);
      setMonthCursor(getMonthStart(existing));
      setShowCalendar(false);
      setIsRecurring(Boolean(initialIncome.isRecurring));
      setRecurringDayOfMonth(
        initialIncome.recurringDayOfMonth ?? existing.getDate(),
      );
      setRecurringDayDirty(false);
    } else if (mode === "add") {
      clearState();
    }
  }, [visible, initialIncome, mode, clearState]);

  const handleClose = useCallback(() => {
    clearState();
    onClose();
  }, [clearState, onClose]);

  useEffect(() => {
    if (!isRecurring || recurringDayDirty) {
      return;
    }
    setRecurringDayOfMonth(selectedDate.getDate());
  }, [isRecurring, recurringDayDirty, selectedDate]);

  const handleSubmit = async () => {
    if (isViewMode) {
      return;
    }
    if (!isFormValid || !type) {
      return;
    }

    setSavingIncome(true);

    try {
      if (mode === "edit" && initialIncome) {
        // Update existing transaction
        const response = await updateTransaction(initialIncome.id, {
          type: "income",
          occurred_at: selectedDate.toISOString(),
          amount: amountValue,
          notes: note.trim() || null,
          income_category_id: type,
        });

        if (response.status === 200) {
          showToast("Income updated successfully!");
          await onSuccess?.(selectedDate);
        } else {
          Alert.alert("Error", "Failed to update income transaction");
        }
      } else if (mode === "add" && session?.user?.id) {
        // Create income transaction via API
        if (isRecurring) {
          // Create recurring template
          const response = await createRecurringIncomeTemplate({
            amount: amountValue,
            notes: note.trim() || null,
            type: "income",
            income_category_id: type,
            frequency: recurringFrequency,
            day_of_week:
              recurringFrequency !== "monthly" ? recurringDayOfWeek : null,
            day_of_month:
              recurringFrequency === "monthly" ? recurringDayOfMonth : null,
            start_date: selectedDate.toISOString(),
            end_date: null,
            total_occurrences: null,
          });

          if (response.status === 201) {
            showToast("Recurring income template created!");
            await onSuccess?.(selectedDate);
          } else {
            Alert.alert("Error", "Failed to create recurring income template");
          }
        } else {
          // Create one-time transaction
          const response = await createIncomeTransaction({
            user_id: session.user.id,
            occurred_at: selectedDate.toISOString(),
            amount: amountValue,
            notes: note.trim() || null,
            type: "income",
            income_category_id: type,
          });

          if (response.status === 201) {
            showToast("Income created successfully!");
            await onSuccess?.(selectedDate);
          } else {
            Alert.alert("Error", "Failed to create income transaction");
          }
        }
      }
    } catch (error) {
      console.error("Error saving income:", error);
      Alert.alert(
        "Error",
        mode === "edit"
          ? "Failed to update income transaction"
          : "Failed to create income transaction",
      );
    } finally {
      setSavingIncome(false);
    }

    handleClose();
  };

  const handleDelete = async () => {
    if (!initialIncome) return;
    Alert.alert("Delete income", "Remove this income entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const response = await deleteTransaction(initialIncome.id);
            if (response.status === 204) {
              showToast("Income deleted");
              await onSuccess?.(new Date(initialIncome.date));
              handleClose();
            } else {
              Alert.alert("Error", "Failed to delete income transaction");
            }
          } catch (error) {
            console.error("Error deleting income:", error);
            Alert.alert("Error", "Failed to delete income transaction");
          }
        },
      },
    ]);
  };

  const goPrevMonth = () => {
    const prev = new Date(monthCursor);
    prev.setMonth(prev.getMonth() - 1);
    setMonthCursor(getMonthStart(prev));
  };

  const goNextMonth = () => {
    const next = new Date(monthCursor);
    next.setMonth(next.getMonth() + 1);
    setMonthCursor(getMonthStart(next));
  };

  const handleSelectDate = (day: Date) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const normalized = new Date(day);
    normalized.setHours(0, 0, 0, 0);
    setSelectedDate(normalized);
    setShowCalendar(false);
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close income form"
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.title}>
              {mode === "edit"
                ? "Edit income"
                : mode === "view"
                  ? "Income overview"
                  : "Add income"}
            </Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Text style={styles.close}>×</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.surface}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Income type *</Text>
                {!isViewMode && type ? (
                  <Pressable onPress={() => setType(null)} hitSlop={8}>
                    <Text style={styles.clearAction}>Clear</Text>
                  </Pressable>
                ) : null}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.typeRow}
              >
                {incomeTypeOptions.map((option) => {
                  const isActive = option.value === type;
                  const dimmed = Boolean(type && !isActive);
                  return (
                    <Pressable
                      key={option.value}
                      disabled={isViewMode}
                      onPress={() => {
                        if (isViewMode) {
                          return;
                        }
                        setType(option.value);
                      }}
                      style={[
                        styles.typeChip,
                        isActive && styles.typeChipActive,
                        dimmed && styles.typeChipDimmed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeChipLabel,
                          isActive && styles.typeChipLabelActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.surface}>
              <Text style={styles.sectionTitle}>Amount *</Text>
              <View
                style={[
                  styles.amountField,
                  !isAmountValid &&
                    amountText.length > 0 &&
                    styles.amountFieldError,
                ]}
              >
                <Text style={styles.currency}>{currencySymbol}</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amountText}
                  onChangeText={setAmountText}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={palette.slate280}
                  maxLength={10}
                  editable={!isViewMode}
                  selectTextOnFocus={!isViewMode}
                />
              </View>
              {!isAmountValid && amountText.length > 0 ? (
                <Text style={styles.helperText}>
                  Enter an amount greater than zero.
                </Text>
              ) : null}
            </View>

            <View style={styles.surface}>
              <Text style={styles.sectionTitle}>Note (optional)</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Pay period, client, or reminder"
                placeholderTextColor={palette.slate280}
                value={note}
                onChangeText={setNote}
                maxLength={MAX_NOTE_LENGTH}
                editable={!isViewMode}
                selectTextOnFocus={!isViewMode}
              />
            </View>

            <View style={styles.surface}>
              <Text style={styles.sectionTitle}>Date received *</Text>
              <View style={styles.dateRow}>
                <Pressable
                  disabled={isViewMode}
                  onPress={() => {
                    setSelectedDate(today);
                    setMonthCursor(getMonthStart(today));
                    setShowCalendar(false);
                  }}
                  style={[
                    styles.dateChip,
                    selectedDate.getTime() === today.getTime() &&
                      styles.dateChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dateText,
                      selectedDate.getTime() === today.getTime() &&
                        styles.dateTextSelected,
                    ]}
                  >
                    Today
                  </Text>
                </Pressable>
                <Pressable
                  disabled={isViewMode}
                  onPress={() => setShowCalendar(true)}
                  style={[
                    styles.dateChip,
                    styles.calendarChip,
                    selectedDate.getTime() !== today.getTime() &&
                      styles.dateChipSelected,
                  ]}
                >
                  <Text style={styles.calendarIcon}>📅</Text>
                  <Text
                    style={[
                      styles.dateText,
                      selectedDate.getTime() !== today.getTime() &&
                        styles.dateTextSelected,
                    ]}
                  >
                    {formatDate(selectedDate)}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.recurringSurface}>
              <View style={styles.recurringHeader}>
                <Text style={styles.sectionTitle}>Recurring income</Text>
                <Switch
                  value={isRecurring}
                  disabled={isViewMode}
                  onValueChange={(value) => {
                    setIsRecurring(value);
                    if (value) {
                      setRecurringDayOfMonth(selectedDate.getDate());
                      setRecurringDayDirty(false);
                    }
                  }}
                  trackColor={{
                    false: palette.slate260,
                    true: palette.slate900,
                  }}
                  thumbColor={palette.white}
                />
              </View>
              {isRecurring ? (
                <View style={styles.frequencyContainer}>
                  <Text style={styles.recurringSubtitle}>Frequency</Text>
                  <View style={styles.frequencyPicker}>
                    <Pressable
                      disabled={isViewMode}
                      onPress={() => setRecurringFrequency("monthly")}
                      style={[
                        styles.frequencyButton,
                        recurringFrequency === "monthly" &&
                          styles.frequencyButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.frequencyButtonText,
                          recurringFrequency === "monthly" &&
                            styles.frequencyButtonTextActive,
                        ]}
                      >
                        Monthly
                      </Text>
                    </Pressable>
                    <Pressable
                      disabled={isViewMode}
                      onPress={() => setRecurringFrequency("weekly")}
                      style={[
                        styles.frequencyButton,
                        recurringFrequency === "weekly" &&
                          styles.frequencyButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.frequencyButtonText,
                          recurringFrequency === "weekly" &&
                            styles.frequencyButtonTextActive,
                        ]}
                      >
                        Weekly
                      </Text>
                    </Pressable>
                    <Pressable
                      disabled={isViewMode}
                      onPress={() => setRecurringFrequency("biweekly")}
                      style={[
                        styles.frequencyButton,
                        recurringFrequency === "biweekly" &&
                          styles.frequencyButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.frequencyButtonText,
                          recurringFrequency === "biweekly" &&
                            styles.frequencyButtonTextActive,
                        ]}
                      >
                        Biweekly
                      </Text>
                    </Pressable>
                  </View>

                  {recurringFrequency === "monthly" ? (
                    <View style={styles.recurringDayBlock}>
                      <Text style={styles.recurringSubtitle}>Day of month</Text>
                      <View style={styles.recurringDayControls}>
                        <Pressable
                          disabled={isViewMode || recurringDayOfMonth <= 1}
                          style={[
                            styles.dayButton,
                            (isViewMode || recurringDayOfMonth <= 1) &&
                              styles.dayButtonDisabled,
                          ]}
                          onPress={() => {
                            setRecurringDayOfMonth((current) =>
                              Math.max(1, current - 1),
                            );
                            setRecurringDayDirty(true);
                          }}
                        >
                          <Text style={styles.dayButtonText}>−</Text>
                        </Pressable>
                        <Text style={styles.dayValue}>
                          Day {recurringDayOfMonth}
                        </Text>
                        <Pressable
                          disabled={isViewMode || recurringDayOfMonth >= 31}
                          style={[
                            styles.dayButton,
                            (isViewMode || recurringDayOfMonth >= 31) &&
                              styles.dayButtonDisabled,
                          ]}
                          onPress={() => {
                            setRecurringDayOfMonth((current) =>
                              Math.min(31, current + 1),
                            );
                            setRecurringDayDirty(true);
                          }}
                        >
                          <Text style={styles.dayButtonText}>+</Text>
                        </Pressable>
                      </View>
                      <Text style={styles.recurringHelper}>
                        This income will repeat on the {recurringDayOfMonth}
                        {recurringDayOfMonth === 1
                          ? "st"
                          : recurringDayOfMonth === 2
                            ? "nd"
                            : recurringDayOfMonth === 3
                              ? "rd"
                              : "th"}{" "}
                        of every month
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.recurringDayBlock}>
                      <Text style={styles.recurringSubtitle}>Day of week</Text>
                      <Text style={styles.dayValue}>
                        {dayOfWeekNames[recurringDayOfWeek]}
                      </Text>
                      <Text style={styles.recurringHelper}>
                        This income will repeat every{" "}
                        {recurringFrequency === "weekly" ? "week" : "two weeks"}{" "}
                        on {dayOfWeekNames[recurringDayOfWeek]}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.recurringCopy}>
                  Enable to make this a recurring income.
                </Text>
              )}
            </View>
          </ScrollView>

          {mode === "edit" && initialIncome ? (
            <Pressable style={styles.deleteLink} onPress={handleDelete}>
              <Text style={styles.deleteLinkText}>Delete income</Text>
            </Pressable>
          ) : null}

          {mode === "view" ? (
            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                !onEditRequest && styles.saveButtonDisabled,
                pressed && onEditRequest && styles.saveButtonPressed,
              ]}
              disabled={!onEditRequest}
              onPress={() => onEditRequest?.()}
            >
              <Text style={styles.saveText}>Edit income</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                (!isFormValid || savingIncome) && styles.saveButtonDisabled,
                pressed &&
                  isFormValid &&
                  !savingIncome &&
                  styles.saveButtonPressed,
              ]}
              disabled={!isFormValid || savingIncome}
              onPress={handleSubmit}
            >
              <Text style={styles.saveText}>
                {savingIncome
                  ? "Saving..."
                  : mode === "edit"
                    ? "Save changes"
                    : "Save income"}
              </Text>
            </Pressable>
          )}
        </View>
        {!isViewMode && showCalendar ? (
          <Pressable
            style={styles.calendarOverlay}
            onPress={() => setShowCalendar(false)}
          >
            <Pressable
              style={styles.calendarModal}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.calendarHeader}>
                <Pressable onPress={goPrevMonth} style={styles.calendarNav}>
                  <Text style={styles.calendarNavText}>‹</Text>
                </Pressable>
                <Text style={styles.calendarTitle}>
                  {monthCursor.toLocaleDateString("en-GB", {
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
                <Pressable onPress={goNextMonth} style={styles.calendarNav}>
                  <Text style={styles.calendarNavText}>›</Text>
                </Pressable>
              </View>
              <View style={styles.calendarGrid}>
                {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
                  <Text key={`${day}-${idx}`} style={styles.calendarDow}>
                    {day}
                  </Text>
                ))}
                {monthDays.map((day, index) => {
                  if (!day) {
                    return (
                      <View
                        key={`empty-${index}`}
                        style={styles.calendarCell}
                      />
                    );
                  }
                  const isSelected = day.getTime() === selectedDate.getTime();
                  return (
                    <Pressable
                      key={day.toISOString()}
                      onPress={() => handleSelectDate(day)}
                      style={[
                        styles.calendarCell,
                        isSelected && styles.calendarCellSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDateText,
                          isSelected && styles.calendarDateTextSelected,
                        ]}
                      >
                        {day.getDate()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Pressable>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: alpha.black35,
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
    width: "100%",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 18,
    gap: 16,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
    maxHeight: "88%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  close: {
    fontSize: 24,
    color: colors.text,
  },
  body: {
    gap: 12,
    paddingBottom: 6,
  },
  surface: {
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clearAction: {
    fontSize: 12,
    fontWeight: "700",
    color: palette.slate600,
  },
  helperText: {
    fontSize: 12,
    color: palette.gray500,
  },
  recurringSurface: {
    marginTop: 8,
    backgroundColor: palette.slate190,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.slate230,
    padding: 14,
    gap: 10,
  },
  recurringHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recurringCopy: {
    fontSize: 13,
    color: palette.slate600,
  },
  recurringDayBlock: {
    gap: 8,
  },
  recurringSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.gray900,
  },
  recurringDayControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },
  dayButtonDisabled: {
    opacity: 0.3,
  },
  dayButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  dayValue: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.slate900,
  },
  typeRow: {
    gap: 10,
    paddingRight: 8,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  typeChipDimmed: {
    opacity: 0.6,
  },
  typeChipLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "700",
  },
  typeChipLabelActive: {
    color: colors.textLight,
  },
  amountField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.sand200,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  amountFieldError: {
    borderColor: palette.red300,
  },
  currency: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.gray500,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "800",
    color: palette.gray900,
  },
  noteInput: {
    backgroundColor: palette.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.sand200,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: palette.gray900,
  },
  dateRow: {
    flexDirection: "row",
    gap: 10,
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  dateText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
  },
  dateTextSelected: {
    color: colors.textLight,
  },
  calendarChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  calendarIcon: {
    fontSize: 16,
  },
  calendarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: alpha.black35,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  calendarModal: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.sand200,
    shadowColor: palette.slate900,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 8,
    gap: 10,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: palette.gray900,
  },
  calendarNav: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarNavDisabled: {
    backgroundColor: colors.borderLight,
  },
  calendarNavText: {
    fontSize: 16,
    color: colors.text,
  },
  calendarNavTextDisabled: {
    color: colors.textTertiary,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },
  calendarDow: {
    width: `${100 / 7}%`,
    textAlign: "center",
    paddingVertical: 6,
    fontSize: 12,
    color: palette.gray500,
    fontWeight: "700",
  },
  calendarCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    display: "flex",
  },
  calendarCellSelected: {
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  calendarCellDisabled: {
    opacity: 0.4,
  },
  calendarDateText: {
    fontSize: 15,
    color: palette.gray900,
    fontWeight: "700",
  },
  calendarDateTextSelected: {
    color: colors.textLight,
  },
  calendarDateTextDisabled: {
    color: palette.gray400,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  saveButtonPressed: {
    opacity: 0.92,
  },
  saveButtonDisabled: {
    backgroundColor: colors.borderLight,
    borderColor: colors.borderLight,
  },
  saveText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textLight,
  },
  deleteLink: {
    alignItems: "flex-start",
    paddingHorizontal: 4,
  },
  deleteLinkText: {
    color: palette.red700,
    fontSize: 13,
    fontWeight: "600",
  },
  frequencyContainer: {
    gap: 8,
  },
  frequencyPicker: {
    flexDirection: "row",
    gap: 8,
  },
  frequencyButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  frequencyButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  frequencyButtonTextActive: {
    color: colors.textLight,
  },
  recurringHelper: {
    fontSize: 12,
    color: palette.gray500,
  },
});
