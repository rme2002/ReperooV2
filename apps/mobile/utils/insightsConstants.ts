import { palette } from "@/constants/theme";

/**
 * Time constants
 */
export const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Slider configuration constants
 * - SLIDER_MAX: Maximum value for goal sliders
 * - SLIDER_STEP: Snap increment for slider values
 * - LINEAR_MAX: Value where slider curve transitions from linear to exponential
 * - LINEAR_PORTION: Percentage of slider track that uses linear scaling
 */
export const SLIDER_MAX = 10000;
export const SLIDER_STEP = 10;
export const LINEAR_MAX = 200;
export const LINEAR_PORTION = 0.5;

/**
 * Fallback colors for subcategories when not explicitly configured
 */
export const fallbackSubcategoryColors = [
  palette.blue200,
  palette.blue180,
  palette.purple100,
  palette.pink200,
  palette.amber200,
  palette.green300,
  palette.green210,
];
