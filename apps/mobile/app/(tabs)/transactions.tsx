import { useCallback, useMemo, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import type { SectionList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";
import { getUTCDateKey } from "@/utils/dateHelpers";

// Modals
import { AddExpenseModal } from "@/components/modals/AddExpenseModal";
import { AddIncomeModal } from "@/components/modals/AddIncomeModal";

// Contexts
import { useSupabaseAuthSync } from "@/hooks/useSupabaseAuthSync";
import { useCurrencyFormatter } from "@/components/profile/useCurrencyFormatter";

// State components
import { LoadingState } from "@/components/transactions/states/LoadingState";
import { ErrorState } from "@/components/transactions/states/ErrorState";
import { EmptyMonthState } from "@/components/transactions/states/EmptyMonthState";
import { NoMatchesState } from "@/components/transactions/states/NoMatchesState";

// Widgets
import { TransactionsMonthNavigator } from "@/components/transactions/widgets/TransactionsMonthNavigator";
import { SearchBar } from "@/components/transactions/widgets/SearchBar";
import { RecurringFilterToggle } from "@/components/transactions/widgets/RecurringFilterToggle";
import { CategoryFilterChips } from "@/components/transactions/widgets/CategoryFilterChips";
import { AddTransactionMenu } from "@/components/transactions/widgets/AddTransactionMenu";
import { JumpToTodayButton } from "@/components/transactions/widgets/JumpToTodayButton";

// Sections
import { TransactionListSection } from "@/components/transactions/sections/TransactionListSection";

// Custom hooks
import { useTransactionsMonthNavigation } from "@/hooks/useTransactionsMonthNavigation";
import { useTransactionsData } from "@/hooks/useTransactionsData";
import { useTransactionsFiltering } from "@/hooks/useTransactionsFiltering";
import { useTransactionsSections } from "@/hooks/useTransactionsSections";
import { useTransactionsModals } from "@/hooks/useTransactionsModals";
import { useTransactionActions } from "@/hooks/useTransactionActions";
import { useTransactionRefresh } from "@/hooks/useTransactionRefresh";

export default function TransactionsScreen() {
  const { height } = useWindowDimensions();
  const { session } = useSupabaseAuthSync();
  const { formatCurrency } = useCurrencyFormatter();
  const sectionListRef = useRef<SectionList>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Month navigation
  const {
    activeMonth,
    activeReference,
    activeMonthKey,
    goPrevious,
    goNext,
    canGoPrevious,
    canGoNext,
  } = useTransactionsMonthNavigation();

  // Data fetching
  const {
    apiTransactions,
    expenseCategories,
    incomeCategories,
    loading,
    error,
    refetch,
  } = useTransactionsData(
    activeMonth?.currentDate ?? new Date().toISOString(),
    session?.user?.id,
  );

  const refreshTransactionData = useTransactionRefresh();

  // Category helpers
  const categoryLookup = useMemo(
    () => new Map(expenseCategories.map((cat) => [cat.id, cat])),
    [expenseCategories],
  );

  const categoryOrder = useMemo(
    () => expenseCategories.map((cat) => cat.id),
    [expenseCategories],
  );

  const incomeCategoryLookup = useMemo(
    () => new Map(incomeCategories.map((cat) => [cat.id, cat])),
    [incomeCategories],
  );

  const getCategoryLabel = (categoryId: string) =>
    categoryLookup.get(categoryId)?.label ?? categoryId;

  const getSubcategoryLabel = (categoryId: string, subId?: string) => {
    if (!subId) return null;
    const category = categoryLookup.get(categoryId);
    return (
      category?.subcategories?.find((sub) => sub.id === subId)?.label ?? subId
    );
  };

  const getIncomeCategoryLabel = (categoryId: string) =>
    incomeCategoryLookup.get(categoryId)?.label ?? categoryId;

  // Filtering
  const {
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    showRecurringOnly,
    setShowRecurringOnly,
    filteredTransactions,
    clearFilters,
  } = useTransactionsFiltering(
    apiTransactions,
    getCategoryLabel,
    getSubcategoryLabel,
    getIncomeCategoryLabel,
  );

  // Sections
  const { sections, showEmptyMonth, showNoMatches } = useTransactionsSections(
    filteredTransactions,
    apiTransactions,
    activeReference,
    loading,
  );

  // Modals
  const {
    modalVisible,
    modalMode,
    editingTx,
    openAddExpenseModal,
    openEditModal,
    openOverviewModal,
    handleModalClose,
    handleOverviewEdit,
    incomeModalVisible,
    incomeModalMode,
    closeIncomeModal,
    setIncomeModalMode,
    showAddMenu,
    setShowAddMenu,
    openAddIncomeModal,
  } = useTransactionsModals();

  // Actions
  const { savingExpense, handleSubmit, confirmDelete } = useTransactionActions(
    modalMode,
    editingTx,
    session?.user?.id,
    refetch,
  );

  const handleTransactionSuccess = useCallback(
    async (date: Date) => {
      await Promise.allSettled([refetch(), refreshTransactionData({ date })]);
    },
    [refetch, refreshTransactionData],
  );

  const handleRefresh = useCallback(async () => {
    if (refreshing) return; // Prevent concurrent refreshes

    setRefreshing(true);
    try {
      await Promise.allSettled([
        refetch(), // Fetches transactions + recurring templates
        refreshTransactionData({ date: activeMonth?.currentDate }),
      ]);
    } catch (error) {
      console.error("[Transactions] Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, refetch, refreshTransactionData, activeMonth]);

  // Format helpers
  const formatMoney = (value: number) =>
    formatCurrency(value, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const chipBottomSpacing = Math.max(12, Math.min(height * 0.035, 40));

  // Jump to Today functionality
  const todaySectionIndex = useMemo(() => {
    const todayKey = getUTCDateKey(new Date());
    return sections.findIndex((section) => section.dateKey === todayKey);
  }, [sections]);

  const handleJumpToToday = useCallback(() => {
    if (todaySectionIndex !== -1 && sectionListRef.current) {
      sectionListRef.current.scrollToLocation({
        sectionIndex: todaySectionIndex,
        itemIndex: 0,
        animated: true,
        viewPosition: 0,
      });
    }
  }, [todaySectionIndex]);

  const showJumpButton = todaySectionIndex !== -1;

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={handleRefresh}
        tintColor={colors.primary}
        colors={[colors.primary]}
      />
    ),
    [refreshing, handleRefresh],
  );

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <AddTransactionMenu
          visible={showAddMenu}
          onAddExpense={openAddExpenseModal}
          onAddIncome={openAddIncomeModal}
          onClose={() => setShowAddMenu(false)}
        />

        <View style={styles.header}>
          <Text style={styles.title}>Transactions</Text>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.addButton}
              onPress={() => setShowAddMenu(!showAddMenu)}
            >
              <Text style={styles.addButtonText}>＋</Text>
            </Pressable>
          </View>
        </View>

        <TransactionsMonthNavigator
          monthLabel={activeMonth?.label ?? "Month"}
          entryCount={apiTransactions.length}
          onPrevious={goPrevious}
          onNext={goNext}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
        />

        <SearchBar value={searchQuery} onChangeText={setSearchQuery} />

        <RecurringFilterToggle
          showRecurringOnly={showRecurringOnly}
          onToggle={() => setShowRecurringOnly(!showRecurringOnly)}
        />

        <CategoryFilterChips
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
          bottomSpacing={chipBottomSpacing}
          categories={expenseCategories}
        />

        <View style={styles.listWrapper}>
          {error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : loading ? (
            <LoadingState />
          ) : showEmptyMonth ? (
            <EmptyMonthState onAddTransaction={openAddExpenseModal} />
          ) : showNoMatches ? (
            <NoMatchesState onClearFilters={clearFilters} />
          ) : (
            <>
              <TransactionListSection
                ref={sectionListRef}
                sections={sections}
                categoryOrder={categoryOrder}
                getCategoryLabel={getCategoryLabel}
                getSubcategoryLabel={getSubcategoryLabel}
                getIncomeCategoryLabel={getIncomeCategoryLabel}
                formatMoney={formatMoney}
                onEdit={openEditModal}
                onDelete={confirmDelete}
                onPress={openOverviewModal}
                refreshControl={refreshControl}
              />
              <JumpToTodayButton
                visible={showJumpButton}
                onPress={handleJumpToToday}
              />
            </>
          )}
        </View>
      </SafeAreaView>

      <AddExpenseModal
        visible={modalVisible}
        mode={modalMode}
        initialValues={
          modalMode !== "add" && editingTx && editingTx.type === "expense"
            ? {
                amount: editingTx.amount,
                categoryId: editingTx.expense_category_id,
                subcategoryId: editingTx.expense_subcategory_id ?? undefined,
                note: editingTx.notes ?? undefined,
                date: new Date(editingTx.occurred_at),
                isRecurring: Boolean(editingTx.recurring_template_id),
                transactionTag:
                  editingTx.transaction_tag === "need" ||
                  editingTx.transaction_tag === "want"
                    ? editingTx.transaction_tag
                    : undefined,
              }
            : undefined
        }
        onClose={handleModalClose}
        onSubmit={handleSubmit}
        onSuccess={handleTransactionSuccess}
        onEditRequest={modalMode === "view" ? handleOverviewEdit : undefined}
        isSaving={savingExpense}
      />

      <AddIncomeModal
        visible={incomeModalVisible}
        monthKey={activeMonthKey}
        currentDate={activeReference.toISOString()}
        onClose={() => {
          closeIncomeModal();
        }}
        onSuccess={handleTransactionSuccess}
        mode={incomeModalMode}
        initialIncome={null}
        onEditRequest={
          incomeModalMode === "view"
            ? () => setIncomeModalMode("edit")
            : undefined
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 14,
    backgroundColor: colors.background,
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
    color: colors.text,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontSize: 22,
    color: colors.textLight,
  },
  listWrapper: {
    flex: 1,
  },
});
