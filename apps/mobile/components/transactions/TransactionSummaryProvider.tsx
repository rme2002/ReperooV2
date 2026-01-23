import { createContext, useContext, useEffect, useState } from "react";
import { getTodayTransactionSummary } from "@/lib/gen/transactions/transactions";
import type { TodayTransactionSummary } from "@/lib/gen/model";

type TransactionSummaryContextValue = {
  todaySummary: TodayTransactionSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const TransactionSummaryContext = createContext<TransactionSummaryContextValue | null>(null);

export function TransactionSummaryProvider({ children }: { children: React.ReactNode }) {
  const [todaySummary, setTodaySummary] = useState<TodayTransactionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTodaySummary = async () => {
    try {
      const response = await getTodayTransactionSummary();

      if (response.status === 200 && response.data) {
        setTodaySummary(response.data);
        setError(null);
      } else if (response.status === 401) {
        setError("UNAUTHORIZED");
      } else {
        setError("FETCH_ERROR");
      }
    } catch (err) {
      console.error("Error fetching today summary:", err);
      const status = (err as any)?.response?.status;
      if (status === 401) {
        setError("UNAUTHORIZED");
      } else {
        setError("FETCH_ERROR");
      }
    }
  };

  const refetch = async () => {
    try {
      setIsLoading(true);
      await fetchTodaySummary();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      await fetchTodaySummary();
      setIsLoading(false);
    };

    initialize();
  }, []);

  const value: TransactionSummaryContextValue = {
    todaySummary,
    isLoading,
    error,
    refetch,
  };

  return (
    <TransactionSummaryContext.Provider value={value}>
      {children}
    </TransactionSummaryContext.Provider>
  );
}

export function useTransactionSummary() {
  const context = useContext(TransactionSummaryContext);
  if (!context) {
    throw new Error("useTransactionSummary must be used within TransactionSummaryProvider");
  }
  return context;
}
