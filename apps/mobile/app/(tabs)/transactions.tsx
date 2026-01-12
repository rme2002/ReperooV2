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
import { AddExpenseModal } from "@/components/modals/AddExpenseModal";
import { AddIncomeModal } from "@/components/modals/AddIncomeModal";
import type { LedgerMonth, TransactionEntry } from "@/components/dummy_data/transactions";
import { useCurrencyFormatter } from "@/components/profile/useCurrencyFormatter";
import { createExpenseTransaction, listTransactions } from "@/lib/gen/transactions/transactions";
import { useSupabaseAuthSync } from "@/hooks/useSupabaseAuthSync";
import type { ListTransactions200Item } from "@/lib/gen/model";
import type { IncomeEvent } from "@/components/budget/types";

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
  const { session } = useSupabaseAuthSync();

  // Generate months dynamically for month navigation
  const months = useMemo(() => {
    const result: LedgerMonth[] = [];
    const now = new Date();

    // Generate 12 months (current month and 11 previous months)
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 15);
      const key = `${date.toLocaleString('en-US', { month: 'short' }).toLowerCase()}-${date.getFullYear()}`;
      const label = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });

      result.push({
        key,
        label,
        currentDate: date.toISOString(),
        transactions: [], // Will be populated from API
      });
    }

    return result;
  }, []);

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
  const { formatCurrency } = useCurrencyFormatter();
  const [savingExpense, setSavingExpense] = useState(false);
  const [apiTransactions, setApiTransactions] = useState<TransactionEntry[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const formatMoney = (value: number) =>
    formatCurrency(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const activeMonth = months[monthIndex];
  const activeReference = new Date(activeMonth?.currentDate ?? Date.now());
  const activeMonthKey = activeMonth?.key ?? months[0].key;

  // Transform API transactions to local format (both expense and income)
  const transformApiTransaction = (apiTx: ListTransactions200Item): TransactionEntry | null => {
    if (apiTx.type === "expense") {
      return {
        id: apiTx.id?.toString() ?? `api-${Date.now()}`,
        kind: "expense",
        amount: apiTx.amount,
        categoryId: apiTx.expense_category_id,
        subcategoryId: apiTx.expense_subcategory_id ?? undefined,
        note: apiTx.notes ?? undefined,
        timestamp: apiTx.occurred_at,
        isRecurringInstance: false,
        recurringDayOfMonth: null,
      };
    } else if (apiTx.type === "income") {
      return {
        id: apiTx.id?.toString() ?? `api-${Date.now()}`,
        kind: "income",
        amount: apiTx.amount,
        incomeCategoryId: apiTx.income_category_id,
        note: apiTx.notes ?? undefined,
        timestamp: apiTx.occurred_at,
        isRecurringInstance: false,
        recurringDayOfMonth: null,
      };
    }

    return null;
  };

  // Fetch transactions from API
  const fetchTransactions = async () => {
    if (!session?.user?.id) {
      setApiTransactions([]);
      return;
    }

    setLoading(true);
    setFetchError(null);

    try {
      // Calculate date range for the current month
      const currentDate = new Date(activeMonth?.currentDate ?? Date.now());
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      const response = await listTransactions({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      if (response.status === 200) {
        const transformed = response.data.map(transformApiTransaction).filter((tx): tx is TransactionEntry => tx !== null);
        setApiTransactions(transformed);
      } else {
        setFetchError("Failed to load transactions");
        setApiTransactions([]);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setFetchError("Failed to load transactions");
      setApiTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Use API transactions
  const monthTransactions = apiTransactions;

  // Fetch transactions when component mounts or month changes
  useEffect(() => {
    fetchTransactions();
  }, [monthIndex, session?.user?.id]);

  const filteredTransactions = useMemo(() => {
    const base = monthTransactions.slice();
    const query = searchQuery.trim().toLowerCase();
    const filtered = base.filter((tx) => {
      // For expense transactions, filter by category
      if (tx.kind === "expense") {
        if (activeCategory && tx.categoryId !== activeCategory) {
          return false;
        }
        if (!query) {
          return true;
        }
        const searchTarget = `${getCategoryLabel(tx.categoryId).toLowerCase()} ${(getSubcategoryLabel(tx.categoryId, tx.subcategoryId) ?? "").toLowerCase()} ${(tx.note ?? "").toLowerCase()}`;
        return searchTarget.includes(query);
      }
      // For income transactions, skip category filter and just search notes
      if (tx.kind === "income") {
        if (activeCategory) {
          return false; // Income doesn't match expense categories
        }
        if (!query) {
          return true;
        }
        const searchTarget = `income ${tx.incomeCategoryId.toLowerCase()} ${(tx.note ?? "").toLowerCase()}`;
        return searchTarget.includes(query);
      }
      return true;
    });
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return filtered;
  }, [monthTransactions, activeCategory, searchQuery]);

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
      section.total += tx.amount;
      // Only track category totals for expenses
      if (tx.kind === "expense") {
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

  const openAddExpenseModal = () => {
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

  const openEditModal = (tx: TransactionEntry) => {
    setModalMode("edit");
    setEditingTx(tx);
    setModalVisible(true);
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


  const handleModalSubmit = async (payload: {
    amount: number;
    categoryId: string;
    subcategoryId?: string | null;
    note: string;
    date: Date;
    transactionTag?: "need" | "want";
    recurring?: { dayOfMonth: number };
  }) => {
    const isoDate = payload.date.toISOString();

    if (modalMode === "edit" && editingTx) {
      // TODO: Implement edit transaction API endpoint
      Alert.alert("Info", "Edit functionality coming soon!");
      return;
    }

    // Create expense transaction via API
    if (modalMode === "add" && session?.user?.id) {
      setSavingExpense(true);
      try {
        const response = await createExpenseTransaction({
          user_id: session.user.id,
          occurred_at: isoDate,
          amount: payload.amount,
          notes: payload.note || null,
          type: "expense",
          transaction_tag: payload.transactionTag || "want",
          expense_category_id: payload.categoryId,
          expense_subcategory_id: payload.subcategoryId || null,
        });

        if (response.status === 201) {
          Alert.alert("Success", "Expense created successfully!");

          // Refresh transactions from API
          await fetchTransactions();
        } else {
          Alert.alert("Error", "Failed to create expense transaction");
        }
      } catch (error) {
        console.error("Error creating expense:", error);
        Alert.alert("Error", "Failed to create expense transaction");
      } finally {
        setSavingExpense(false);
      }
    }
  };

  const confirmDelete = (txId: string) => {
    Alert.alert("Delete transaction", "Are you sure you want to delete this entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          // TODO: Implement delete transaction API endpoint
          Alert.alert("Info", "Delete functionality coming soon!");
        },
      },
    ]);
  };

  const clearFilters = () => {
    setActiveCategory(null);
    setSearchQuery("");
  };

  const renderTransactionRow = ({ item }: { item: TransactionEntry; section: TransactionSection }) => {
    const showRecurringBadge = Boolean(item.isRecurringInstance);

    if (item.kind === "income") {
      // Render income transaction
      const displayAmount = formatMoney(item.amount);
      const subtitleParts: string[] = [];
      if (item.incomeCategoryId) subtitleParts.push(item.incomeCategoryId);
      if (item.note) subtitleParts.push(item.note);
      const subtitle = subtitleParts.join(" · ");

      return (
        <SwipeRow onEdit={() => openEditModal(item)} onDelete={() => confirmDelete(item.id)}>
          <Pressable style={styles.txRow} onPress={() => openOverviewModal(item)}>
            <View style={styles.txLeft}>
              <View style={[styles.txIcon, styles.txIncomeIcon]}>
                <Text style={styles.txIconText}>💰</Text>
              </View>
              <View style={styles.txInfo}>
                <Text style={[styles.txTitle, styles.txIncomeTitle]}>Income</Text>
                {subtitle ? <Text style={styles.txSubtitle}>{subtitle}</Text> : null}
                {showRecurringBadge ? <Text style={styles.recurringBadge}>Recurring</Text> : null}
              </View>
            </View>
            <View style={styles.txRight}>
              <Text style={[styles.txAmount, styles.txIncomeAmount]}>+{displayAmount}</Text>
            </View>
          </Pressable>
        </SwipeRow>
      );
    }

    // Render expense transaction
    const categoryMeta = categoryAccent[item.categoryId] ?? { bg: "#e2e8f0", fill: "#0f172a" };
    const subcategoryLabel = getSubcategoryLabel(item.categoryId, item.subcategoryId);
    const categoryLabel = getCategoryLabel(item.categoryId);
    const subtitleParts: string[] = [];
    if (subcategoryLabel) subtitleParts.push(subcategoryLabel);
    if (item.note) subtitleParts.push(item.note);
    const subtitle = subtitleParts.join(" · ");
    const displayAmount = formatMoney(item.amount);

    return (
      <SwipeRow onEdit={() => openEditModal(item)} onDelete={() => confirmDelete(item.id)}>
        <Pressable style={styles.txRow} onPress={() => openOverviewModal(item)}>
          <View style={styles.txLeft}>
            <View style={[styles.txIcon, { backgroundColor: categoryMeta.bg }]}>
              <Text style={styles.txIconText}>{getCategoryIcon(item.categoryId)}</Text>
            </View>
            <View style={styles.txInfo}>
              <Text style={styles.txTitle}>{categoryLabel}</Text>
              {subtitle ? <Text style={styles.txSubtitle}>{subtitle}</Text> : null}
              {showRecurringBadge ? <Text style={styles.recurringBadge}>Recurring</Text> : null}
            </View>
          </View>
          <View style={styles.txRight}>
            <Text style={styles.txAmount}>{displayAmount}</Text>
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
            <Pressable
              style={styles.addButton}
              onPress={() => setShowAddMenu(!showAddMenu)}
            >
              <Text style={styles.addButtonText}>＋</Text>
            </Pressable>
            {showAddMenu ? (
              <View style={styles.addMenuCard}>
                <Pressable
                  style={styles.addMenuOption}
                  onPress={openAddExpenseModal}
                >
                  <Text style={styles.addMenuOptionLabel}>Add Expense</Text>
                </Pressable>
                <Pressable
                  style={[styles.addMenuOption, styles.addMenuOptionSecondary]}
                  onPress={openAddIncomeModal}
                >
                  <Text style={[styles.addMenuOptionLabel, styles.addMenuOptionLabelSecondary]}>
                    Add Income
                  </Text>
                </Pressable>
              </View>
            ) : null}
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

        <ScrollChips
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
          bottomSpacing={chipBottomSpacing}
        />

        <View style={styles.listWrapper}>
          {fetchError ? (
            <View style={[styles.emptyState, styles.listCard]}>
              <Text style={styles.emptyTitle}>Error loading transactions</Text>
              <Text style={styles.emptyCopy}>{fetchError}</Text>
              <Pressable style={styles.primaryButton} onPress={fetchTransactions}>
                <Text style={styles.primaryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : loading ? (
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
              <Pressable style={styles.primaryButton} onPress={openAddExpenseModal}>
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
              />
            </View>
          )}
        </View>
      </SafeAreaView>
      <AddExpenseModal
        visible={modalVisible}
        mode={modalMode}
        initialValues={
          modalMode !== "add" && editingTx && editingTx.kind === "expense"
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
        isSaving={savingExpense}
      />
      <AddIncomeModal
        visible={incomeModalVisible}
        monthKey={activeMonthKey}
        currentDate={activeReference.toISOString()}
        onClose={() => {
          setIncomeModalVisible(false);
          setEditingIncome(null);
          setIncomeModalMode("add");
          fetchTransactions();
        }}
        mode={incomeModalMode}
        initialIncome={editingIncome}
        onEditRequest={incomeModalMode === "view" ? () => setIncomeModalMode("edit") : undefined}
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
