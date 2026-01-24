import { useState, useEffect } from "react";
import { computeAxisTicks } from "@/utils/insightsMath";

/**
 * Weekly spending point data
 */
export interface WeeklyPoint {
  week: number;
  label: string;
  total: number;
}

/**
 * Insights snapshot with weekly data
 */
interface InsightsSnapshot {
  weekly?: WeeklyPoint[];
  [key: string]: unknown;
}

/**
 * Return type for useInsightsWeekly hook
 */
export interface UseInsightsWeeklyReturn {
  weeklyPoints: WeeklyPoint[];
  weeklyTotal: number;
  weeklyPeak: number;
  weeklyScaleMax: number;
  weeklyAxisTicks: number[];
  hasWeeklySpending: boolean;
  isLoading: boolean;
  activeWeekIndex: number | null;
  setActiveWeekIndex: (index: number | null) => void;
}

/**
 * Custom hook for processing weekly spending data
 * Computes totals, peaks, axis ticks, and manages active week state
 *
 * @param snapshot - Current insights snapshot with weekly data
 * @param selectedMonth - Currently selected month object
 * @returns Object containing processed weekly data and state
 */
export function useInsightsWeekly(
  snapshot: InsightsSnapshot | null,
  selectedMonth: { year: number; month: number }
): UseInsightsWeeklyReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [activeWeekIndex, setActiveWeekIndex] = useState<number | null>(null);

  // Reset loading and active states when month changes
  useEffect(() => {
    setActiveWeekIndex(null);
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 360);
    return () => clearTimeout(timer);
  }, [selectedMonth]);

  const weeklyPoints = snapshot?.weekly ?? [];
  const weeklyTotals = weeklyPoints.map((point) => point.total);
  const weeklyPeak = weeklyTotals.length ? Math.max(...weeklyTotals) : 0;
  const weeklyMax = Math.max(weeklyPeak, 1);
  const weeklyTotal = weeklyTotals.reduce((sum, value) => sum + value, 0);
  const hasWeeklySpending = weeklyTotals.some((value) => value > 0);
  const weeklyAxisTicks = hasWeeklySpending ? computeAxisTicks(weeklyPeak) : [];
  const weeklyScaleMax = (weeklyAxisTicks[0] ?? weeklyMax) || 1;

  return {
    weeklyPoints,
    weeklyTotal,
    weeklyPeak,
    weeklyScaleMax,
    weeklyAxisTicks,
    hasWeeklySpending,
    isLoading,
    activeWeekIndex,
    setActiveWeekIndex,
  };
}
