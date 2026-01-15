import { createContext, useContext, useEffect, useState, useCallback } from "react";

import {
  getMonthSnapshot,
  listAvailableMonths,
} from "@/lib/gen/insights/insights";
import type { AvailableMonth, MonthSnapshot } from "@/lib/gen/model";

type InsightsContextValue = {
  availableMonths: AvailableMonth[];
  currentSnapshot: MonthSnapshot | null;
  isLoading: boolean;
  error: string | null;
  fetchSnapshot: (year: number, month: number) => Promise<void>;
  refetchAvailableMonths: () => Promise<void>;
  prefetchSnapshot: (year: number, month: number) => Promise<void>;
};

const InsightsContext = createContext<InsightsContextValue | null>(null);

export function InsightsProvider({ children }: { children: React.ReactNode }) {
  const [availableMonths, setAvailableMonths] = useState<AvailableMonth[]>([]);
  const [currentSnapshot, setCurrentSnapshot] = useState<MonthSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache for snapshots: key is "year-month", value is MonthSnapshot
  const [snapshotCache] = useState<Map<string, MonthSnapshot>>(new Map());

  const fetchAvailableMonths = async () => {
    try {
      const response = await listAvailableMonths();

      if (response.status === 200 && response.data) {
        setAvailableMonths(response.data);
      } else if (response.status === 401) {
        setError("UNAUTHORIZED");
      } else {
        console.error("Failed to fetch available months:", response.status);
      }
    } catch (err) {
      console.error("Error fetching available months:", err);
      // Don't set error here - empty availableMonths is acceptable for new users
    }
  };

  const fetchSnapshot = useCallback(async (year: number, month: number) => {
    const cacheKey = `${year}-${month}`;

    // Check cache first
    if (snapshotCache.has(cacheKey)) {
      setCurrentSnapshot(snapshotCache.get(cacheKey)!);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await getMonthSnapshot({ year, month });

      if (response.status === 200 && response.data) {
        setCurrentSnapshot(response.data);
        // Cache the snapshot
        snapshotCache.set(cacheKey, response.data);
      } else if (response.status === 404) {
        // No budget plan exists
        setError("NO_BUDGET_PLAN");
        setCurrentSnapshot(null);
      } else if (response.status === 401) {
        setError("UNAUTHORIZED");
        setCurrentSnapshot(null);
      } else {
        setError("FETCH_ERROR");
        setCurrentSnapshot(null);
      }
    } catch (err) {
      console.error("Error fetching month snapshot:", err);

      // Check if it's a 404 error (no budget plan)
      if (err && typeof err === 'object' && 'status' in err) {
        if (err.status === 404) {
          setError("NO_BUDGET_PLAN");
        } else if (err.status === 401) {
          setError("UNAUTHORIZED");
        } else {
          setError("FETCH_ERROR");
        }
      } else {
        setError("FETCH_ERROR");
      }
      setCurrentSnapshot(null);
    } finally {
      setIsLoading(false);
    }
  }, [snapshotCache]);

  const prefetchSnapshot = useCallback(async (year: number, month: number) => {
    const cacheKey = `${year}-${month}`;

    // Don't prefetch if already cached
    if (snapshotCache.has(cacheKey)) {
      return;
    }

    try {
      const response = await getMonthSnapshot({ year, month });

      if (response.status === 200 && response.data) {
        // Cache the snapshot
        snapshotCache.set(cacheKey, response.data);
      }
    } catch (err) {
      // Silently fail for prefetch - we'll fetch again when needed
      console.log("Prefetch failed for", year, month);
    }
  }, [snapshotCache]);

  const refetchAvailableMonths = useCallback(async () => {
    await fetchAvailableMonths();
  }, []);

  // Fetch available months on mount
  useEffect(() => {
    fetchAvailableMonths();
  }, []);

  const value: InsightsContextValue = {
    availableMonths,
    currentSnapshot,
    isLoading,
    error,
    fetchSnapshot,
    refetchAvailableMonths,
    prefetchSnapshot,
  };

  return (
    <InsightsContext.Provider value={value}>
      {children}
    </InsightsContext.Provider>
  );
}

export function useInsightsContext() {
  const context = useContext(InsightsContext);
  if (!context) {
    throw new Error("useInsightsContext must be used within InsightsProvider");
  }
  return context;
}
