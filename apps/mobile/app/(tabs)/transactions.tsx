import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

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

// Sections
import { TransactionListSection } from "@/components/transactions/sections/TransactionListSection";

// Custom hooks
import { useTransactionsMonthNavigation } from "@/hooks/useTransactionsMonthNavigation";
import { useTransactionsData } from "@/hooks/useTransactionsData";
import { useTransactionsFiltering } from "@/hooks/useTransactionsFiltering";
import { useTransactionsSections } from "@/hooks/useTransactionsSections";
import { useTransactionsModals } from "@/hooks/useTransactionsModals";
import { useTransactionActions } from "@/hooks/useTransactionActions";

export default function TransactionsScreen() {
  const { height } = useWindowDimensions();
  const { session } = useSupabaseAuthSync();
  const { formatCurrency } = useCurrencyFormatter();

  // Month navigation
  const {
    monthIndex,
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
  } = useTransactionsData(activeMonth?.currentDate ?? new Date().toISOString(), session?.user?.id);

  // Category helpers
  const categoryLookup = useMemo(
    () => new Map(expenseCategories.map((cat) => [cat.id, cat])),
    [expenseCategories]
  );

  const categoryOrder = useMemo(
    () => expenseCategories.map((cat) => cat.id),
    [expenseCategories]
  );

  const incomeCategoryLookup = useMemo(
    () => new Map(incomeCategories.map((cat) => [cat.id, cat])),
    [incomeCategories]
  );

  const getCategoryLabel = (categoryId: string) =>
    categoryLookup.get(categoryId)?.label ?? categoryId;

  const getSubcategoryLabel = (categoryId: string, subId?: string) => {
    if (!subId) return null;
    const category = categoryLookup.get(categoryId);
    return category?.subcategories?.find((sub) => sub.id === subId)?.label ?? subId;
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
    getIncomeCategoryLabel
  );

  // Sections
  const { sections, showEmptyMonth, showNoMatches } = useTransactionsSections(
    filteredTransactions,
    apiTransactions,
    activeReference,
    loading
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
    refetch
  );

  // Format helpers
  const formatMoney = (value: number) =>
    formatCurrency(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const chipBottomSpacing = Math.max(12, Math.min(height * 0.035, 40));

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
          onToggle={() => setShowRecurringOnly((prev) => !prev)}
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
            <TransactionListSection
              sections={sections}
              categoryOrder={categoryOrder}
              getCategoryLabel={getCategoryLabel}
              getSubcategoryLabel={getSubcategoryLabel}
              getIncomeCategoryLabel={getIncomeCategoryLabel}
              formatMoney={formatMoney}
              onEdit={openEditModal}
              onDelete={confirmDelete}
              onPress={openOverviewModal}
            />
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
        onSubmit={handleSubmit}
        onEditRequest={modalMode === "view" ? handleOverviewEdit : undefined}
        isSaving={savingExpense}
      />

      <AddIncomeModal
        visible={incomeModalVisible}
        monthKey={activeMonthKey}
        currentDate={activeReference.toISOString()}
        onClose={() => {
          closeIncomeModal();
          refetch();
        }}
        mode={incomeModalMode}
        initialIncome={null}
        onEditRequest={incomeModalMode === "view" ? () => setIncomeModalMode("edit") : undefined}
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
