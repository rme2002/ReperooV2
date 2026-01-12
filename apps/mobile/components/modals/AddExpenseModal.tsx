import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  LayoutAnimation,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Platform,
  UIManager,
} from "react-native";
import spendingCategories from "../../../../shared/config/spending-categories.json";
import { useCurrencyFormatter } from "@/components/profile/useCurrencyFormatter";
import { createExpenseTransaction } from "@/lib/gen/transactions/transactions";
import { createRecurringExpenseTemplate } from "@/lib/gen/recurring-templates/recurring-templates";
import { useSupabaseAuthSync } from "@/hooks/useSupabaseAuthSync";

type TransactionFormValues = {
  amount: number;
  categoryId: string;
  subcategoryId?: string | null;
  note?: string;
  date?: Date | string;
  isRecurring?: boolean;
  recurringDayOfMonth?: number | null;
  transactionTag?: "need" | "want";
};

type Props = {
  visible: boolean;
  onClose: () => void;
  mode?: "add" | "edit" | "view";
  initialValues?: TransactionFormValues | null;
  onSubmit?: (payload: {
    amount: number;
    categoryId: string;
    subcategoryId?: string | null;
    note: string;
    date: Date;
    recurring?: {
      dayOfMonth: number;
    };
  }) => void;
  onEditRequest?: () => void;
  isSaving?: boolean;
};

type SubCategoryOption = { id: string; label: string };
type CategoryOption = {
  id: string;
  label: string;
  icon: string;
  subcategories?: SubCategoryOption[];
};

type SpendingCategoriesConfig = {
  categories: CategoryOption[];
};

const categoryConfig: SpendingCategoriesConfig = spendingCategories;
const categories: CategoryOption[] = categoryConfig.categories;
const MAX_VISIBLE_SUBCATEGORIES = 6;

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

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
  const offset = startDay.getDay(); // 0-6

  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

