import { useState, useCallback } from "react";
import type { IncomeEvent } from "@/components/budget/types";
import type { ListTransactions200Item } from "@/lib/gen/model";

/**
 * Modal mode type
 */
export type ModalMode = "add" | "edit" | "view";

/**
 * Return type for useTransactionsModals hook
 */
export interface UseTransactionsModalsReturn {
  // Expense modal
  modalVisible: boolean;
  modalMode: ModalMode;
  editingTx: ListTransactions200Item | null;
  openAddExpenseModal: () => void;
  openEditModal: (tx: ListTransactions200Item) => void;
  openOverviewModal: (tx: ListTransactions200Item) => void;
  handleModalClose: () => void;
  handleOverviewEdit: () => void;

  // Income modal
  incomeModalVisible: boolean;
  incomeModalMode: ModalMode;
  editingIncome: IncomeEvent | null;
  openAddIncomeModal: () => void;
  openEditIncomeModal: (income: IncomeEvent) => void;
  openIncomeOverviewModal: (income: IncomeEvent) => void;
  closeIncomeModal: () => void;
  setIncomeModalMode: (mode: ModalMode) => void;

  // Add menu
  showAddMenu: boolean;
  setShowAddMenu: (show: boolean) => void;
}

/**
 * Custom hook for managing all modal states in transactions screen
 * Handles expense modal, income modal, and add menu
 *
 * @returns Object containing modal states and control functions
 */
export function useTransactionsModals(): UseTransactionsModalsReturn {
  // Expense modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [editingTx, setEditingTx] = useState<ListTransactions200Item | null>(
    null
  );

  // Income modal states
  const [incomeModalVisible, setIncomeModalVisible] = useState(false);
  const [incomeModalMode, setIncomeModalMode] = useState<ModalMode>("add");
  const [editingIncome, setEditingIncome] = useState<IncomeEvent | null>(null);

  // Add menu state
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Expense modal handlers
  const openAddExpenseModal = useCallback(() => {
    setShowAddMenu(false);
    setModalMode("add");
    setEditingTx(null);
    setModalVisible(true);
  }, []);

  const openEditModal = useCallback((tx: ListTransactions200Item) => {
    setModalMode("edit");
    setEditingTx(tx);
    setModalVisible(true);
  }, []);

  const openOverviewModal = useCallback((tx: ListTransactions200Item) => {
    setModalMode("view");
    setEditingTx(tx);
    setModalVisible(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalVisible(false);
    setEditingTx(null);
    setModalMode("add");
  }, []);

  const handleOverviewEdit = useCallback(() => {
    if (!editingTx) {
      return;
    }
    setModalMode("edit");
  }, [editingTx]);

  // Income modal handlers
  const openAddIncomeModal = useCallback(() => {
    setShowAddMenu(false);
    setIncomeModalMode("add");
    setEditingIncome(null);
    setIncomeModalVisible(true);
  }, []);

  const openEditIncomeModal = useCallback((income: IncomeEvent) => {
    setShowAddMenu(false);
    setIncomeModalMode("edit");
    setEditingIncome(income);
    setIncomeModalVisible(true);
  }, []);

  const openIncomeOverviewModal = useCallback((income: IncomeEvent) => {
    setIncomeModalMode("view");
    setEditingIncome(income);
    setIncomeModalVisible(true);
  }, []);

  const closeIncomeModal = useCallback(() => {
    setIncomeModalVisible(false);
    setEditingIncome(null);
    setIncomeModalMode("add");
  }, []);

  return {
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
    editingIncome,
    openAddIncomeModal,
    openEditIncomeModal,
    openIncomeOverviewModal,
    closeIncomeModal,
    setIncomeModalMode,
    showAddMenu,
    setShowAddMenu,
  };
}
