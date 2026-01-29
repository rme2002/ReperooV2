export type DecimalSeparator = "." | ",";
export type DecimalSeparatorPreference = "auto" | DecimalSeparator;

const stripNonNumeric = (value: string) => value.replace(/[^\d.,]/g, "");

export const getLocaleDecimalSeparator = (): DecimalSeparator => {
  try {
    const parts = new Intl.NumberFormat(undefined).formatToParts(1.1);
    const decimalPart = parts.find((part) => part.type === "decimal")?.value;
    if (decimalPart === "," || decimalPart === ".") {
      return decimalPart;
    }
    const formatted = new Intl.NumberFormat(undefined).format(1.1);
    const match = formatted.match(/[^0-9]/);
    if (match?.[0] === "," || match?.[0] === ".") {
      return match[0];
    }
  } catch {
    // Fall through to default.
  }
  return ".";
};

export const normalizeAmountInput = (
  value: string,
  decimalSeparator: DecimalSeparator,
) => {
  const cleaned = stripNonNumeric(value);
  if (decimalSeparator === ",") {
    if (cleaned.includes(",")) {
      return cleaned.replace(/\./g, "").replace(/,/g, ".");
    }
    return cleaned.replace(/,/g, "");
  }
  if (cleaned.includes(".")) {
    return cleaned.replace(/,/g, "");
  }
  return cleaned.replace(/\./g, "").replace(/,/g, ".");
};

export const parseAmountInput = (
  value: string,
  decimalSeparator: DecimalSeparator,
) => {
  const normalized = normalizeAmountInput(value, decimalSeparator);
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatAmountInput = (
  value: number,
  decimalSeparator: DecimalSeparator,
) => {
  const raw = String(value);
  return decimalSeparator === "," ? raw.replace(".", ",") : raw;
};

export const formatDecimalExample = (decimalSeparator: DecimalSeparator) =>
  `1${decimalSeparator}23`;
