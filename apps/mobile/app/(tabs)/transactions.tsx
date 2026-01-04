import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import spendingCategories from "../../../../shared/config/spending-categories.json";
import { AddIncomeModal } from "@/components/AddIncomeModal";
import { AddSpendingModal } from "@/components/AddSpendingModal";
import { recurringExpensesSeed } from "@/src/dummy_data/recurringExpenses";
import { ledgerMonths } from "@/src/dummy_data/transactions";
import type { LedgerMonth, TransactionEntry } from "@/src/dummy_data/transactions";
import { useBudgetContext } from "@/src/features/budget/BudgetProvider";
import { getIncomeTypeLabel } from "@/src/features/budget/types";
import type { IncomeEvent } from "@/src/features/budget/types";
import { useCurrencyFormatter } from "@/src/features/profile/useCurrencyFormatter";
import {
  createTemplateFromPayload,
  materializeRecurringTransactions,
  markManualOccurrence,
  type RecurringExpenseTemplate,
} from "@/src/features/transactions/recurring";

type SubCategory = { id: string; label: string };
type CategoryConfig = {
  id: string;
  label: string;
  icon: string;
  subcategories?: SubCategory[];
};

type TransactionSection = {
  title: string;
  dateKey: string;
  total: number;
  categoryTotals: Record<string, number>;
  data: TransactionEntry[];
};

const categoryConfig: { categories: CategoryConfig[] } = spendingCategories;
const categoryLookup = new Map(categoryConfig.categories.map((cat) => [cat.id, cat]));
const categoryOrder = categoryConfig.categories.map((cat) => cat.id);

const categoryAccent: Record<string, { bg: string; fill: string }> = {
  essentials: { bg: "#fef3c7", fill: "#f59e0b" },
  lifestyle: { bg: "#ffe4e6", fill: "#f472b6" },
  personal: { bg: "#dbeafe", fill: "#3b82f6" },
  savings: { bg: "#fef9c3", fill: "#fbbf24" },
  investments: { bg: "#ccfbf1", fill: "#14b8a6" },
  other: { bg: "#ede9fe", fill: "#a855f7" },
};

const initialMonths = ledgerMonths;

const formatRelativeDate = (value: Date, reference: Date) => {
  const dayMs = 24 * 60 * 60 * 1000;
  const normalizedTarget = new Date(value);
  normalizedTarget.setHours(0, 0, 0, 0);
  const normalizedRef = new Date(reference);
  normalizedRef.setHours(0, 0, 0, 0);
  const diff = Math.round((normalizedRef.getTime() - normalizedTarget.getTime()) / dayMs);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return normalizedTarget.toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "numeric" });
};

const getCategoryLabel = (categoryId: string) => categoryLookup.get(categoryId)?.label ?? categoryId;
const getCategoryIcon = (categoryId: string) => categoryLookup.get(categoryId)?.icon ?? "💸";
const getSubcategoryLabel = (categoryId: string, subId?: string) =>
  subId
    ? categoryLookup
        .get(categoryId)
        ?.subcategories?.find((sub) => sub.id === subId)?.label ?? subId
    : null;

