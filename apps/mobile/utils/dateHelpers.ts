/**
 * UTC-aware date utilities to fix timezone issues in date key generation
 */

/**
 * Generates a date key from occurred_at (now a YYYY-MM-DD string)
 * This ensures consistent date grouping regardless of local timezone
 *
 * @param timestamp - YYYY-MM-DD string or Date object
 * @returns Date key in format YYYY-MM-DD
 */
export function getUTCDateKey(timestamp: string | Date): string {
  // If it's already a date string (YYYY-MM-DD), return it directly
  if (typeof timestamp === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(timestamp)) {
    return timestamp;
  }
  // Otherwise, parse as Date and convert
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if two dates are on the same UTC day
 *
 * @param date1 - First date to compare
 * @param date2 - Second date to compare
 * @returns True if both dates are on the same UTC day
 */
export function isSameUTCDay(date1: Date, date2: Date): boolean {
  return getUTCDateKey(date1) === getUTCDateKey(date2);
}
