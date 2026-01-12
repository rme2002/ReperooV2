import type { LedgerMonth, TransactionEntry } from "@/components/dummy_data/transactions";

export type RecurringExpenseTemplate = {
  id: string;
  amount: number;
  categoryId: string;
  subcategoryId?: string | null;
  note?: string;
  startDate: string; // YYYY-MM-DD
  dayOfMonth: number;
  totalOccurrences?: number | null;
  skippedDateKeys: string[];
  isPaused: boolean;
};

const timeLabelFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

const toDateKey = (date: Date) => date.toISOString().split("T")[0];

const startOfMonth = (date: Date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfMonth = (date: Date) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
};

const clampDayOfMonth = (year: number, monthIndex: number, day: number) => {
  const endDate = new Date(year, monthIndex + 1, 0);
  return Math.min(day, endDate.getDate());
};

const monthsBetween = (start: Date, target: Date) =>
  (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth());

const ensureSkipList = (template: RecurringExpenseTemplate, dateKey: string) =>
  template.skippedDateKeys.includes(dateKey)
    ? template
    : {
        ...template,
        skippedDateKeys: [...template.skippedDateKeys, dateKey],
      };

const cloneMonths = (months: LedgerMonth[]): LedgerMonth[] =>
  months.map((month) => ({
    ...month,
    transactions: month.transactions.map((tx) => ({ ...tx })),
  }));

export const createTemplateFromPayload = (payload: {
  amount: number;
  categoryId: string;
  subcategoryId?: string | null;
  note?: string;
  date: Date;
  dayOfMonth?: number;
}) => {
  const anchorDate = new Date(payload.date);
  anchorDate.setHours(0, 0, 0, 0);
  const selectedDay = Math.min(31, Math.max(1, payload.dayOfMonth ?? anchorDate.getDate()));
  return {
    id: `rec-${Date.now()}`,
    amount: payload.amount,
    categoryId: payload.categoryId,
    subcategoryId: payload.subcategoryId ?? null,
    note: payload.note?.trim() || undefined,
    startDate: toDateKey(anchorDate),
    dayOfMonth: selectedDay,
    totalOccurrences: undefined,
    skippedDateKeys: [toDateKey(anchorDate)],
    isPaused: false,
  } satisfies RecurringExpenseTemplate;
};

const shouldMaterializeTemplate = (template: RecurringExpenseTemplate, monthDate: Date, monthEnd: Date) => {
  const templateStart = new Date(template.startDate);
  templateStart.setHours(0, 0, 0, 0);
  if (templateStart > monthEnd) {
    return {
      ok: false,
      templateStart,
    };
  }
  return { ok: true, templateStart };
};

export const materializeRecurringTransactions = (
  baseMonths: LedgerMonth[],
  templates: RecurringExpenseTemplate[],
): LedgerMonth[] => {
  const nextMonths = cloneMonths(baseMonths);

  nextMonths.forEach((month) => {
    const monthDate = new Date(month.currentDate);
    const rangeStart = startOfMonth(monthDate);
    const rangeEnd = endOfMonth(monthDate);
    templates.forEach((template) => {
      if (template.isPaused) {
        return;
      }
      const { ok, templateStart } = shouldMaterializeTemplate(template, rangeStart, rangeEnd);
      if (!ok) {
        return;
      }
      const clampedDay = clampDayOfMonth(rangeStart.getFullYear(), rangeStart.getMonth(), template.dayOfMonth);
      const occurrenceDate = new Date(rangeStart);
      occurrenceDate.setDate(clampedDay);
      occurrenceDate.setHours(9, 0, 0, 0);
      if (occurrenceDate < templateStart) {
        return;
      }
      const occurrenceIndex = monthsBetween(templateStart, occurrenceDate);
      if (occurrenceIndex < 0) {
        return;
      }
      if (template.totalOccurrences && occurrenceIndex >= template.totalOccurrences) {
        return;
      }
      const dateKey = toDateKey(occurrenceDate);
      if (template.skippedDateKeys.includes(dateKey)) {
        return;
      }
      const alreadyExists = month.transactions.some(
        (tx) => tx.recurringTemplateId === template.id && tx.recurringDateKey === dateKey,
      );
      if (alreadyExists) {
        return;
      }
      const entry: TransactionEntry = {
        id: `rec-${template.id}-${dateKey}`,
        kind: "expense",
        amount: template.amount,
        categoryId: template.categoryId,
        subcategoryId: template.subcategoryId ?? undefined,
        note: template.note,
        timestamp: occurrenceDate.toISOString(),
        timeLabel: timeLabelFormatter.format(occurrenceDate),
        recurringTemplateId: template.id,
        recurringDateKey: dateKey,
        isRecurringInstance: true,
        recurringDayOfMonth: clampedDay,
      };
      month.transactions.push(entry);
    });
    month.transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  });

  return nextMonths;
};

export const markManualOccurrence = (
  template: RecurringExpenseTemplate,
  date: Date | string,
): RecurringExpenseTemplate => {
  const key = typeof date === "string" ? date : toDateKey(date);
  return ensureSkipList(template, key);
};

export const getNextOccurrenceDate = (
  template: RecurringExpenseTemplate,
  fromDate: Date = new Date(),
): Date | null => {
  const templateStart = new Date(template.startDate);
  templateStart.setHours(0, 0, 0, 0);
  const reference = new Date(fromDate);
  reference.setHours(0, 0, 0, 0);
  const baseMonth = startOfMonth(templateStart);
  const maxIterations = template.totalOccurrences ?? 36;
  for (let i = 0; i < maxIterations + 12; i++) {
    const candidate = new Date(baseMonth);
    candidate.setMonth(candidate.getMonth() + i);
    const clampedDay = clampDayOfMonth(candidate.getFullYear(), candidate.getMonth(), template.dayOfMonth);
    candidate.setDate(clampedDay);
    candidate.setHours(9, 0, 0, 0);
    if (candidate < templateStart) {
      continue;
    }
    const occurrenceIndex = monthsBetween(templateStart, candidate);
    if (occurrenceIndex < 0) {
      continue;
    }
    if (template.totalOccurrences && occurrenceIndex >= template.totalOccurrences) {
      return null;
    }
    const dateKey = toDateKey(candidate);
    if (template.skippedDateKeys.includes(dateKey)) {
      continue;
    }
    if (candidate >= reference) {
      return candidate;
    }
  }
  return null;
};