export default function TransactionsScreen() {
  const { height } = useWindowDimensions();
  const [baseMonths, setBaseMonths] = useState<LedgerMonth[]>(initialMonths);
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringExpenseTemplate[]>(recurringExpensesSeed);
  const months = useMemo(
    () => materializeRecurringTransactions(baseMonths, recurringTemplates),
    [baseMonths, recurringTemplates],
  );
  const [monthIndex, setMonthIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add");
  const [editingTx, setEditingTx] = useState<TransactionEntry | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [incomeModalVisible, setIncomeModalVisible] = useState(false);
  const [incomeModalMode, setIncomeModalMode] = useState<"add" | "edit" | "view">("add");
  const [editingIncome, setEditingIncome] = useState<IncomeEvent | null>(null);
  const [showRecurringOnly, setShowRecurringOnly] = useState(false);
  const { incomeByMonth, deleteIncome } = useBudgetContext();
  const { formatCurrency } = useCurrencyFormatter();
  const formatMoney = (value: number) =>
    formatCurrency(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const activeMonth = months[monthIndex];
  const activeReference = new Date(activeMonth?.currentDate ?? Date.now());
  const activeMonthKey = activeMonth?.key ?? months[0].key;
  const monthIncomes = incomeByMonth[activeMonthKey] ?? [];
  const expenseTransactions = activeMonth?.transactions ?? [];
  const incomeTransactions: TransactionEntry[] = monthIncomes.map((income) => {
    const [year, month, day] = income.date.split("-").map(Number);
    const timestamp = new Date(year, (month ?? 1) - 1, day ?? 1, 9, 0, 0);
    return {
      id: income.id,
      kind: "income",
      amount: income.amount,
      incomeType: income.type,
      note: income.note,
      timestamp: timestamp.toISOString(),
      isRecurringInstance: Boolean(income.isRecurring),
      recurringDayOfMonth: income.recurringDayOfMonth ?? null,
    };
  });
  const monthTransactions = [...expenseTransactions, ...incomeTransactions];

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 360);
    return () => clearTimeout(timer);
  }, [monthIndex]);

  const filteredTransactions = useMemo(() => {
    const base = monthTransactions.slice();
    const query = searchQuery.trim().toLowerCase();
    const filtered = base.filter((tx) => {
      if (showRecurringOnly && !tx.isRecurringInstance) {
        return false;
      }
      if (tx.kind === "income" && activeCategory) {
        return false;
      }
      if (tx.kind !== "income" && activeCategory && tx.categoryId !== activeCategory) {
        return false;
      }
      if (!query) {
        return true;
      }
      const searchTarget =
        tx.kind === "income"
          ? `${getIncomeTypeLabel(tx.incomeType)} ${(tx.note ?? "").toLowerCase()}`
          : `${getCategoryLabel(tx.categoryId).toLowerCase()} ${(getSubcategoryLabel(tx.categoryId, tx.subcategoryId) ?? "").toLowerCase()} ${(tx.note ?? "").toLowerCase()}`;
      return searchTarget.includes(query);
    });
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return filtered;
  }, [monthTransactions, activeCategory, searchQuery, showRecurringOnly]);

  const sections: TransactionSection[] = useMemo(() => {
    const map = new Map<string, TransactionSection>();
    filteredTransactions.forEach((tx) => {
      const txDate = new Date(tx.timestamp);
      txDate.setHours(0, 0, 0, 0);
      const key = txDate.toISOString();
      if (!map.has(key)) {
        map.set(key, {
          title: formatRelativeDate(txDate, activeReference),
          dateKey: key,
          total: 0,
          categoryTotals: {},
          data: [],
        });
      }
      const section = map.get(key)!;
      section.data.push(tx);
      if (tx.kind !== "income") {
        section.total += tx.amount;
        section.categoryTotals[tx.categoryId] = (section.categoryTotals[tx.categoryId] ?? 0) + tx.amount;
      }
    });
    const list = Array.from(map.values());
    list.sort((a, b) => new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime());
    return list;
  }, [filteredTransactions, activeReference]);

  const entryCount = monthTransactions.length;
  const showEmptyMonth = !loading && entryCount === 0;
  const showNoMatches = !loading && entryCount > 0 && filteredTransactions.length === 0;
  const chipBottomSpacing = Math.max(12, Math.min(height * 0.035, 40));

  const goPrev = () => {
    setMonthIndex((prev) => Math.min(prev + 1, months.length - 1));
  };
  const goNext = () => {
    setMonthIndex((prev) => Math.max(prev - 1, 0));
  };

  const openAddModal = () => {
    setShowAddMenu(false);
    setModalMode("add");
    setEditingTx(null);
    setModalVisible(true);
  };

  const openAddIncomeModal = () => {
    setShowAddMenu(false);
    setIncomeModalMode("add");
    setEditingIncome(null);
    setIncomeModalVisible(true);
  };

  const openEditIncomeModal = (income: IncomeEvent) => {
    setIncomeModalMode("edit");
    setEditingIncome(income);
    setIncomeModalVisible(true);
  };

  const openIncomeOverview = (income: IncomeEvent) => {
    setIncomeModalMode("view");
    setEditingIncome(income);
    setIncomeModalVisible(true);
  };

  const openEditModal = (tx: TransactionEntry) => {
    setModalMode("edit");
    setEditingTx(tx);
    setModalVisible(true);
  };

  const closeIncomeModal = () => {
    setIncomeModalVisible(false);
    setIncomeModalMode("add");
    setEditingIncome(null);
  };

  const openOverviewModal = (tx: TransactionEntry) => {
    setModalMode("view");
    setEditingTx(tx);
    setModalVisible(true);
  };

  const handleOverviewEdit = () => {
    if (!editingTx) {
      return;
    }
    setModalMode("edit");
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingTx(null);
    setModalMode("add");
  };

  const handleIncomeOverviewEdit = () => {
    if (!editingIncome) {
      return;
    }
    setIncomeModalMode("edit");
  };

  const handleModalSubmit = (payload: {
    amount: number;
    categoryId: string;
    subcategoryId?: string | null;
    note: string;
    date: Date;
    recurring?: { dayOfMonth: number };
  }) => {
    const isoDate = payload.date.toISOString();
    const dateKey = isoDate.split("T")[0] ?? isoDate;

    if (modalMode === "edit" && editingTx) {
      setBaseMonths((prev) =>
        prev.map((month, idx) => {
          if (idx !== monthIndex) return month;
          const updated = month.transactions.map((tx) =>
            tx.id === editingTx.id
              ? {
                  ...tx,
                  amount: payload.amount,
                  categoryId: payload.categoryId,
                  subcategoryId: payload.subcategoryId ?? undefined,
                  note: payload.note,
                  timestamp: isoDate,
                }
              : tx,
          );
          updated.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          return { ...month, transactions: updated };
        }),
      );
      return;
    }

    const createdTemplate = payload.recurring
      ? createTemplateFromPayload({
          amount: payload.amount,
          categoryId: payload.categoryId,
          subcategoryId: payload.subcategoryId ?? undefined,
          note: payload.note,
          date: payload.date,
          dayOfMonth: payload.recurring.dayOfMonth,
        })
      : null;

    setBaseMonths((prev) =>
      prev.map((month, idx) => {
        if (idx !== monthIndex) return month;
        const newTx: TransactionEntry = {
          id: `tx-${month.key}-${Date.now()}`,
          kind: "expense",
          amount: payload.amount,
          categoryId: payload.categoryId,
          subcategoryId: payload.subcategoryId ?? undefined,
          note: payload.note,
          timestamp: isoDate,
          timeLabel: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          ...(createdTemplate
            ? {
                recurringTemplateId: createdTemplate.id,
                recurringDateKey: dateKey,
                isRecurringInstance: true,
                recurringDayOfMonth: payload.recurring?.dayOfMonth ?? null,
              }
            : {}),
        };
        const nextTransactions = [newTx, ...month.transactions];
        nextTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return { ...month, transactions: nextTransactions };
      }),
    );

    if (createdTemplate) {
      setRecurringTemplates((prev) => [...prev, createdTemplate]);
    }
  };

  const confirmDelete = (txId: string) => {
    const expense =
      activeMonth?.transactions.find((tx) => tx.id === txId && tx.kind === "expense") ?? null;
    Alert.alert("Delete transaction", "Are you sure you want to delete this entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (expense?.isRecurringInstance && expense.recurringTemplateId && expense.recurringDateKey) {
            setRecurringTemplates((prev) =>
              prev.map((template) =>
                template.id === expense.recurringTemplateId
                  ? markManualOccurrence(template, expense.recurringDateKey!)
                  : template,
              ),
            );
          }
          setBaseMonths((prev) =>
            prev.map((month, idx) => {
              if (idx !== monthIndex) {
                return month;
              }
              return {
                ...month,
                transactions: month.transactions.filter((tx) => tx.id !== txId),
              };
            }),
          );
        },
      },
    ]);
  };

  const confirmDeleteIncome = (incomeId: string) => {
    Alert.alert("Delete income", "Are you sure you want to delete this income entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteIncome(activeMonthKey, incomeId),
      },
    ]);
  };

  const clearFilters = () => {
    setActiveCategory(null);
    setSearchQuery("");
    setShowRecurringOnly(false);
  };

  const renderTransactionRow = ({ item }: { item: TransactionEntry; section: TransactionSection }) => {
    const isIncome = item.kind === "income";
    const categoryMeta = categoryAccent[item.categoryId ?? "other"] ?? { bg: "#e2e8f0", fill: "#0f172a" };
    const subcategoryLabel = item.kind === "income" ? null : getSubcategoryLabel(item.categoryId, item.subcategoryId);
    const categoryLabel = item.kind === "income" ? getIncomeTypeLabel(item.incomeType) : getCategoryLabel(item.categoryId);
    const subtitleParts: string[] = [];
    if (subcategoryLabel) subtitleParts.push(subcategoryLabel);
    if (item.note) subtitleParts.push(item.note);
    const subtitle = subtitleParts.join(" · ");
    const incomeEvent: IncomeEvent | null = isIncome
      ? {
          id: item.id,
          amount: item.amount,
          type: item.incomeType,
          date: item.timestamp.split("T")[0],
          note: item.note,
          isRecurring: Boolean(item.isRecurringInstance),
          recurringDayOfMonth: item.recurringDayOfMonth ?? null,
        }
      : null;
    const onEdit = isIncome && incomeEvent ? () => openEditIncomeModal(incomeEvent) : () => openEditModal(item);
    const onDelete = isIncome && incomeEvent ? () => confirmDeleteIncome(incomeEvent.id) : () => confirmDelete(item.id);
    const displayAmount = `${isIncome ? "+" : ""}${formatMoney(item.amount)}`;
    const showRecurringBadge = Boolean(item.isRecurringInstance);

    return (
      <SwipeRow onEdit={onEdit} onDelete={onDelete}>
        <Pressable
          style={styles.txRow}
          onPress={() => {
            if (isIncome && incomeEvent) {
              openIncomeOverview(incomeEvent);
            } else {
              openOverviewModal(item);
            }
          }}
        >
          <View style={styles.txLeft}>
            {isIncome ? (
              <View style={[styles.txIcon, styles.txIncomeIcon]}>
                <Text style={styles.txIconText}>＋</Text>
              </View>
            ) : (
              <View style={[styles.txIcon, { backgroundColor: categoryMeta.bg }]}>
                <Text style={styles.txIconText}>{getCategoryIcon(item.categoryId)}</Text>
              </View>
            )}
            <View style={styles.txInfo}>
              <Text style={[styles.txTitle, isIncome && styles.txIncomeTitle]}>{categoryLabel}</Text>
              {subtitle ? <Text style={styles.txSubtitle}>{subtitle}</Text> : null}
              {showRecurringBadge ? <Text style={styles.recurringBadge}>Recurring</Text> : null}
            </View>
          </View>
          <View style={styles.txRight}>
            <Text style={[styles.txAmount, isIncome && styles.txIncomeAmount]}>{displayAmount}</Text>
          </View>
        </Pressable>
      </SwipeRow>
    );
  };

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        {showAddMenu ? <Pressable style={styles.addMenuBackdrop} onPress={() => setShowAddMenu(false)} /> : null}
        <View style={styles.header}>
          <Text style={styles.title}>Transactions</Text>
          <View style={styles.headerActions}>
            <View style={styles.addMenuWrapper}>
              {showAddMenu ? (
                <View style={styles.addMenuCard}>
                  <Pressable
                    style={({ pressed }) => [styles.addMenuOption, pressed && styles.addMenuOptionPressed]}
                    onPress={openAddModal}
                  >
                    <Text style={styles.addMenuOptionLabel}>Add expense</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.addMenuOption,
                      styles.addMenuOptionSecondary,
                      pressed && styles.addMenuOptionPressed,
                    ]}
                    onPress={openAddIncomeModal}
                  >
                    <Text style={[styles.addMenuOptionLabel, styles.addMenuOptionLabelSecondary]}>Add income</Text>
                  </Pressable>
                </View>
              ) : null}
              <Pressable style={styles.addButton} onPress={() => setShowAddMenu((prev) => !prev)}>
                <Text style={styles.addButtonText}>＋</Text>
              </Pressable>
            </View>
          </View>
        </View>
        <View style={styles.monthSelector}>
          <Pressable
            onPress={goPrev}
            disabled={monthIndex >= months.length - 1}
            style={[styles.monthArrow, monthIndex >= months.length - 1 && styles.monthArrowDisabled]}
          >
            <Text style={styles.monthArrowText}>‹</Text>
          </Pressable>
          <Text style={styles.monthLabel}>{activeMonth?.label ?? "Month"}</Text>
          <Pressable
            onPress={goNext}
            disabled={monthIndex === 0}
            style={[styles.monthArrow, monthIndex === 0 && styles.monthArrowDisabled]}
          >
            <Text style={styles.monthArrowText}>›</Text>
          </Pressable>
        </View>
        <Text style={styles.entryCount}>{entryCount} entries</Text>

        <View style={styles.searchField}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search note or category"
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable style={styles.clearSearch} onPress={() => setSearchQuery("")}>
              <Text style={styles.clearSearchText}>×</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.recurringFilterRow}>
          <Pressable
            onPress={() => setShowRecurringOnly((prev) => !prev)}
            style={[
              styles.recurringFilterChip,
              showRecurringOnly && styles.recurringFilterChipActive,
            ]}
          >
            <Text
              style={[
                styles.recurringFilterText,
                showRecurringOnly && styles.recurringFilterTextActive,
              ]}
            >
              Recurring only
            </Text>
          </Pressable>
        </View>

        <ScrollChips
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
          bottomSpacing={chipBottomSpacing}
        />

        <View style={styles.listWrapper}>
          {loading ? (
            <View style={styles.listCard}>
              {[0, 1, 2].map((row) => (
                <View key={`skeleton-${row}`} style={styles.skeletonRow}>
                  <View style={styles.skeletonIcon} />
                  <View style={styles.skeletonBody}>
                    <View style={styles.skeletonLineWide} />
                    <View style={styles.skeletonLine} />
                  </View>
                  <View style={styles.skeletonValue} />
                </View>
              ))}
            </View>
          ) : showEmptyMonth ? (
            <View style={[styles.emptyState, styles.listCard]}>
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptyCopy}>Log spending to see it appear here.</Text>
              <Pressable style={styles.primaryButton} onPress={openAddModal}>
                <Text style={styles.primaryButtonText}>Log spending</Text>
              </Pressable>
            </View>
          ) : showNoMatches ? (
            <View style={[styles.emptyState, styles.listCard]}>
              <Text style={styles.emptyTitle}>No matches found</Text>
              <Text style={styles.emptyCopy}>Try a different search or clear filters.</Text>
              <Pressable style={styles.secondaryButton} onPress={clearFilters}>
                <Text style={styles.secondaryButtonText}>Clear filters</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.listCard, styles.listCardExpanded]}>
              <SectionList
                style={styles.sectionList}
                sections={sections}
                keyExtractor={(item) => item.id}
                stickySectionHeadersEnabled={false}
                renderItem={renderTransactionRow}
                renderSectionHeader={({ section }) => {
                  const total = section.total;
                  const segments = total > 0
                    ? categoryOrder
                        .map((categoryId) => {
                          const amount = section.categoryTotals[categoryId];
                          if (!amount) {
                            return null;
                          }
                          const color = categoryAccent[categoryId]?.fill ?? "#0f172a";
                          return (
                            <View
                              key={`${section.dateKey}-${categoryId}`}
                              style={[styles.sectionBarSegment, { backgroundColor: color, flex: amount }]}
                            />
                          );
                        })
                        .filter(Boolean)
                    : [];
                  return (
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionHeaderTitle}>{section.title}</Text>
                        <Text style={styles.sectionHeaderValue}>{formatMoney(section.total)}</Text>
                      </View>
                      {total > 0 ? (
                        <View style={styles.sectionBarTrack}>{segments.length ? segments : null}</View>
                      ) : null}
                    </View>
                  );
                }}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
                SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
              />
            </View>
          )}
        </View>
      </SafeAreaView>
      <AddSpendingModal
        visible={modalVisible}
        mode={modalMode}
        initialValues={
          modalMode !== "add" && editingTx
            ? {
                amount: editingTx.amount,
                categoryId: editingTx.categoryId,
                subcategoryId: editingTx.subcategoryId,
                note: editingTx.note,
                date: new Date(editingTx.timestamp),
                isRecurring: Boolean(editingTx.isRecurringInstance),
                recurringDayOfMonth: editingTx.recurringDayOfMonth ?? undefined,
              }
            : undefined
        }
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        onEditRequest={modalMode === "view" ? handleOverviewEdit : undefined}
      />
      <AddIncomeModal
        visible={incomeModalVisible}
        onClose={closeIncomeModal}
        monthKey={activeMonthKey}
        currentDate={activeMonth?.currentDate ?? new Date().toISOString()}
        mode={incomeModalMode}
        initialIncome={editingIncome ?? undefined}
        onEditRequest={incomeModalMode === "view" ? handleIncomeOverviewEdit : undefined}
      />
    </>
  );
}

