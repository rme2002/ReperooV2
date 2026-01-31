import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { dateToLocalDateString } from "@/utils/timezoneUtils";
import {
  createExpenseTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/lib/gen/transactions/transactions";
import { deleteRecurringTemplate } from "@/lib/gen/recurring-templates/recurring-templates";
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
  confirmDelete: (txId: string, transaction?: ListTransactions200Item) => void;
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
      const localDate = dateToLocalDateString(payload.date);

      if (modalMode === "edit" && editingTx) {
        if (editingTx.type !== "expense") {
          Alert.alert("Error", "Only expense edits are supported here.");
          return;
        }
        setSavingExpense(true);
        try {
          const response = await updateTransaction(editingTx.id, {
            type: "expense",
            occurred_at: localDate,
            amount: payload.amount,
            notes: payload.note || null,
            transaction_tag: payload.transactionTag || "want",
            expense_category_id: payload.categoryId,
            expense_subcategory_id: payload.subcategoryId ?? null,
          });

          if (response.status === 200) {
            Alert.alert("Success", "Expense updated successfully!");
            await refetchTransactions();
          } else {
            Alert.alert("Error", "Failed to update expense transaction");
          }
        } catch (error) {
          console.error("Error updating expense:", error);
          Alert.alert("Error", "Failed to update expense transaction");
        } finally {
          setSavingExpense(false);
        }
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

  const confirmDelete = useCallback(
    (txId: string, transaction?: ListTransactions200Item) => {
      const isRecurring = Boolean(transaction?.recurring_template_id);
      const title = isRecurring
        ? "Delete Recurring Transaction"
        : "Delete Transaction";
      const message = isRecurring
        ? "This will delete this transaction and stop all future occurrences. Are you sure?"
        : "Are you sure you want to delete this transaction?";

      Alert.alert(title, message, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await deleteTransaction(txId);

              if (response.status === 204) {
                if (isRecurring && transaction?.recurring_template_id) {
                  try {
                    await deleteRecurringTemplate(
                      transaction.recurring_template_id
                    );
                  } catch (templateError) {
                    console.error(
                      "Failed to delete recurring template:",
                      templateError
                    );
                  }
                }

                Alert.alert("Success", "Transaction deleted successfully");
                await refetchTransactions();
                return;
              }

              throw new Error(`Unexpected response status: ${response.status}`);
            } catch (error) {
              console.error("Delete error:", error);
              Alert.alert(
                "Error",
                "Failed to delete transaction. Please try again."
              );
            }
          },
        },
      ]);
    },
    [refetchTransactions]
  );

  return {
    savingExpense,
    handleSubmit,
    confirmDelete,
  };
}
