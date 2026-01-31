import { generateTransactionsCSV } from "../csvExport";
import type { ListTransactions200Item } from "@/lib/gen/model";

describe("generateTransactionsCSV", () => {
  const mockFormatters = {
    getCategoryLabel: (id: string) => `Category-${id}`,
    getSubcategoryLabel: (catId: string, subId?: string) =>
      subId ? `Sub-${subId}` : null,
    getIncomeCategoryLabel: (id: string) => `Income-${id}`,
    formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
  };

  it("should generate CSV with correct headers", () => {
    const csv = generateTransactionsCSV([], mockFormatters);
    expect(csv).toContain("Date,Type,Category,Subcategory,Amount,Tag,Notes,Recurring");
  });

  it("should generate CSV for expense transaction", () => {
    const transactions: ListTransactions200Item[] = [
      {
        type: "expense",
        user_id: "user1",
        occurred_at: "2024-01-15T10:00:00Z",
        amount: 45.5,
        notes: "Test expense",
        expense_category_id: "cat1",
        expense_subcategory_id: "sub1",
        transaction_tag: "want",
      },
    ];

    const csv = generateTransactionsCSV(transactions, mockFormatters);
    expect(csv).toContain("Expense");
    expect(csv).toContain("Category-cat1");
    expect(csv).toContain("Sub-sub1");
    expect(csv).toContain("$45.50");
    expect(csv).toContain("Want");
    expect(csv).toContain("Test expense");
    expect(csv).toContain("No"); // Not recurring
  });

  it("should generate CSV for income transaction", () => {
    const transactions: ListTransactions200Item[] = [
      {
        type: "income",
        user_id: "user1",
        occurred_at: "2024-01-14T10:00:00Z",
        amount: 3500,
        income_category_id: "inc1",
        recurring_template_id: "rec1",
      },
    ];

    const csv = generateTransactionsCSV(transactions, mockFormatters);
    expect(csv).toContain("Income");
    expect(csv).toContain("Income-inc1");
    expect(csv).toContain("$3500.00");
    expect(csv).toContain("N/A"); // Tag
    expect(csv).toContain("Yes"); // Recurring
  });

  it("should escape CSV fields with commas", () => {
    const transactions: ListTransactions200Item[] = [
      {
        type: "expense",
        user_id: "user1",
        occurred_at: "2024-01-15T10:00:00Z",
        amount: 45.5,
        notes: "Lunch with team, great food",
        expense_category_id: "cat1",
        transaction_tag: "want",
      },
    ];

    const csv = generateTransactionsCSV(transactions, mockFormatters);
    expect(csv).toContain('"Lunch with team, great food"');
  });

  it("should escape CSV fields with quotes", () => {
    const transactions: ListTransactions200Item[] = [
      {
        type: "expense",
        user_id: "user1",
        occurred_at: "2024-01-15T10:00:00Z",
        amount: 45.5,
        notes: 'Said "hello" to friend',
        expense_category_id: "cat1",
        transaction_tag: "want",
      },
    ];

    const csv = generateTransactionsCSV(transactions, mockFormatters);
    expect(csv).toContain('"Said ""hello"" to friend"');
  });

  it("should handle null/undefined notes", () => {
    const transactions: ListTransactions200Item[] = [
      {
        type: "expense",
        user_id: "user1",
        occurred_at: "2024-01-15T10:00:00Z",
        amount: 45.5,
        notes: null,
        expense_category_id: "cat1",
        transaction_tag: "need",
      },
    ];

    const csv = generateTransactionsCSV(transactions, mockFormatters);
    const lines = csv.split("\n");
    expect(lines[1]).toContain("Need");
    // Notes field should be empty but present
    expect(lines[1].split(",").length).toBe(8);
  });
});
