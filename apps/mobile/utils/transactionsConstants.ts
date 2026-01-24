import { palette } from "@/constants/theme";

/**
 * Action button width for swipe gestures
 */
export const ACTION_WIDTH = 150;

/**
 * Category accent colors for visual categorization
 * Maps category IDs to background and fill colors
 */
export const CATEGORY_ACCENT: Record<string, { bg: string; fill: string }> = {
  essentials: { bg: palette.amber200, fill: palette.amber600 },
  lifestyle: { bg: palette.rose100, fill: palette.pink300 },
  personal: { bg: palette.blue200, fill: palette.blue600 },
  savings: { bg: palette.amber170, fill: palette.amber500 },
  investments: { bg: palette.green210, fill: palette.green500 },
  other: { bg: palette.purple100, fill: palette.purple500 },
};

/**
 * Default icon mapping for categories
 * Used when icons are not provided by the API
 */
export const CATEGORY_ICONS: Record<string, string> = {
  essentials: "🥕",
  lifestyle: "🎉",
  personal: "👤",
  savings: "💰",
  investments: "📈",
  other: "📦",
};
