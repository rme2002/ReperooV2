import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import type { ListTransactions200Item } from "@/lib/gen/model";
import { getCategoryIcon, getCategoryAccent } from "@/utils/categoryHelpers";

type TransactionRowProps = {
  transaction: ListTransactions200Item;
  getCategoryLabel: (id: string) => string;
  getSubcategoryLabel: (catId: string, subId?: string) => string | null;
  getIncomeCategoryLabel: (id: string) => string;
  formatMoney: (value: number) => string;
  onPress: () => void;
};

export function TransactionRow({
  transaction,
  getCategoryLabel,
  getSubcategoryLabel,
  getIncomeCategoryLabel,
  formatMoney,
  onPress,
}: TransactionRowProps) {
  const showRecurringBadge = Boolean(transaction.recurring_template_id);

  if (transaction.type === "income") {
    const displayAmount = formatMoney(transaction.amount);
    const subtitleParts: string[] = [];
    if (transaction.notes) subtitleParts.push(transaction.notes);
    const subtitle = subtitleParts.join(" · ");

    return (
      <Pressable style={styles.txRow} onPress={onPress}>
        <View style={styles.txLeft}>
          <View style={[styles.txIcon, styles.txIncomeIcon]}>
            <Text style={styles.txIconText}>💰</Text>
          </View>
          <View style={styles.txInfo}>
            <Text style={[styles.txTitle, styles.txIncomeTitle]}>
              {getIncomeCategoryLabel(transaction.income_category_id)}
            </Text>
            {subtitle ? (
              <Text style={styles.txSubtitle}>{subtitle}</Text>
            ) : null}
            {showRecurringBadge ? (
              <Text style={styles.recurringBadge}>Recurring</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.txRight}>
          <Text style={[styles.txAmount, styles.txIncomeAmount]}>
            +{displayAmount}
          </Text>
        </View>
      </Pressable>
    );
  }

  // Render expense transaction
  const categoryMeta = getCategoryAccent(transaction.expense_category_id);
  const subcategoryLabel = getSubcategoryLabel(
    transaction.expense_category_id,
    transaction.expense_subcategory_id ?? undefined,
  );
  const categoryLabel = getCategoryLabel(transaction.expense_category_id);
  const subtitleParts: string[] = [];
  if (subcategoryLabel) subtitleParts.push(subcategoryLabel);
  if (transaction.notes) subtitleParts.push(transaction.notes);
  const subtitle = subtitleParts.join(" · ");
  const displayAmount = formatMoney(transaction.amount);

  return (
    <Pressable style={styles.txRow} onPress={onPress}>
      <View style={styles.txLeft}>
        <View style={[styles.txIcon, { backgroundColor: categoryMeta.bg }]}>
          <Text style={styles.txIconText}>
            {getCategoryIcon(transaction.expense_category_id)}
          </Text>
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txTitle}>{categoryLabel}</Text>
          {subtitle ? <Text style={styles.txSubtitle}>{subtitle}</Text> : null}
          {showRecurringBadge ? (
            <Text style={styles.recurringBadge}>Recurring</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.txRight}>
        <Text style={styles.txAmount}>{displayAmount}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 2,
    paddingRight: 16,
    gap: 12,
  },
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  txIncomeIcon: {
    backgroundColor: "rgba(31, 138, 91, 0.12)",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  txIconText: {
    fontSize: 20,
  },
  txInfo: {
    flex: 1,
    gap: 4,
  },
  txTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  txIncomeTitle: {
    color: colors.primaryDark,
  },
  txSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  recurringBadge: {
    marginTop: 2,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
    backgroundColor: colors.borderLight,
  },
  txRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  txIncomeAmount: {
    color: colors.primaryDark,
  },
});
