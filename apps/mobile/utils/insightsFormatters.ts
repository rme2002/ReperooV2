/**
 * Format a number with thousands separators
 * @param value - Number to format
 * @returns Formatted string (e.g., "1,234")
 */
export const formatNumber = (value: number | null | undefined): string =>
  value != null ? value.toLocaleString("en-US") : "0";

/**
 * Format a decimal as a percentage
 * @param value - Decimal value (e.g., 0.75 for 75%)
 * @returns Formatted percentage string (e.g., "75%")
 */
export const formatPercent = (value: number | null | undefined): string =>
  value != null ? `${Math.round(value * 100)}%` : "0%";

/**
 * Format a day number with ordinal suffix
 * @param value - Day number (1-31)
 * @returns Formatted day with suffix (e.g., "1st", "2nd", "3rd", "4th")
 */
export const formatDayWithSuffix = (value: number | null | undefined): string => {
  if (value == null) return "0th";
  const remainder = value % 10;
  const teens = value % 100;
  if (teens >= 11 && teens <= 13) {
    return `${value}th`;
  }
  if (remainder === 1) return `${value}st`;
  if (remainder === 2) return `${value}nd`;
  if (remainder === 3) return `${value}rd`;
  return `${value}th`;
};

/**
 * Format a date string as a recurring income schedule label
 * @param dateString - ISO date string
 * @returns Schedule label (e.g., "Monthly • 15th" or "Logged income" for invalid dates)
 */
export const formatIncomeSchedule = (dateString: string): string => {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return "Logged income";
  }
  const day = parsed.getDate();
  return `Monthly • ${formatDayWithSuffix(day)}`;
};
