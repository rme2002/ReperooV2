import type { ListTransactions200Item } from "@/lib/gen/model";

/**
 * Escapes a CSV field value by:
 * - Wrapping in quotes if it contains commas, quotes, or newlines
 * - Doubling any quotes inside the value
 */
function escapeCSVField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";

  const str = String(value);

  // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Formats a date string to human-readable format
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface CSVFormatters {
  getCategoryLabel: (id: string) => string;
  getSubcategoryLabel: (categoryId: string, subId?: string) => string | null;
  getIncomeCategoryLabel: (id: string) => string;
  formatCurrency: (amount: number) => string;
}

/**
 * Generates CSV content from transaction data
 *
 * CSV Structure: Date, Type, Category, Subcategory, Amount, Tag, Notes, Recurring
 */
export function generateTransactionsCSV(
  transactions: ListTransactions200Item[],
  formatters: CSVFormatters,
): string {
  const { getCategoryLabel, getSubcategoryLabel, getIncomeCategoryLabel, formatCurrency } = formatters;

  // CSV Header
  const headers = ["Date", "Type", "Category", "Subcategory", "Amount", "Tag", "Notes", "Recurring"];
  let csv = headers.join(",") + "\n";

  // Add each transaction as a row
  for (const tx of transactions) {
    const date = formatDate(tx.occurred_at);
    const type = tx.type === "expense" ? "Expense" : "Income";

    let category = "";
    let subcategory = "";
    let tag = "N/A";

    if (tx.type === "expense") {
      category = getCategoryLabel(tx.expense_category_id);
      subcategory = getSubcategoryLabel(tx.expense_category_id, tx.expense_subcategory_id ?? undefined) ?? "";
      tag = tx.transaction_tag === "need" ? "Need" : "Want";
    } else {
      category = getIncomeCategoryLabel(tx.income_category_id);
      subcategory = "";
      tag = "N/A";
    }

    const amount = formatCurrency(tx.amount);
    const notes = tx.notes ?? "";
    const recurring = tx.recurring_template_id ? "Yes" : "No";

    // Build row with proper CSV escaping
    const row = [
      escapeCSVField(date),
      escapeCSVField(type),
      escapeCSVField(category),
      escapeCSVField(subcategory),
      escapeCSVField(amount),
      escapeCSVField(tag),
      escapeCSVField(notes),
      escapeCSVField(recurring),
    ];

    csv += row.join(",") + "\n";
  }

  return csv;
}
