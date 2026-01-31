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
import { useUserPreferences } from "@/components/profile/UserPreferencesProvider";
import { useCurrencyFormatter } from "@/components/profile/useCurrencyFormatter";
import { formatAmountInput, parseAmountInput } from "@/utils/decimalSeparator";
import { createExpenseTransaction } from "@/lib/gen/transactions/transactions";
import { createRecurringExpenseTemplate } from "@/lib/gen/recurring-templates/recurring-templates";
import { useSupabaseAuthSync } from "@/hooks/useSupabaseAuthSync";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import type { ExpenseCategory } from "@/lib/gen/model";
import { alpha, colors, palette } from "@/constants/theme";
import { dateToLocalDateString } from "@/utils/timezoneUtils";

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
  onSuccess?: (date: Date) => void | Promise<void>;
  expenseCategories?: ExpenseCategory[];
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

const MAX_VISIBLE_SUBCATEGORIES = 6;

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
  onSuccess,
  expenseCategories,
  onSubmit,
  onEditRequest,
  isSaving = false,
}: Props) {
  const { session } = useSupabaseAuthSync();
  const {
    expenseCategories: fetchedCategories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useExpenseCategories();

  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(
    null,
  );
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [amountText, setAmountText] = useState("");
  const [note, setNote] = useState("");
  const [transactionTag, setTransactionTag] = useState<"need" | "want" | null>(
    null,
  );
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
  const [recurringFrequency, setRecurringFrequency] = useState<
    "monthly" | "weekly" | "biweekly"
  >("monthly");
  const [recurringDayOfMonth, setRecurringDayOfMonth] = useState<number>(
    today.getDate(),
  );
  const [recurringDayDirty, setRecurringDayDirty] = useState(false);
  const { currencySymbol } = useCurrencyFormatter();
  const isViewMode = mode === "view";

  // Calculate day of week from selected date (0=Monday, 6=Sunday)
  const recurringDayOfWeek = useMemo(() => {
    const day = selectedDate.getDay(); // 0=Sunday, 6=Saturday
    return day === 0 ? 6 : day - 1; // Convert to 0=Monday, 6=Sunday
  }, [selectedDate]);

  const dayOfWeekNames = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const scrollRef = useRef<ScrollView>(null);
  const [categorySectionTop, setCategorySectionTop] = useState(0);

  const { decimalSeparator } = useUserPreferences();
  const amountValue = useMemo(
    () => parseAmountInput(amountText, decimalSeparator),
    [amountText, decimalSeparator],
  );
  const amountPlaceholder = decimalSeparator === "," ? "0,00" : "0.00";

  const isAmountValid = amountValue > 0;
  const usingProvidedCategories = expenseCategories !== undefined;
  const categories = useMemo(() => {
    const source = usingProvidedCategories
      ? (expenseCategories ?? [])
      : fetchedCategories;
    return source
      .filter(
        (category) => category.label.trim().toLowerCase() !== "test expense",
      )
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [expenseCategories, fetchedCategories, usingProvidedCategories]);
  const currentCategory = useMemo(
    () =>
      categories.find((category) => category.id === selectedCategory) ?? null,
    [categories, selectedCategory],
  );
  const subcategoryOptions = useMemo(() => {
    const subcategories = currentCategory?.subcategories ?? [];
    return [...subcategories].sort((a, b) => a.sort_order - b.sort_order);
  }, [currentCategory]);
  const isCategoryValid = Boolean(selectedCategory);
  const isTagValid = Boolean(transactionTag);
  const formValid = isAmountValid && isCategoryValid && isTagValid;
  const monthDays = useMemo(() => getMonthDays(monthCursor), [monthCursor]);

  const selectedSubcategoryData = subcategoryOptions.find(
    (sub) => sub.id === selectedSubcategory,
  );
  const isCurrentCategoryExpanded = selectedCategory
    ? Boolean(expandedCategories[selectedCategory])
    : false;
  const visibleSubcategories =
    isCurrentCategoryExpanded || isViewMode
      ? subcategoryOptions
      : subcategoryOptions.slice(0, MAX_VISIBLE_SUBCATEGORIES);
  const hasHiddenSubcategories =
    !isViewMode &&
    subcategoryOptions.length > MAX_VISIBLE_SUBCATEGORIES &&
    !isCurrentCategoryExpanded;

  const animateLayout = () => {
    if (LayoutAnimation.configureNext) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  };

  const scrollToCategories = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        y: Math.max(categorySectionTop - 16, 0),
        animated: true,
      });
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
    setSelectedSubcategory((current) =>
      current === subcategoryId ? null : subcategoryId,
    );
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
        initialValues.amount || initialValues.amount === 0
          ? formatAmountInput(initialValues.amount, decimalSeparator)
          : "",
      );
      setNote(initialValues.note ?? "");
      setSelectedDate(parsedDate);
      setMonthCursor(getMonthStart(parsedDate));
      setShowCalendar(false);
      setIsRecurring(Boolean(initialValues.isRecurring));
      setRecurringDayOfMonth(
        initialValues.recurringDayOfMonth ?? parsedDate.getDate(),
      );
      setRecurringDayDirty(false);
      setTransactionTag(initialValues.transactionTag ?? null);
    } else if (mode === "add") {
      resetForm();
    }
  }, [visible, mode, initialValues, today, resetForm, decimalSeparator]);

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
            day_of_week:
              recurringFrequency !== "monthly" ? recurringDayOfWeek : null,
            day_of_month:
              recurringFrequency === "monthly" ? recurringDayOfMonth : null,
            start_date: dateToLocalDateString(selectedDate),
            end_date: null, // MVP: never ends
            total_occurrences: null, // MVP: never ends
            transaction_tag: transactionTag,
            expense_category_id: selectedCategory,
            expense_subcategory_id: selectedSubcategory || null,
            notes: note.trim() || null,
          };

          console.log(
            "[AddExpenseModal] Creating recurring template:",
            JSON.stringify(payload, null, 2),
          );
          const response = await createRecurringExpenseTemplate(payload);

          if (response.status === 201) {
            Alert.alert("Success", "Recurring expense template created!");
            await onSuccess?.(selectedDate);
            resetForm();
            onClose();
          } else {
            console.error("[AddExpenseModal] Error response:", response);
            const errorMessage =
              (response.data as any)?.detail ||
              "Failed to create recurring template";
            Alert.alert(
              "Error",
              typeof errorMessage === "string"
                ? errorMessage
                : JSON.stringify(errorMessage),
            );
          }
        } else {
          // Create one-time transaction
          const payload = {
            user_id: session.user.id,
            occurred_at: dateToLocalDateString(selectedDate),
            amount: amountValue,
            notes: note.trim() || null,
            type: "expense" as const,
            transaction_tag: transactionTag,
            expense_category_id: selectedCategory,
            expense_subcategory_id: selectedSubcategory || null,
          };

          console.log(
            "[AddExpenseModal] Creating one-time expense:",
            JSON.stringify(payload, null, 2),
          );
          const response = await createExpenseTransaction(payload);

          if (response.status === 201) {
            Alert.alert("Success", "Expense created successfully!");
            await onSuccess?.(selectedDate);
            resetForm();
            onClose();
          } else {
            console.error("[AddExpenseModal] Error response:", response);
            const errorMessage =
              (response.data as any)?.detail ||
              "Failed to create expense transaction";
            Alert.alert(
              "Error",
              typeof errorMessage === "string"
                ? errorMessage
                : JSON.stringify(errorMessage),
            );
          }
        }
      } catch (error) {
        console.error("[AddExpenseModal] Exception caught:", error);
        Alert.alert(
          "Error",
          `Failed to create expense: ${error instanceof Error ? error.message : String(error)}`,
        );
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
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
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
              {mode === "edit"
                ? "Edit expense"
                : mode === "view"
                  ? "Transaction overview"
                  : "Add expense"}
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
              onLayout={(event) =>
                setCategorySectionTop(event.nativeEvent.layout.y)
              }
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
                {!usingProvidedCategories && categoriesLoading ? (
                  <Text style={styles.emptyCategoriesText}>
                    Loading categories…
                  </Text>
                ) : categories.length === 0 ? (
                  <Text style={styles.emptyCategoriesText}>
                    {!usingProvidedCategories && categoriesError
                      ? "Failed to load categories."
                      : "No categories available."}
                  </Text>
                ) : (
                  categories.map((category) => {
                    const selected = selectedCategory === category.id;
                    const dimmed = Boolean(
                      selectedCategory && selectedCategory !== category.id,
                    );
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
                        <View
                          style={[
                            styles.categoryIcon,
                            { backgroundColor: category.color },
                          ]}
                        />
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
                  })
                )}
              </ScrollView>
              {selectedCategory ? (
                <View style={styles.subcategoryPanel}>
                  <View style={styles.subcategoryHeader}>
                    <View>
                      <Text style={styles.sectionTitle}>Subcategory</Text>
                      <Text style={styles.subcategoryHint}>
                        {currentCategory?.label}
                      </Text>
                    </View>
                    {selectedSubcategory && !isViewMode ? (
                      <Pressable onPress={clearSubcategory} hitSlop={8}>
                        <Text style={styles.clearAction}>
                          Clear subcategory
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <View
                    style={[styles.subcategoryList, styles.subcategoryListWrap]}
                  >
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
                        <Text
                          style={[
                            styles.subcategoryLabel,
                            styles.moreChipLabel,
                          ]}
                        >
                          More…
                        </Text>
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
                  <Pressable
                    onPress={() => setTransactionTag(null)}
                    hitSlop={8}
                  >
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
                    transactionTag &&
                      transactionTag !== "need" &&
                      styles.tagChipDimmed,
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
                    transactionTag &&
                      transactionTag !== "want" &&
                      styles.tagChipDimmed,
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
                  placeholder={amountPlaceholder}
                  placeholderTextColor={palette.slate280}
                  maxLength={10}
                />
              </View>
              {!isAmountValid && amountText.length > 0 ? (
                <Text style={styles.helperText}>
                  Enter an amount greater than zero.
                </Text>
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
                    {selectedSubcategoryData
                      ? ` · ${selectedSubcategoryData.label}`
                      : ""}
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
                placeholderTextColor={palette.slate280}
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
                  trackColor={{
                    false: palette.slate260,
                    true: palette.slate900,
                  }}
                  thumbColor={palette.white}
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
                          recurringFrequency === "monthly" &&
                            styles.frequencyButtonActive,
                        ]}
                        onPress={() => setRecurringFrequency("monthly")}
                        disabled={isViewMode}
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
                        style={[
                          styles.frequencyButton,
                          recurringFrequency === "weekly" &&
                            styles.frequencyButtonActive,
                        ]}
                        onPress={() => setRecurringFrequency("weekly")}
                        disabled={isViewMode}
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
                        style={[
                          styles.frequencyButton,
                          recurringFrequency === "biweekly" &&
                            styles.frequencyButtonActive,
                        ]}
                        onPress={() => setRecurringFrequency("biweekly")}
                        disabled={isViewMode}
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
                            (isViewMode || recurringDayOfMonth <= 1) &&
                              styles.dayButtonDisabled,
                          ]}
                          disabled={isViewMode || recurringDayOfMonth <= 1}
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
                          style={[
                            styles.dayButton,
                            (isViewMode || recurringDayOfMonth >= 31) &&
                              styles.dayButtonDisabled,
                          ]}
                          disabled={isViewMode || recurringDayOfMonth >= 31}
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
                    </View>
                  ) : (
                    <View style={styles.recurringDayBlock}>
                      <Text style={styles.recurringHelper}>
                        Based on selected date:{" "}
                        {dayOfWeekNames[recurringDayOfWeek]}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.recurringCopy}>
                  Enable to repeat this expense automatically.
                </Text>
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
                pressed &&
                  formValid &&
                  !saving &&
                  !isSaving &&
                  styles.saveButtonPressed,
              ]}
              disabled={!formValid || saving || isSaving}
              onPress={handleSave}
            >
              <Text style={styles.saveText}>
                {saving || isSaving
                  ? "Saving…"
                  : mode === "edit"
                    ? "Save changes"
                    : "Save entry"}
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
                <Pressable
                  onPress={() =>
                    setMonthCursor(
                      (prev) =>
                        new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                    )
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
                    setMonthCursor(
                      (prev) =>
                        new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                    )
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
                    return (
                      <View
                        key={`empty-${index}`}
                        style={styles.calendarCell}
                      />
                    );
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
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 12,
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
    fontSize: 22,
    color: colors.text,
  },
  body: {
    gap: 12,
    paddingBottom: 8,
  },
  surface: {
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
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
    fontSize: 13,
    color: palette.gray500,
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
    color: palette.gray500,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.sand200,
  },
  categoryChipSelected: {
    backgroundColor: palette.gray900,
    borderColor: palette.slate910,
  },
  categoryChipDimmed: {
    opacity: 0.6,
  },
  categoryIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.gray900,
  },
  categoryLabelSelected: {
    color: palette.slate190,
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
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.sand200,
  },
  subcategoryChipSelected: {
    backgroundColor: palette.gray900,
    borderColor: palette.slate910,
  },
  subcategoryIcon: {
    fontSize: 16,
  },
  subcategoryLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.gray900,
  },
  subcategoryLabelSelected: {
    color: palette.slate190,
  },
  moreChip: {
    backgroundColor: palette.slate190,
    borderColor: palette.slate300,
  },
  moreChipLabel: {
    color: palette.slate600,
  },
  emptyCategoriesText: {
    color: palette.gray500,
    fontSize: 13,
    fontWeight: "600",
    paddingVertical: 6,
  },
  summaryChip: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: palette.slate210,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: palette.slate230,
  },
  summaryChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.slate900,
  },
  summaryChipClear: {
    marginLeft: 10,
  },
  summaryChipClearText: {
    fontSize: 16,
    color: palette.slate600,
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
  recurringHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recurringCopy: {
    fontSize: 13,
    color: palette.gray500,
  },
  recurringDayBlock: {
    gap: 8,
  },
  recurringSubtitle: {
    fontSize: 13,
    fontWeight: "600",
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
  recurringHelper: {
    fontSize: 12,
    color: palette.gray500,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
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
    color: colors.text,
  },
  tagLabelSelected: {
    color: colors.textLight,
  },
  tagSubtext: {
    fontSize: 11,
    color: palette.gray500,
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
});
