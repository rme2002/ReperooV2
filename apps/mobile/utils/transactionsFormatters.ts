/**
 * Formats a date relative to a reference date
 * Returns "Today", "Yesterday", or formatted date string
 *
 * @param value - Target date to format
 * @param reference - Reference date to compare against
 * @returns Formatted relative date string
 */
export function formatRelativeDate(value: Date, reference: Date): string {
  const dayMs = 24 * 60 * 60 * 1000;
  const normalizedTarget = new Date(value);
  normalizedTarget.setHours(0, 0, 0, 0);
  const normalizedRef = new Date(reference);
  normalizedRef.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (normalizedRef.getTime() - normalizedTarget.getTime()) / dayMs
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return normalizedTarget.toLocaleDateString("en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Generates an array of months for navigation
 * Creates 12 months starting from current month going backwards
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

  // Generate 12 months (current month and 11 previous months)
  for (let i = 0; i < 12; i++) {
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
      transactions: [], // Will be populated from API
    });
  }

  return result;
}
