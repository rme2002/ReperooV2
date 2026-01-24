import { SLIDER_MAX, SLIDER_STEP, LINEAR_MAX, LINEAR_PORTION } from "./insightsConstants";

/**
 * Clamp a value between min and max bounds
 * @param value - Value to clamp
 * @param min - Minimum bound
 * @param max - Maximum bound
 * @returns Clamped value
 */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * Sanitize a goal value to be within valid bounds
 * @param value - Goal value to sanitize
 * @param maxValue - Maximum allowed value (defaults to SLIDER_MAX)
 * @returns Sanitized value between 0 and maxValue
 */
export const sanitizeGoalValue = (
  value: number,
  maxValue = SLIDER_MAX
): number => clamp(value, 0, maxValue);

/**
 * Snap a goal value to the nearest step increment
 * @param value - Goal value to snap
 * @param maxValue - Maximum allowed value (defaults to SLIDER_MAX)
 * @returns Snapped value at nearest SLIDER_STEP increment, clamped to bounds
 */
export const snapGoalValue = (value: number, maxValue = SLIDER_MAX): number =>
  clamp(Math.round(value / SLIDER_STEP) * SLIDER_STEP, 0, maxValue);

/**
 * Convert slider position (0-1) to value using non-linear curve
 * Linear up to LINEAR_MAX, then exponential for larger values
 * @param percent - Slider position as decimal (0-1)
 * @param maxValue - Maximum value the slider can reach
 * @returns Calculated value
 */
export const valueFromPercent = (
  percent: number,
  maxValue: number
): number => {
  const pct = clamp(percent, 0, 1);
  if (pct <= LINEAR_PORTION) {
    return (pct / LINEAR_PORTION) * LINEAR_MAX;
  }
  const t = (pct - LINEAR_PORTION) / (1 - LINEAR_PORTION);
  return LINEAR_MAX + (maxValue - LINEAR_MAX) * t * t;
};

/**
 * Convert value to slider position (0-1) using inverse of non-linear curve
 * @param value - Current value
 * @param maxValue - Maximum value the slider can reach
 * @returns Slider position as decimal (0-1)
 */
export const percentFromValue = (value: number, maxValue: number): number => {
  const clamped = clamp(value, 0, maxValue);
  if (clamped <= LINEAR_MAX) {
    return (clamped / LINEAR_MAX) * LINEAR_PORTION;
  }
  const t = Math.sqrt((clamped - LINEAR_MAX) / (maxValue - LINEAR_MAX));
  return LINEAR_PORTION + t * (1 - LINEAR_PORTION);
};

/**
 * Round a value to a "nice" number for chart axes
 * @param value - Value to round
 * @param round - Whether to round up (true) or down (false)
 * @returns Nice rounded value
 */
export const niceNumber = (value: number, round: boolean): number => {
  if (value <= 0) return 0;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  let niceFraction: number;

  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }

  return niceFraction * 10 ** exponent;
};

/**
 * Compute axis tick values for a chart based on maximum data value
 * Generates approximately 4 evenly-spaced ticks from max down to 0
 * @param maxValue - Maximum value in the data
 * @returns Array of tick values in descending order
 */
export const computeAxisTicks = (maxValue: number): number[] => {
  if (maxValue <= 0) {
    return [];
  }

  const niceStep = niceNumber(maxValue / 3, true) || 1;
  const niceMax = niceStep * Math.ceil(maxValue / niceStep);

  const ticks: number[] = [];
  for (let value = niceMax; value >= 0; value -= niceStep) {
    ticks.push(Math.round(value));
  }
  if (ticks[ticks.length - 1] !== 0) {
    ticks.push(0);
  }

  return ticks;
};
