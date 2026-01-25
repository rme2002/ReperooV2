import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { createExpenseTransaction } from "@/lib/gen/transactions/transactions";
import type { ModalMode } from "./useTransactionsModals";
import type { ListTransactions200Item } from "@/lib/gen/model";

/**
 * Submit payload type
 */
export interface TransactionSubmitPayload {
  amount: number;
  categoryId: string;
  subcategoryId?: string | null;
  note: string;
  date: Date;
  transactionTag?: "need" | "want";
  recurring?: { dayOfMonth: number };
}

/**
 * Return type for useTransactionActions hook
 */
export interface UseTransactionActionsReturn {
  savingExpense: boolean;
  handleSubmit: (payload: TransactionSubmitPayload) => Promise<void>;
  confirmDelete: (txId: string) => void;
}

/**
 * Custom hook for handling transaction actions
 * Manages submit and delete operations with loading states
 *
 * @param modalMode - Current modal mode
 * @param editingTx - Transaction being edited
 * @param userId - User ID from session
 * @param refetchTransactions - Function to refetch transactions after changes
 * @returns Object containing action handlers and loading state
 */
export function useTransactionActions(
  modalMode: ModalMode,
  editingTx: ListTransactions200Item | null,
  userId: string | undefined,
  refetchTransactions: () => Promise<void>
): UseTransactionActionsReturn {
  const [savingExpense, setSavingExpense] = useState(false);

  const handleSubmit = useCallback(
    async (payload: TransactionSubmitPayload) => {
      const isoDate = payload.date.toISOString();

      if (modalMode === "edit" && editingTx) {
        // TODO: Implement edit transaction API endpoint
        Alert.alert("Info", "Edit functionality coming soon!");
        return;
      }

      // Create expense transaction via API
      if (modalMode === "add" && userId) {
        setSavingExpense(true);
        try {
          const response = await createExpenseTransaction({
            user_id: userId,
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
            await refetchTransactions();
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
    },
    [modalMode, editingTx, userId, refetchTransactions]
  );

  const confirmDelete = useCallback((txId: string) => {
    Alert.alert(
      "Delete transaction",
      "Are you sure you want to delete this entry?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // TODO: Implement delete transaction API endpoint
            Alert.alert("Info", "Delete functionality coming soon!");
          },
        },
      ]
    );
  }, []);

  return {
    savingExpense,
    handleSubmit,
    confirmDelete,
  };
}
