import { colors } from "@/constants/theme";
import { CATEGORY_ACCENT, CATEGORY_ICONS } from "./transactionsConstants";

/**
 * Get the icon emoji for a category
 *
 * @param categoryId - Category identifier
 * @returns Emoji icon or default icon
 */
export function getCategoryIcon(categoryId: string): string {
  return CATEGORY_ICONS[categoryId] ?? "💸";
}

/**
 * Get accent colors (background and fill) for a category
 *
 * @param categoryId - Category identifier
 * @returns Object with bg and fill color properties
 */
export function getCategoryAccent(categoryId: string): {
  bg: string;
  fill: string;
} {
  return (
    CATEGORY_ACCENT[categoryId] ?? {
      bg: colors.borderLight,
      fill: colors.text,
    }
  );
}
