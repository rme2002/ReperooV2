import { getUTCDateKey } from "@/utils/dateHelpers";

/**
 * Formats a date relative to a reference date
 * Returns "Today", "Yesterday", or formatted date string
 *
 * @param value - Target date to format
 * @param reference - Reference date to compare against
 * @returns Formatted relative date string
 */
export function formatRelativeDate(value: Date, reference: Date): string {
  const targetKey = getUTCDateKey(value);
  const refKey = getUTCDateKey(reference);

  if (targetKey === refKey) return "Today";

  const yesterday = new Date(reference);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = getUTCDateKey(yesterday);

  if (targetKey === yesterdayKey) return "Yesterday";

  return value.toLocaleDateString("en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Generates an array of months for navigation
 * Creates months including past, current, and future months
 *
 * @returns Array of month objects with key, label, and currentDate
 */
export function generateMonthsArray() {
  const result: Array<{
    key: string;
    label: string;
    currentDate: string;
    transactions: never[];
  }> = [];
  const now = new Date();

  const PAST_MONTHS = 12;
  const FUTURE_MONTHS = 6;

  // Generate future months in reverse order (so they appear first in the array)
  for (let i = FUTURE_MONTHS; i > 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 15);
    const key = `${date
      .toLocaleString("en-US", { month: "short" })
      .toLowerCase()}-${date.getFullYear()}`;
    const label = date.toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });

    result.push({
      key,
      label,
      currentDate: date.toISOString(),
      transactions: [],
    });
  }

  // Generate current month and past months
  for (let i = 0; i < PAST_MONTHS; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 15);
    const key = `${date
      .toLocaleString("en-US", { month: "short" })
      .toLowerCase()}-${date.getFullYear()}`;
    const label = date.toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });

    result.push({
      key,
      label,
      currentDate: date.toISOString(),
      transactions: [],
    });
  }

  return result;
}