export function AddExpenseModal({
  visible,
  onClose,
  mode = "add",
  initialValues,
  onSubmit,
  onEditRequest,
  isSaving = false,
}: Props) {
  const { session } = useSupabaseAuthSync();

  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [amountText, setAmountText] = useState("");
  const [note, setNote] = useState("");
  const [transactionTag, setTransactionTag] = useState<"need" | "want" | null>(null);
  const [saving, setSaving] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [monthCursor, setMonthCursor] = useState<Date>(getMonthStart(today));
  const [showCalendar, setShowCalendar] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<"monthly" | "weekly" | "biweekly">("monthly");
  const [recurringDayOfMonth, setRecurringDayOfMonth] = useState<number>(today.getDate());
  const [recurringDayDirty, setRecurringDayDirty] = useState(false);
  const { currencySymbol } = useCurrencyFormatter();
  const isViewMode = mode === "view";

  // Calculate day of week from selected date (0=Monday, 6=Sunday)
  const recurringDayOfWeek = useMemo(() => {
    const day = selectedDate.getDay(); // 0=Sunday, 6=Saturday
    return day === 0 ? 6 : day - 1; // Convert to 0=Monday, 6=Sunday
  }, [selectedDate]);

  const dayOfWeekNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const scrollRef = useRef<ScrollView>(null);
  const [categorySectionTop, setCategorySectionTop] = useState(0);

  const amountValue = useMemo(() => {
    const cleaned = amountText.replace(/,/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [amountText]);

  const isAmountValid = amountValue > 0;
  const currentCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategory) ?? null,
    [selectedCategory],
  );
  const subcategoryOptions = currentCategory?.subcategories ?? [];
  const isCategoryValid = Boolean(selectedCategory);
  const isTagValid = Boolean(transactionTag);
  const formValid = isAmountValid && isCategoryValid && isTagValid;
  const monthDays = useMemo(() => getMonthDays(monthCursor), [monthCursor]);

  const selectedSubcategoryData = subcategoryOptions.find((sub) => sub.id === selectedSubcategory);
  const isCurrentCategoryExpanded = selectedCategory ? Boolean(expandedCategories[selectedCategory]) : false;
  const visibleSubcategories =
    isCurrentCategoryExpanded || isViewMode
      ? subcategoryOptions
      : subcategoryOptions.slice(0, MAX_VISIBLE_SUBCATEGORIES);
  const hasHiddenSubcategories =
    !isViewMode && subcategoryOptions.length > MAX_VISIBLE_SUBCATEGORIES && !isCurrentCategoryExpanded;

  const animateLayout = () => {
    if (LayoutAnimation.configureNext) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  };

  const scrollToCategories = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: Math.max(categorySectionTop - 16, 0), animated: true });
    }
  };

  const handleSelectCategory = (categoryId: string) => {
    if (isViewMode) {
      return;
    }
    animateLayout();
    if (selectedCategory === categoryId) {
      scrollToCategories();
      return;
    }
    setSelectedCategory(categoryId);
    setSelectedSubcategory(null);
    scrollToCategories();
  };

  const handleSelectSubcategory = (subcategoryId: string) => {
    if (isViewMode) {
      return;
    }
    animateLayout();
    setSelectedSubcategory((current) => (current === subcategoryId ? null : subcategoryId));
  };

  const clearSelection = () => {
    if (isViewMode) {
      return;
    }
    animateLayout();
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setExpandedCategories({});
  };

  const clearSubcategory = () => {
    if (isViewMode) {
      return;
    }
    animateLayout();
    setSelectedSubcategory(null);
  };

  const revealAllSubcategories = (categoryId: string) => {
    if (isViewMode) {
      return;
    }
    setExpandedCategories((prev) => {
      if (prev[categoryId]) {
        return prev;
      }
      return { ...prev, [categoryId]: true };
    });
  };

  const resetForm = useCallback(() => {
    setSaving(false);
    setAmountText("");
    setNote("");
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setExpandedCategories({});
    setSelectedDate(today);
    setMonthCursor(getMonthStart(today));
    setShowCalendar(false);
    setIsRecurring(false);
    setRecurringFrequency("monthly");
    setRecurringDayOfMonth(today.getDate());
    setRecurringDayDirty(false);
    setTransactionTag(null);
  }, [today]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if ((mode === "edit" || mode === "view") && initialValues) {
      const parsedDate =
        initialValues.date instanceof Date
          ? new Date(initialValues.date)
          : initialValues.date
            ? new Date(initialValues.date)
            : new Date(today);
      parsedDate.setHours(0, 0, 0, 0);
      setSelectedCategory(initialValues.categoryId);
      setSelectedSubcategory(initialValues.subcategoryId ?? null);
      setExpandedCategories(
        initialValues.subcategoryId ? { [initialValues.categoryId]: true } : {},
      );
      setAmountText(
        initialValues.amount || initialValues.amount === 0 ? String(initialValues.amount) : "",
      );
      setNote(initialValues.note ?? "");
      setSelectedDate(parsedDate);
      setMonthCursor(getMonthStart(parsedDate));
      setShowCalendar(false);
      setIsRecurring(Boolean(initialValues.isRecurring));
      setRecurringDayOfMonth(initialValues.recurringDayOfMonth ?? parsedDate.getDate());
      setRecurringDayDirty(false);
      setTransactionTag(initialValues.transactionTag ?? null);
    } else if (mode === "add") {
      resetForm();
    }
  }, [visible, mode, initialValues, today, resetForm]);

  useEffect(() => {
    if (!isRecurring || recurringDayDirty) {
      return;
    }
    setRecurringDayOfMonth(selectedDate.getDate());
  }, [isRecurring, recurringDayDirty, selectedDate]);

  const handleSave = async () => {
    if (isViewMode) {
      return;
    }
    if (!isAmountValid) {
      Alert.alert("Missing info", "Add an amount greater than zero.");
      return;
    }
    if (!selectedCategory) {
      Alert.alert("Missing info", "Pick a category before saving.");
      return;
    }
    if (!transactionTag) {
      Alert.alert("Missing info", "Select whether this is a need or want.");
      return;
    }

    // Create expense transaction or recurring template via API
    if (mode === "add" && session?.user?.id) {
      setSaving(true);
      try {
        if (isRecurring) {
          // Create recurring template
          const payload = {
            amount: amountValue,
            type: "expense" as const,
            frequency: recurringFrequency,
            day_of_week: recurringFrequency !== "monthly" ? recurringDayOfWeek : null,
            day_of_month: recurringFrequency === "monthly" ? recurringDayOfMonth : null,
            start_date: selectedDate.toISOString(),
            end_date: null, // MVP: never ends
            total_occurrences: null, // MVP: never ends
            transaction_tag: transactionTag,
            expense_category_id: selectedCategory,
            expense_subcategory_id: selectedSubcategory || null,
            notes: note.trim() || null,
          };

          console.log("[AddExpenseModal] Creating recurring template:", JSON.stringify(payload, null, 2));
          const response = await createRecurringExpenseTemplate(payload);

          if (response.status === 201) {
            Alert.alert("Success", "Recurring expense template created!");
            resetForm();
            onClose();
          } else {
            console.error("[AddExpenseModal] Error response:", response);
            const errorMessage = (response.data as any)?.detail || "Failed to create recurring template";
            Alert.alert("Error", typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
          }
        } else {
          // Create one-time transaction
          const payload = {
            user_id: session.user.id,
            occurred_at: selectedDate.toISOString(),
            amount: amountValue,
            notes: note.trim() || null,
            type: "expense" as const,
            transaction_tag: transactionTag,
            expense_category_id: selectedCategory,
            expense_subcategory_id: selectedSubcategory || null,
          };

          console.log("[AddExpenseModal] Creating one-time expense:", JSON.stringify(payload, null, 2));
          const response = await createExpenseTransaction(payload);

          if (response.status === 201) {
            Alert.alert("Success", "Expense created successfully!");
            resetForm();
            onClose();
          } else {
            console.error("[AddExpenseModal] Error response:", response);
            const errorMessage = (response.data as any)?.detail || "Failed to create expense transaction";
            Alert.alert("Error", typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
          }
        }
      } catch (error) {
        console.error("[AddExpenseModal] Exception caught:", error);
        Alert.alert("Error", `Failed to create expense: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setSaving(false);
      }
      return;
    }

    // Handle edit mode (if onSubmit callback is provided)
    if (mode === "edit" && onSubmit) {
      setSaving(true);
      setTimeout(() => {
        const payload = {
          amount: amountValue,
          categoryId: selectedCategory,
          subcategoryId: selectedSubcategory,
          note: note.trim(),
          date: new Date(selectedDate),
          transactionTag,
          recurring: isRecurring
            ? {
                dayOfMonth: recurringDayOfMonth,
              }
            : undefined,
        };
        onSubmit(payload);
        resetForm();
        onClose();
      }, 300);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close expense form"
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.title}>
              {mode === "edit" ? "Edit expense" : mode === "view" ? "Transaction overview" : "Add expense"}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.close}>×</Text>
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
          >
            <View
              style={styles.surface}
              onLayout={(event) => setCategorySectionTop(event.nativeEvent.layout.y)}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Category</Text>
                {selectedCategory && !isViewMode ? (
                  <Pressable onPress={clearSelection} hitSlop={8}>
                    <Text style={styles.clearAction}>Clear</Text>
                  </Pressable>
                ) : null}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRow}
              >
                {categories.map((category) => {
                  const selected = selectedCategory === category.id;
                  const dimmed = Boolean(selectedCategory && selectedCategory !== category.id);
                  return (
                    <Pressable
                      key={category.id}
                      disabled={isViewMode}
                      onPress={() => handleSelectCategory(category.id)}
                      style={[
                        styles.categoryChip,
                        selected && styles.categoryChipSelected,
                        dimmed && styles.categoryChipDimmed,
                      ]}
                    >
                      <Text style={styles.categoryIcon}>{category.icon}</Text>
                      <Text
                        style={[
                          styles.categoryLabel,
                          selected && styles.categoryLabelSelected,
                        ]}
                      >
                        {category.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              {selectedCategory ? (
                <View style={styles.subcategoryPanel}>
                  <View style={styles.subcategoryHeader}>
                    <View>
                      <Text style={styles.sectionTitle}>Subcategory</Text>
                      <Text style={styles.subcategoryHint}>{currentCategory?.label}</Text>
                    </View>
                    {selectedSubcategory && !isViewMode ? (
                      <Pressable onPress={clearSubcategory} hitSlop={8}>
                        <Text style={styles.clearAction}>Clear subcategory</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <View style={[styles.subcategoryList, styles.subcategoryListWrap]}>
                    {visibleSubcategories.map((sub) => {
                      const active = selectedSubcategory === sub.id;
                      return (
                        <Pressable
                          key={sub.id}
                          disabled={isViewMode}
                          onPress={() => handleSelectSubcategory(sub.id)}
                          style={[
                            styles.subcategoryChip,
                            active && styles.subcategoryChipSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.subcategoryLabel,
                              active && styles.subcategoryLabelSelected,
                            ]}
                          >
                            {sub.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                    {hasHiddenSubcategories && selectedCategory ? (
                      <Pressable
                        key={`more-${selectedCategory}`}
                        disabled={isViewMode}
                        onPress={() => revealAllSubcategories(selectedCategory)}
                        style={[styles.subcategoryChip, styles.moreChip]}
                      >
                        <Text style={[styles.subcategoryLabel, styles.moreChipLabel]}>More…</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </View>

            <View style={styles.surface}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Transaction type *</Text>
                {!isViewMode && transactionTag ? (
                  <Pressable onPress={() => setTransactionTag(null)} hitSlop={8}>
                    <Text style={styles.clearAction}>Clear</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.tagRow}>
                <Pressable
                  disabled={isViewMode}
                  onPress={() => setTransactionTag("need")}
                  style={[
                    styles.tagChip,
                    transactionTag === "need" && styles.tagChipSelected,
                    transactionTag && transactionTag !== "need" && styles.tagChipDimmed,
                  ]}
                >
                  <Text style={styles.tagIcon}>💡</Text>
                  <View>
                    <Text
                      style={[
                        styles.tagLabel,
                        transactionTag === "need" && styles.tagLabelSelected,
                      ]}
                    >
                      Need
                    </Text>
                    <Text style={styles.tagSubtext}>Essential expense</Text>
                  </View>
                </Pressable>
                <Pressable
                  disabled={isViewMode}
                  onPress={() => setTransactionTag("want")}
                  style={[
                    styles.tagChip,
                    transactionTag === "want" && styles.tagChipSelected,
                    transactionTag && transactionTag !== "want" && styles.tagChipDimmed,
                  ]}
                >
                  <Text style={styles.tagIcon}>✨</Text>
                  <View>
                    <Text
                      style={[
                        styles.tagLabel,
                        transactionTag === "want" && styles.tagLabelSelected,
                      ]}
                    >
                      Want
                    </Text>
                    <Text style={styles.tagSubtext}>Discretionary expense</Text>
                  </View>
                </Pressable>
              </View>
            </View>

            <View style={styles.surface}>
              <Text style={styles.sectionTitle}>Amount</Text>
              <View style={styles.amountField}>
                <Text style={styles.currency}>{currencySymbol}</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amountText}
                  onChangeText={setAmountText}
                  editable={!isViewMode}
                  selectTextOnFocus={!isViewMode}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#cdd1d7"
                  maxLength={10}
                />
              </View>
              {!isAmountValid && amountText.length > 0 ? (
                <Text style={styles.helperText}>Enter an amount greater than zero.</Text>
              ) : null}
              {selectedCategory ? (
                <Pressable
                  disabled={isViewMode}
                  style={styles.summaryChip}
                  onPress={() => {
                    scrollToCategories();
                  }}
                >
                  <Text style={styles.summaryChipText}>
                    {currentCategory?.label}
                    {selectedSubcategoryData ? ` · ${selectedSubcategoryData.label}` : ""}
                  </Text>
                  {selectedSubcategory && !isViewMode ? (
                    <Pressable
                      style={styles.summaryChipClear}
                      onPress={(event) => {
                        event.stopPropagation();
                        clearSubcategory();
                      }}
                      hitSlop={8}
                    >
                      <Text style={styles.summaryChipClearText}>×</Text>
                    </Pressable>
                  ) : null}
                </Pressable>
              ) : null}
            </View>

            <View style={styles.surface}>
              <Text style={styles.sectionTitle}>Note (optional)</Text>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                editable={!isViewMode}
                selectTextOnFocus={!isViewMode}
                placeholder="Add a short note"
                placeholderTextColor="#cdd1d7"
                maxLength={120}
              />
            </View>

            <View style={styles.surface}>
              <Text style={styles.sectionTitle}>Date</Text>
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
                    selectedDate.getTime() === today.getTime() && styles.dateChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dateText,
                      selectedDate.getTime() === today.getTime() && styles.dateTextSelected,
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
                    selectedDate.getTime() !== today.getTime() && styles.dateChipSelected,
                  ]}
                >
                  <Text style={styles.calendarIcon}>📅</Text>
                  <Text
                    style={[
                      styles.dateText,
                      selectedDate.getTime() !== today.getTime() && styles.dateTextSelected,
                    ]}
                  >
                    {formatDate(selectedDate)}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.surface}>
              <View style={styles.recurringHeader}>
                <Text style={styles.sectionTitle}>Recurring expense</Text>
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
                  trackColor={{ false: "#d1d5db", true: "#0f172a" }}
                  thumbColor="#fff"
                />
              </View>

              {isRecurring ? (
                <>
                  {/* Frequency Picker */}
                  <View style={styles.frequencyContainer}>
                    <Text style={styles.recurringSubtitle}>Frequency</Text>
                    <View style={styles.frequencyPicker}>
                      <Pressable
                        style={[
                          styles.frequencyButton,
                          recurringFrequency === "monthly" && styles.frequencyButtonActive,
                        ]}
                        onPress={() => setRecurringFrequency("monthly")}
                        disabled={isViewMode}
                      >
                        <Text
                          style={[
                            styles.frequencyButtonText,
                            recurringFrequency === "monthly" && styles.frequencyButtonTextActive,
                          ]}
                        >
                          Monthly
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.frequencyButton,
                          recurringFrequency === "weekly" && styles.frequencyButtonActive,
                        ]}
                        onPress={() => setRecurringFrequency("weekly")}
                        disabled={isViewMode}
                      >
                        <Text
                          style={[
                            styles.frequencyButtonText,
                            recurringFrequency === "weekly" && styles.frequencyButtonTextActive,
                          ]}
                        >
                          Weekly
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.frequencyButton,
                          recurringFrequency === "biweekly" && styles.frequencyButtonActive,
                        ]}
                        onPress={() => setRecurringFrequency("biweekly")}
                        disabled={isViewMode}
                      >
                        <Text
                          style={[
                            styles.frequencyButtonText,
                            recurringFrequency === "biweekly" && styles.frequencyButtonTextActive,
                          ]}
                        >
                          Biweekly
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Dynamic Copy Text */}
                  <Text style={styles.recurringCopy}>
                    {recurringFrequency === "monthly"
                      ? `Repeat this expense on day ${recurringDayOfMonth} of every month.`
                      : recurringFrequency === "weekly"
                      ? `Repeat this expense every ${dayOfWeekNames[recurringDayOfWeek]}.`
                      : `Repeat this expense every other ${dayOfWeekNames[recurringDayOfWeek]}.`}
                  </Text>

                  {/* Day Selector - Only for Monthly */}
                  {recurringFrequency === "monthly" ? (
                    <View style={styles.recurringDayBlock}>
                      <Text style={styles.recurringSubtitle}>Day of month</Text>
                      <View style={styles.recurringDayControls}>
                        <Pressable
                          style={[
                            styles.dayButton,
                            (isViewMode || recurringDayOfMonth <= 1) && styles.dayButtonDisabled,
                          ]}
                          disabled={isViewMode || recurringDayOfMonth <= 1}
                          onPress={() => {
                            setRecurringDayOfMonth((current) => Math.max(1, current - 1));
                            setRecurringDayDirty(true);
                          }}
                        >
                          <Text style={styles.dayButtonText}>−</Text>
                        </Pressable>
                        <Text style={styles.dayValue}>Day {recurringDayOfMonth}</Text>
                        <Pressable
                          style={[
                            styles.dayButton,
                            (isViewMode || recurringDayOfMonth >= 31) && styles.dayButtonDisabled,
                          ]}
                          disabled={isViewMode || recurringDayOfMonth >= 31}
                          onPress={() => {
                            setRecurringDayOfMonth((current) => Math.min(31, current + 1));
                            setRecurringDayDirty(true);
                          }}
                        >
                          <Text style={styles.dayButtonText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.recurringDayBlock}>
                      <Text style={styles.recurringHelper}>
                        Based on selected date: {dayOfWeekNames[recurringDayOfWeek]}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.recurringCopy}>Enable to repeat this expense automatically.</Text>
              )}
            </View>
          </ScrollView>

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
              <Text style={styles.saveText}>Edit transaction</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                (!formValid || saving || isSaving) && styles.saveButtonDisabled,
                pressed && formValid && !saving && !isSaving && styles.saveButtonPressed,
              ]}
              disabled={!formValid || saving || isSaving}
              onPress={handleSave}
            >
              <Text style={styles.saveText}>
                {saving || isSaving ? "Saving…" : mode === "edit" ? "Save changes" : "Save entry"}
              </Text>
            </Pressable>
          )}
        </View>
        {!isViewMode && showCalendar ? (
          <Pressable style={styles.calendarOverlay} onPress={() => setShowCalendar(false)}>
            <Pressable style={styles.calendarModal} onPress={(e) => e.stopPropagation()}>
              <View style={styles.calendarHeader}>
                <Pressable
                  onPress={() =>
                    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                  }
                  style={styles.calendarNav}
                >
                  <Text style={styles.calendarNavText}>‹</Text>
                </Pressable>
                <Text style={styles.calendarTitle}>
                  {monthCursor.toLocaleDateString("en-GB", {
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
                <Pressable
                  disabled={
                    monthCursor.getFullYear() === today.getFullYear() &&
                    monthCursor.getMonth() === today.getMonth()
                  }
                  onPress={() =>
                    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                  }
                  style={[
                    styles.calendarNav,
                    monthCursor.getFullYear() === today.getFullYear() &&
                      monthCursor.getMonth() === today.getMonth() &&
                      styles.calendarNavDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.calendarNavText,
                      monthCursor.getFullYear() === today.getFullYear() &&
                        monthCursor.getMonth() === today.getMonth() &&
                        styles.calendarNavTextDisabled,
                    ]}
                  >
                    ›
                  </Text>
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
                    return <View key={`empty-${index}`} style={styles.calendarCell} />;
                  }
                  const isFuture = day.getTime() > today.getTime();
                  const isSelected = day.getTime() === selectedDate.getTime();
                  return (
                    <Pressable
                      key={day.toISOString()}
                      disabled={isFuture}
                      onPress={() => {
                        setSelectedDate(day);
                        setShowCalendar(false);
                      }}
                      style={[
                        styles.calendarCell,
                        isSelected && styles.calendarCellSelected,
                        isFuture && styles.calendarCellDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDateText,
                          isSelected && styles.calendarDateTextSelected,
                          isFuture && styles.calendarDateTextDisabled,
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
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
    width: "100%",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: "#0f172a",
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
    color: "#111827",
  },
  close: {
    fontSize: 22,
    color: "#111827",
  },
  body: {
    gap: 12,
    paddingBottom: 8,
  },
  surface: {
    backgroundColor: "#f6f3ed",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ede7dc",
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clearAction: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  helperText: {
    fontSize: 13,
    color: "#6b7280",
  },
  categoryRow: {
    gap: 10,
    paddingRight: 4,
  },
  subcategoryPanel: {
    marginTop: 12,
    gap: 8,
  },
  subcategoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subcategoryHint: {
    fontSize: 12,
    color: "#6b7280",
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ede7dc",
  },
  categoryChipSelected: {
    backgroundColor: "#111827",
    borderColor: "#0b1222",
  },
  categoryChipDimmed: {
    opacity: 0.6,
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  categoryLabelSelected: {
    color: "#f8fafc",
  },
  subcategoryList: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  subcategoryListWrap: {
    flexWrap: "wrap",
  },
  subcategoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ede7dc",
  },
  subcategoryChipSelected: {
    backgroundColor: "#111827",
    borderColor: "#0b1222",
  },
  subcategoryIcon: {
    fontSize: 16,
  },
  subcategoryLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  subcategoryLabelSelected: {
    color: "#f8fafc",
  },
  moreChip: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
  },
  moreChipLabel: {
    color: "#475569",
  },
  summaryChip: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  summaryChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  summaryChipClear: {
    marginLeft: 10,
  },
  summaryChipClearText: {
    fontSize: 16,
    color: "#475569",
  },
  amountField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ede7dc",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  currency: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6b7280",
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  noteInput: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ede7dc",
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },
  dateRow: {
    flexDirection: "row",
    gap: 10,
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ede7dc",
  },
  dateChipSelected: {
    backgroundColor: "#111827",
    borderColor: "#0b1222",
  },
  dateText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  dateTextSelected: {
    color: "#f8fafc",
  },
  calendarChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  calendarIcon: {
    fontSize: 16,
  },
  recurringHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recurringCopy: {
    fontSize: 13,
    color: "#6b7280",
  },
  recurringDayBlock: {
    gap: 8,
  },
  recurringSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
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
    borderColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  dayButtonDisabled: {
    opacity: 0.3,
  },
  dayButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  dayValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  recurringHelper: {
    fontSize: 12,
    color: "#6b7280",
  },
  calendarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  calendarModal: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ede7dc",
    shadowColor: "#0f172a",
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
    color: "#111827",
  },
  calendarNav: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ede7dc",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarNavDisabled: {
    backgroundColor: "#f8fafc",
  },
  calendarNavText: {
    fontSize: 16,
    color: "#111827",
  },
  calendarNavTextDisabled: {
    color: "#9ca3af",
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
    color: "#6b7280",
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
    backgroundColor: "#111827",
    borderRadius: 12,
  },
  calendarCellDisabled: {
    opacity: 0.4,
  },
  calendarDateText: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "700",
  },
  calendarDateTextSelected: {
    color: "#f8fafc",
  },
  calendarDateTextDisabled: {
    color: "#9ca3af",
  },
  saveButton: {
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#0b1222",
  },
  saveButtonPressed: {
    opacity: 0.92,
  },
  saveButtonDisabled: {
    backgroundColor: "#cbd5e1",
    borderColor: "#cbd5e1",
  },
  saveText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
  },
  tagRow: {
    flexDirection: "row",
    gap: 10,
  },
  tagChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ede7dc",
  },
  tagChipSelected: {
    backgroundColor: "#111827",
    borderColor: "#0b1222",
  },
  tagChipDimmed: {
    opacity: 0.6,
  },
  tagIcon: {
    fontSize: 24,
  },
  tagLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  tagLabelSelected: {
    color: "#f8fafc",
  },
  tagSubtext: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
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
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ede7dc",
    alignItems: "center",
  },
  frequencyButtonActive: {
    backgroundColor: "#111827",
    borderColor: "#0b1222",
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  frequencyButtonTextActive: {
    color: "#f8fafc",
  },
});
