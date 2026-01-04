export type SubCategoryBreakdown = {
  id: string;
  total: number;
  percent: number;
  color: string;
};

export type CategoryBreakdown = {
  id: string;
  total: number;
  percent: number;
  items: number;
  color: string;
  subcategories?: SubCategoryBreakdown[];
};

export type WeeklySpendingPoint = {
  week: number;
  label: string;
  total: number;
};

export type MonthSnapshot = {
  key: string;
  label: string;
  currentDate: string;
  loggedDays: number;
  totalDays: number;
  totalSpent: number;
  budget: number;
  lastMonthDelta: number;
  categories: CategoryBreakdown[];
  savings: { saved: number; invested: number; savedDelta?: number; investedDelta?: number };
  weekly: WeeklySpendingPoint[];
  transactions: { amount: number; categoryId: string; subcategoryId?: string; date: string }[];
};

export const insightMonths: MonthSnapshot[] = [
  {
    key: "dec-2025",
    label: "December 2025",
    currentDate: "2025-12-06",
    loggedDays: 12,
    totalDays: 30,
    totalSpent: 756,
    budget: 1200,
    lastMonthDelta: 0.12,
    categories: [
      {
        id: "essentials",
        total: 320,
        percent: 42,
        items: 18,
        color: "#f59a3e",
        subcategories: [
          { id: "groceries", total: 160, percent: 50, color: "#f7b267" },
          { id: "housing", total: 80, percent: 25, color: "#f59e0b" },
          { id: "utilities", total: 45, percent: 14, color: "#f4845f" },
          { id: "transport", total: 35, percent: 11, color: "#fb923c" },
          { id: "essentials_other", total: 0, percent: 0, color: "#fed7aa" },
        ],
      },
      {
        id: "lifestyle",
        total: 170,
        percent: 22,
        items: 9,
        color: "#f87171",
        subcategories: [
          { id: "eating_out", total: 70, percent: 41, color: "#fca5a5" },
          { id: "coffee_snacks", total: 30, percent: 18, color: "#fda4af" },
          { id: "entertainment", total: 35, percent: 21, color: "#fb7185" },
          { id: "travel", total: 35, percent: 20, color: "#f43f5e" },
          { id: "lifestyle_other", total: 0, percent: 0, color: "#fecdd3" },
        ],
      },
      {
        id: "personal",
        total: 110,
        percent: 15,
        items: 6,
        color: "#2f6cb3",
        subcategories: [
          { id: "clothing", total: 40, percent: 36, color: "#60a5fa" },
          { id: "beauty_care", total: 20, percent: 18, color: "#93c5fd" },
          { id: "home_items", total: 25, percent: 23, color: "#3b82f6" },
          { id: "self_care", total: 25, percent: 23, color: "#2563eb" },
          { id: "personal_other", total: 0, percent: 0, color: "#bfdbfe" },
        ],
      },
      {
        id: "savings",
        total: 80,
        percent: 11,
        items: 4,
        color: "#1f3f74",
        subcategories: [
          { id: "emergency_fund", total: 35, percent: 44, color: "#94a3b8" },
          { id: "holiday_savings", total: 20, percent: 25, color: "#64748b" },
          { id: "big_purchases", total: 15, percent: 19, color: "#475569" },
          { id: "general_savings", total: 10, percent: 12, color: "#334155" },
          { id: "savings_other", total: 0, percent: 0, color: "#cbd5f5" },
        ],
      },
      {
        id: "investments",
        total: 45,
        percent: 6,
        items: 3,
        color: "#20b2c5",
        subcategories: [
          { id: "stocks_etfs", total: 20, percent: 44, color: "#0ea5e9" },
          { id: "crypto", total: 10, percent: 22, color: "#38bdf8" },
          { id: "retirement_pension", total: 10, percent: 22, color: "#0284c7" },
          { id: "automated_investing", total: 5, percent: 12, color: "#0c4a6e" },
          { id: "investments_other", total: 0, percent: 0, color: "#bae6fd" },
        ],
      },
      {
        id: "other",
        total: 31,
        percent: 4,
        items: 3,
        color: "#a855f7",
        subcategories: [
          { id: "other_misc", total: 4, percent: 13, color: "#ddd6fe" },
          { id: "wants", total: 12, percent: 38, color: "#d8b4fe" },
          { id: "needs", total: 8, percent: 26, color: "#c084fc" },
          { id: "surprise", total: 7, percent: 23, color: "#a855f7" },
        ],
      },
    ],
    savings: { saved: 120, invested: 85, savedDelta: 0.08, investedDelta: 0.05 },
    weekly: [
      { week: 1, label: "Week 1", total: 180 },
      { week: 2, label: "Week 2", total: 140 },
      { week: 3, label: "Week 3", total: 220 },
      { week: 4, label: "Week 4", total: 160 },
      { week: 5, label: "Week 5", total: 95 },
    ],
    transactions: [
      { amount: 10, categoryId: "other", subcategoryId: "other_misc", date: "Dec 4" },
      { amount: 18, categoryId: "lifestyle", subcategoryId: "eating_out", date: "Dec 3" },
      { amount: 12, categoryId: "essentials", subcategoryId: "groceries", date: "Dec 2" },
      { amount: 30, categoryId: "savings", subcategoryId: "emergency_fund", date: "Dec 2" },
      { amount: 22, categoryId: "personal", subcategoryId: "clothing", date: "Dec 1" },
      { amount: 15, categoryId: "other", subcategoryId: "surprise", date: "Nov 30" },
    ],
  },
  {
    key: "nov-2025",
    label: "November 2025",
    currentDate: "2025-11-30",
    loggedDays: 28,
    totalDays: 30,
    totalSpent: 680,
    budget: 1200,
    lastMonthDelta: -0.04,
    categories: [
      {
        id: "essentials",
        total: 300,
        percent: 44,
        items: 17,
        color: "#f59a3e",
        subcategories: [
          { id: "groceries", total: 140, percent: 47, color: "#f7b267" },
          { id: "housing", total: 70, percent: 23, color: "#f59e0b" },
          { id: "utilities", total: 50, percent: 17, color: "#f4845f" },
          { id: "transport", total: 40, percent: 13, color: "#fb923c" },
          { id: "essentials_other", total: 0, percent: 0, color: "#fed7aa" },
        ],
      },
      {
        id: "lifestyle",
        total: 150,
        percent: 22,
        items: 7,
        color: "#f87171",
        subcategories: [
          { id: "eating_out", total: 60, percent: 40, color: "#fca5a5" },
          { id: "coffee_snacks", total: 30, percent: 20, color: "#fda4af" },
          { id: "entertainment", total: 35, percent: 23, color: "#fb7185" },
          { id: "travel", total: 25, percent: 17, color: "#f43f5e" },
          { id: "lifestyle_other", total: 0, percent: 0, color: "#fecdd3" },
        ],
      },
      {
        id: "personal",
        total: 105,
        percent: 15,
        items: 5,
        color: "#2f6cb3",
        subcategories: [
          { id: "clothing", total: 40, percent: 38, color: "#60a5fa" },
          { id: "beauty_care", total: 20, percent: 19, color: "#93c5fd" },
          { id: "home_items", total: 25, percent: 24, color: "#3b82f6" },
          { id: "self_care", total: 20, percent: 19, color: "#2563eb" },
          { id: "personal_other", total: 0, percent: 0, color: "#bfdbfe" },
        ],
      },
      {
        id: "savings",
        total: 70,
        percent: 10,
        items: 3,
        color: "#1f3f74",
        subcategories: [
          { id: "emergency_fund", total: 30, percent: 43, color: "#94a3b8" },
          { id: "holiday_savings", total: 18, percent: 26, color: "#64748b" },
          { id: "big_purchases", total: 12, percent: 17, color: "#475569" },
          { id: "general_savings", total: 10, percent: 14, color: "#334155" },
          { id: "savings_other", total: 0, percent: 0, color: "#cbd5f5" },
        ],
      },
      {
        id: "investments",
        total: 40,
        percent: 6,
        items: 2,
        color: "#20b2c5",
        subcategories: [
          { id: "stocks_etfs", total: 18, percent: 45, color: "#0ea5e9" },
          { id: "crypto", total: 8, percent: 20, color: "#38bdf8" },
          { id: "retirement_pension", total: 9, percent: 23, color: "#0284c7" },
          { id: "automated_investing", total: 5, percent: 12, color: "#0c4a6e" },
          { id: "investments_other", total: 0, percent: 0, color: "#bae6fd" },
        ],
      },
      {
        id: "other",
        total: 15,
        percent: 3,
        items: 2,
        color: "#a855f7",
        subcategories: [
          { id: "other_misc", total: 3, percent: 20, color: "#ddd6fe" },
          { id: "wants", total: 5, percent: 33, color: "#d8b4fe" },
          { id: "needs", total: 4, percent: 27, color: "#c084fc" },
          { id: "surprise", total: 3, percent: 20, color: "#a855f7" },
        ],
      },
    ],
    savings: { saved: 100, invested: 70, savedDelta: 0.03, investedDelta: -0.02 },
    weekly: [
      { week: 1, label: "Week 1", total: 150 },
      { week: 2, label: "Week 2", total: 130 },
      { week: 3, label: "Week 3", total: 190 },
      { week: 4, label: "Week 4", total: 210 },
    ],
    transactions: [
      { amount: 8, categoryId: "other", subcategoryId: "other_misc", date: "Nov 29" },
      { amount: 20, categoryId: "essentials", subcategoryId: "groceries", date: "Nov 28" },
      { amount: 16, categoryId: "lifestyle", subcategoryId: "coffee_snacks", date: "Nov 27" },
      { amount: 55, categoryId: "savings", subcategoryId: "holiday_savings", date: "Nov 25" },
      { amount: 32, categoryId: "personal", subcategoryId: "home_items", date: "Nov 24" },
      { amount: 12, categoryId: "other", subcategoryId: "needs", date: "Nov 22" },
    ],
  },
  {
    key: "oct-2025",
    label: "October 2025",
    currentDate: "2025-10-24",
    loggedDays: 10,
    totalDays: 31,
    totalSpent: 540,
    budget: 1100,
    lastMonthDelta: -0.02,
    categories: [
      {
        id: "essentials",
        total: 250,
        percent: 46,
        items: 14,
        color: "#f59a3e",
        subcategories: [
          { id: "groceries", total: 120, percent: 48, color: "#f7b267" },
          { id: "housing", total: 60, percent: 24, color: "#f59e0b" },
          { id: "utilities", total: 40, percent: 16, color: "#f4845f" },
          { id: "transport", total: 30, percent: 12, color: "#fb923c" },
        ],
      },
      {
        id: "lifestyle",
        total: 120,
        percent: 22,
        items: 6,
        color: "#f87171",
        subcategories: [
          { id: "eating_out", total: 55, percent: 46, color: "#fca5a5" },
          { id: "coffee_snacks", total: 22, percent: 18, color: "#fda4af" },
          { id: "entertainment", total: 28, percent: 23, color: "#fb7185" },
          { id: "travel", total: 15, percent: 13, color: "#f43f5e" },
        ],
      },
      {
        id: "personal",
        total: 80,
        percent: 15,
        items: 4,
        color: "#2f6cb3",
        subcategories: [
          { id: "clothing", total: 30, percent: 37, color: "#60a5fa" },
          { id: "beauty_care", total: 18, percent: 23, color: "#93c5fd" },
          { id: "home_items", total: 20, percent: 25, color: "#3b82f6" },
          { id: "self_care", total: 12, percent: 15, color: "#2563eb" },
        ],
      },
      {
        id: "savings",
        total: 50,
        percent: 9,
        items: 2,
        color: "#1f3f74",
        subcategories: [
          { id: "emergency_fund", total: 25, percent: 50, color: "#94a3b8" },
          { id: "holiday_savings", total: 15, percent: 30, color: "#64748b" },
          { id: "big_purchases", total: 10, percent: 20, color: "#475569" },
        ],
      },
      {
        id: "investments",
        total: 30,
        percent: 6,
        items: 2,
        color: "#20b2c5",
        subcategories: [
          { id: "stocks_etfs", total: 15, percent: 50, color: "#0ea5e9" },
          { id: "crypto", total: 6, percent: 20, color: "#38bdf8" },
          { id: "retirement_pension", total: 5, percent: 17, color: "#0284c7" },
          { id: "automated_investing", total: 4, percent: 13, color: "#0c4a6e" },
        ],
      },
      {
        id: "other",
        total: 10,
        percent: 2,
        items: 1,
        color: "#a855f7",
        subcategories: [
          { id: "other_misc", total: 4, percent: 40, color: "#ddd6fe" },
          { id: "wants", total: 3, percent: 30, color: "#d8b4fe" },
          { id: "needs", total: 3, percent: 30, color: "#c084fc" },
        ],
      },
    ],
    savings: { saved: 80, invested: 60, savedDelta: -0.01, investedDelta: -0.03 },
    weekly: [
      { week: 1, label: "Week 1", total: 120 },
      { week: 2, label: "Week 2", total: 140 },
      { week: 3, label: "Week 3", total: 150 },
      { week: 4, label: "Week 4", total: 130 },
    ],
    transactions: [
      { amount: 12, categoryId: "other", subcategoryId: "other_misc", date: "Oct 22" },
      { amount: 24, categoryId: "essentials", subcategoryId: "groceries", date: "Oct 21" },
      { amount: 36, categoryId: "lifestyle", subcategoryId: "entertainment", date: "Oct 20" },
      { amount: 18, categoryId: "savings", subcategoryId: "holiday_savings", date: "Oct 18" },
      { amount: 16, categoryId: "personal", subcategoryId: "home_items", date: "Oct 16" },
    ],
  },
];
