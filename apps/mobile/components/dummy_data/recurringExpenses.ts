import type { RecurringExpenseTemplate } from "@/components/transactions/recurring";

export const recurringExpensesSeed: RecurringExpenseTemplate[] = [
  {
    id: "rec-rent-2025",
    amount: 1250,
    categoryId: "essentials",
    subcategoryId: "housing",
    note: "Apartment rent",
    startDate: "2025-11-01",
    dayOfMonth: 1,
    totalOccurrences: undefined,
    skippedDateKeys: [],
    isPaused: false,
  },
  {
    id: "rec-music-2025",
    amount: 14.99,
    categoryId: "lifestyle",
    subcategoryId: "entertainment",
    note: "Music subscription",
    startDate: "2025-10-15",
    dayOfMonth: 15,
    totalOccurrences: 12,
    skippedDateKeys: [],
    isPaused: false,
  },
];
