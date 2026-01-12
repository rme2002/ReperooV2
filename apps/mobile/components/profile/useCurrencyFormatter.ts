import { useCallback } from "react";

import { currencySymbolMap, type CurrencyCode, useUserPreferences } from "./UserPreferencesProvider";

const formatterCache = new Map<string, Intl.NumberFormat>();

const makeKey = (
  currency: CurrencyCode,
  options: { minimumFractionDigits: number; maximumFractionDigits: number; notation: string },
) => {
  const { minimumFractionDigits, maximumFractionDigits, notation } = options;
  return `${currency}-${minimumFractionDigits}-${maximumFractionDigits}-${notation}`;
};

export function useCurrencyFormatter() {
  const { currency } = useUserPreferences();

  const formatCurrency = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => {
      const minimumFractionDigits = options?.minimumFractionDigits ?? 0;
      const maximumFractionDigits =
        options?.maximumFractionDigits ?? Math.max(minimumFractionDigits, 0);
      const notation = options?.notation ?? "standard";
      const key = makeKey(currency, {
        minimumFractionDigits,
        maximumFractionDigits,
        notation,
      });
      let formatter = formatterCache.get(key);
      if (!formatter) {
        formatter = new Intl.NumberFormat(undefined, {
          style: "currency",
          currency,
          minimumFractionDigits,
          maximumFractionDigits,
          ...options,
        });
        formatterCache.set(key, formatter);
      }
      return formatter.format(value);
    },
    [currency],
  );

  return {
    currency,
    currencySymbol: currencySymbolMap[currency],
    formatCurrency,
  };
}
