import { useState, useCallback } from "react";
import type { TransactionEntry } from "@/components/dummy_data/transactions";
import type { IncomeEvent } from "@/components/budget/types";

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
  editingTx: TransactionEntry | null;
  openAddExpenseModal: () => void;
  openEditModal: (tx: TransactionEntry) => void;
  openOverviewModal: (tx: TransactionEntry) => void;
  handleModalClose: () => void;
  handleOverviewEdit: () => void;

  // Income modal
  incomeModalVisible: boolean;
  incomeModalMode: ModalMode;
  editingIncome: IncomeEvent | null;
  openAddIncomeModal: () => void;
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
  const [editingTx, setEditingTx] = useState<TransactionEntry | null>(null);

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

  const openEditModal = useCallback((tx: TransactionEntry) => {
    setModalMode("edit");
    setEditingTx(tx);
    setModalVisible(true);
  }, []);

  const openOverviewModal = useCallback((tx: TransactionEntry) => {
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
    closeIncomeModal,
    setIncomeModalMode,
    showAddMenu,
    setShowAddMenu,
  };
}
