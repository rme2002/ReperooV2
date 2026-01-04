import type { LedgerEntry } from "@/src/features/budget/types";

export type TransactionEntry = LedgerEntry;

export type LedgerMonth = {
  key: string;
  label: string;
  currentDate: string;
  transactions: TransactionEntry[];
};

export const ledgerMonths: LedgerMonth[] = [
  {
    key: "dec-2025",
    label: "December 2025",
    currentDate: "2025-12-06T12:00:00.000Z",
    transactions: [
      {
        id: "tx-dec-06-01",
        kind: "expense",
        amount: 12.7,
        categoryId: "lifestyle",
        subcategoryId: "eating_out",
        note: "Starbucks",
        timestamp: "2025-12-06T09:15:00.000Z",
        timeLabel: "09:15",
      },
      {
        id: "tx-dec-06-02",
        kind: "expense",
        amount: 18.5,
        categoryId: "essentials",
        subcategoryId: "groceries",
        note: "Market",
        timestamp: "2025-12-06T13:05:00.000Z",
        timeLabel: "13:05",
      },
      {
        id: "tx-dec-06-03",
        kind: "expense",
        amount: 7.7,
        categoryId: "lifestyle",
        subcategoryId: "entertainment",
        note: "Cinema",
        timestamp: "2025-12-06T19:45:00.000Z",
        timeLabel: "19:45",
      },
      {
        id: "tx-dec-05-01",
        kind: "expense",
        amount: 35.2,
        categoryId: "lifestyle",
        subcategoryId: "eating_out",
        note: "Italian place",
        timestamp: "2025-12-05T18:25:00.000Z",
        timeLabel: "18:25",
      },
      {
        id: "tx-dec-05-02",
        kind: "expense",
        amount: 15.5,
        categoryId: "essentials",
        subcategoryId: "groceries",
        note: "Lidl",
        timestamp: "2025-12-05T10:10:00.000Z",
        timeLabel: "10:10",
      },
      {
        id: "tx-dec-02-01",
        kind: "expense",
        amount: 14,
        categoryId: "personal",
        subcategoryId: "electronics",
        note: "Online shopping",
        timestamp: "2025-12-02T15:20:00.000Z",
        timeLabel: "15:20",
      },
      {
        id: "tx-dec-02-02",
        kind: "expense",
        amount: 4.2,
        categoryId: "savings",
        subcategoryId: "emergency_fund",
        note: "Moved to emergency fund",
        timestamp: "2025-12-02T08:40:00.000Z",
        timeLabel: "08:40",
      },
      {
        id: "tx-dec-01-01",
        kind: "expense",
        amount: 52.3,
        categoryId: "investments",
        subcategoryId: "stocks_etfs",
        note: "Auto-invest",
        timestamp: "2025-12-01T06:30:00.000Z",
        timeLabel: "06:30",
      },
    ],
  },
  {
    key: "nov-2025",
    label: "November 2025",
    currentDate: "2025-11-30T12:00:00.000Z",
    transactions: [
      {
        id: "tx-nov-30-01",
        kind: "expense",
        amount: 26.4,
        categoryId: "personal",
        subcategoryId: "clothing",
        note: "Uniqlo",
        timestamp: "2025-11-30T11:40:00.000Z",
        timeLabel: "11:40",
      },
      {
        id: "tx-nov-29-01",
        kind: "expense",
        amount: 82.1,
        categoryId: "essentials",
        subcategoryId: "housing",
        note: "Repairs",
        timestamp: "2025-11-29T09:15:00.000Z",
        timeLabel: "09:15",
      },
      {
        id: "tx-nov-28-01",
        kind: "expense",
        amount: 9.8,
        categoryId: "lifestyle",
        subcategoryId: "coffee_snacks",
        note: "Morning coffee",
        timestamp: "2025-11-28T07:55:00.000Z",
        timeLabel: "07:55",
      },
      {
        id: "tx-nov-27-01",
        kind: "expense",
        amount: 22.5,
        categoryId: "other",
        subcategoryId: "wants",
        note: "Bookstore",
        timestamp: "2025-11-27T16:05:00.000Z",
        timeLabel: "16:05",
      },
    ],
  },
  {
    key: "oct-2025",
    label: "October 2025",
    currentDate: "2025-10-31T12:00:00.000Z",
    transactions: [],
  },
];