function ScrollChips({
  activeCategory,
  onSelect,
  bottomSpacing = 16,
}: {
  activeCategory: string | null;
  onSelect: (value: string | null) => void;
  bottomSpacing?: number;
}) {
  const chips = [{ id: null, label: "All" }, ...categoryConfig.categories.map((cat) => ({ id: cat.id, label: cat.label }))];
  return (
    <View style={{ marginBottom: bottomSpacing }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {chips.map((chip) => {
          const isActive = chip.id === activeCategory || (chip.id === null && activeCategory === null);
          return (
            <Pressable
              key={chip.id ?? "all"}
              onPress={() => {
                if (chip.id === null) {
                  onSelect(null);
                  return;
                }
                onSelect(isActive ? null : chip.id);
              }}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{chip.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function SwipeRow({
  children,
  onEdit,
  onDelete,
}: {
  children: ReactNode;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const actionWidth = 150;
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const openActions = () => {
    Animated.timing(translateX, { toValue: -actionWidth, duration: 200, useNativeDriver: true }).start(() => {
      isOpen.current = true;
    });
  };
  const closeActions = () => {
    Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      isOpen.current = false;
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => {
          if (gesture.dx < 0) {
            translateX.setValue(Math.max(gesture.dx, -actionWidth));
          } else if (!isOpen.current) {
            translateX.setValue(gesture.dx / 4);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -40) {
            openActions();
          } else {
            closeActions();
          }
        },
        onPanResponderTerminate: closeActions,
      }),
    [translateX],
  );

  return (
    <View style={styles.swipeContainer}>
      <View style={[styles.swipeStaticRow, { width: actionWidth }]}>
        <Pressable
          style={[styles.swipeStaticButton, styles.swipeStaticEdit]}
          onPress={() => {
            closeActions();
            onEdit();
          }}
        >
          <Text style={styles.swipeStaticText}>Edit</Text>
        </Pressable>
        <Pressable
          style={[styles.swipeStaticButton, styles.swipeStaticDelete]}
          onPress={() => {
            closeActions();
            onDelete();
          }}
        >
          <Text style={styles.swipeStaticText}>Delete</Text>
        </Pressable>
      </View>
      <Animated.View
        style={[styles.swipeContent, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 14,
    backgroundColor: "#f6f3ed",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontSize: 22,
    color: "#ffffff",
  },
  addMenuWrapper: {
    position: "relative",
    zIndex: 10,
  },
  addMenuBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  addMenuCard: {
    position: "absolute",
    top: 44,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 8,
    gap: 6,
    minWidth: 156,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 20,
  },
  addMenuOption: {
    borderRadius: 10,
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addMenuOptionSecondary: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  addMenuOptionPressed: {
    opacity: 0.85,
  },
  addMenuOptionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f8fafc",
    textAlign: "center",
  },
  addMenuOptionLabelSecondary: {
    color: "#111827",
  },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d6d3cd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  monthArrowDisabled: {
    opacity: 0.4,
  },
  monthArrowText: {
    fontSize: 18,
    color: "#111827",
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  entryCount: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
  },
  searchField: {
    position: "relative",
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#111827",
  },
  clearSearch: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  clearSearchText: {
    fontSize: 16,
    color: "#111827",
    marginTop: -2,
  },
  recurringFilterRow: {
    marginTop: 12,
    marginBottom: 8,
  },
  recurringFilterChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    backgroundColor: "#fff",
  },
  recurringFilterChipActive: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  recurringFilterText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  recurringFilterTextActive: {
    color: "#f8fafc",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipScroll: {
    flexGrow: 0,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    backgroundColor: "#fff",
  },
  chipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  chipTextActive: {
    color: "#fff",
  },
  listWrapper: {
    flex: 1,
  },
  listCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ede7dc",
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 14,
    marginBottom: 12,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  listCardExpanded: {
    flex: 1,
  },
  sectionList: {
    flex: 1,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  skeletonIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#f3ede1",
  },
  skeletonBody: {
    flex: 1,
    gap: 6,
  },
  skeletonLineWide: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "#f3ede1",
  },
  skeletonLine: {
    height: 10,
    width: "60%",
    borderRadius: 5,
    backgroundColor: "#f3ede1",
  },
  skeletonValue: {
    width: 60,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#f3ede1",
  },
  emptyState: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ede7dc",
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  emptyCopy: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#111827",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d4d4d8",
  },
  secondaryButtonText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 12,
    paddingTop: 4,
    paddingLeft: 4,
    paddingRight: 18,
  },
  sectionHeader: {
    paddingVertical: 12,
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  sectionHeaderValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  sectionBarTrack: {
    flexDirection: "row",
    height: 8,
    borderRadius: 999,
    backgroundColor: "#f3ede1",
    overflow: "hidden",
  },
  sectionBarSegment: {
    height: "100%",
  },
  itemSeparator: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginLeft: 58,
  },
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 2,
    paddingRight: 16,
    gap: 12,
  },
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  txIncomeIcon: {
    backgroundColor: "#ecfccb",
    borderWidth: 1,
    borderColor: "#a3e635",
  },
  txIconText: {
    fontSize: 20,
  },
  txInfo: {
    flex: 1,
    gap: 4,
  },
  txTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  txIncomeTitle: {
    color: "#15803d",
  },
  txSubtitle: {
    fontSize: 13,
    color: "#6b7280",
  },
  recurringBadge: {
    marginTop: 2,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
    backgroundColor: "#e0e7ff",
  },
  txRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  txIncomeAmount: {
    color: "#15803d",
  },
  swipeContainer: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 14,
    marginVertical: 2,
    backgroundColor: "#fff",
  },
  swipeStaticRow: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    overflow: "hidden",
  },
  swipeStaticButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  swipeStaticEdit: {
    backgroundColor: "#0d9488",
  },
  swipeStaticDelete: {
    backgroundColor: "#b91c1c",
  },
  swipeStaticText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  swipeContent: {
    backgroundColor: "#fff",
    borderRadius: 14,
  },
});
