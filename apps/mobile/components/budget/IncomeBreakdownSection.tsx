import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import type { TransactionIncome } from "../../lib/gen/model/transactionIncome";
import type { RecurringTemplateIncome } from "../../lib/gen/model/recurringTemplateIncome";
import { colors, palette } from "@/constants/theme";

interface IncomeBreakdownSectionProps {
  transactions: TransactionIncome[];
  recurringTemplates: RecurringTemplateIncome[];
  loading: boolean;
  error: string | null;
  formatCurrency: (value: number) => string;
  onRetry: () => void;
  scale?: number;
}

const incomeCategoryLabels: Record<string, string> = {
  salary: "Salary",
  freelance_business: "Freelance/Business",
  government_benefits: "Government Benefits",
  investment_income: "Investment Income",
  refunds_reimbursements: "Refunds & Reimbursements",
  income_other: "Other Income",
};

const recurringFrequencyLabels: Record<string, string> = {
  monthly: "Monthly",
  weekly: "Weekly",
  biweekly: "Biweekly",
};

const isRecurringIncome = (
  transaction: TransactionIncome,
  templates: RecurringTemplateIncome[]
): RecurringTemplateIncome | null => {
  // Check if transaction matches a recurring template
  const match = templates.find(
    (template) =>
      template.amount === transaction.amount &&
      template.income_category_id === transaction.income_category_id
  );
  return match || null;
};

const formatTransactionDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time for comparison
  const resetTime = (d: Date) => {
    d.setHours(0, 0, 0, 0);
    return d;
  };

  if (resetTime(new Date(date)).getTime() === resetTime(new Date(today)).getTime()) {
    return "Today";
  } else if (resetTime(new Date(date)).getTime() === resetTime(new Date(yesterday)).getTime()) {
    return "Yesterday";
  } else {
    // Format as "Mon, Jan 12"
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  }
};

export function IncomeBreakdownSection({
  transactions,
  recurringTemplates,
  loading,
  error,
  formatCurrency,
  onRetry,
  scale = 1,
}: IncomeBreakdownSectionProps) {
  // Create scaled styles
  const scaledStyles = {
    incomeBreakdownSection: {
      marginTop: 16 * scale,
      gap: 8 * scale,
    },
    incomeSectionHeader: {
      gap: 2 * scale,
    },
    incomeSectionTitle: {
      fontSize: 14 * scale,
      fontWeight: "700" as const,
      color: palette.gray900,
    },
    incomeSectionSubtitle: {
      fontSize: 11 * scale,
      color: palette.gray500,
    },
    incomeRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingVertical: 8 * scale,
      paddingHorizontal: 4 * scale,
      gap: 10 * scale,
      borderBottomWidth: 1,
      borderBottomColor: palette.slate200,
    },
    incomeIcon: {
      width: 36 * scale,
      height: 36 * scale,
      borderRadius: 18 * scale,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: palette.lime100,
      borderWidth: 1,
      borderColor: palette.lime400,
    },
    incomeIconOneTime: {
      backgroundColor: palette.green350,
      borderColor: palette.green400,
    },
    incomeIconText: {
      fontSize: 18 * scale,
    },
    incomeRecurringBadge: {
      position: "absolute" as const,
      top: -3 * scale,
      right: -3 * scale,
      width: 16 * scale,
      height: 16 * scale,
      borderRadius: 8 * scale,
      backgroundColor: palette.blue180,
      borderWidth: 2,
      borderColor: palette.white,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    incomeRecurringBadgeText: {
      fontSize: 9 * scale,
      fontWeight: "700" as const,
      color: palette.slate900,
    },
    incomeDetails: {
      flex: 1,
      gap: 2 * scale,
    },
    incomeCategory: {
      fontSize: 14 * scale,
      fontWeight: "700" as const,
      color: palette.green700,
    },
    incomeMeta: {
      fontSize: 12 * scale,
      color: palette.gray500,
    },
    incomeAmount: {
      fontSize: 15 * scale,
      fontWeight: "800" as const,
      color: palette.green700,
    },
    incomeTotalRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingVertical: 10 * scale,
      paddingHorizontal: 4 * scale,
      marginTop: 4 * scale,
      borderTopWidth: 2,
      borderTopColor: palette.green700,
      backgroundColor: palette.green350,
    },
    incomeTotalLabel: {
      fontSize: 14 * scale,
      fontWeight: "700" as const,
      color: palette.green700,
    },
    incomeTotalAmount: {
      fontSize: 16 * scale,
      fontWeight: "800" as const,
      color: palette.green700,
    },
    incomeEmptyState: {
      paddingVertical: 24 * scale,
      paddingHorizontal: 16 * scale,
      alignItems: "center" as const,
      gap: 8 * scale,
      backgroundColor: palette.slate180,
      borderRadius: 12 * scale,
    },
    incomeEmptyIcon: {
      fontSize: 32 * scale,
      marginBottom: 4 * scale,
    },
    incomeEmptyTitle: {
      fontSize: 14 * scale,
      fontWeight: "600" as const,
      color: palette.gray700,
    },
    incomeEmptyText: {
      fontSize: 12 * scale,
      color: palette.gray500,
      textAlign: "center" as const,
    },
    incomeLoadingContainer: {
      gap: 8 * scale,
    },
    incomeSkeletonRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12 * scale,
      paddingVertical: 12 * scale,
    },
    incomeSkeletonIcon: {
      width: 44 * scale,
      height: 44 * scale,
      borderRadius: 22 * scale,
      backgroundColor: palette.sand180,
    },
    incomeSkeletonBody: {
      flex: 1,
      gap: 6 * scale,
    },
    incomeSkeletonLine: {
      height: 12 * scale,
      backgroundColor: palette.sand180,
      borderRadius: 6 * scale,
      flex: 0.6,
    },
    incomeSkeletonLineSm: {
      height: 10 * scale,
      backgroundColor: palette.sand180,
      borderRadius: 5 * scale,
      flex: 0.4,
    },
    incomeSkeletonAmount: {
      width: 70 * scale,
      height: 14 * scale,
      backgroundColor: palette.sand180,
      borderRadius: 6 * scale,
    },
    incomeErrorState: {
      paddingVertical: 20 * scale,
      paddingHorizontal: 16 * scale,
      alignItems: "center" as const,
      gap: 8 * scale,
      backgroundColor: palette.red120,
      borderRadius: 12 * scale,
    },
    incomeErrorIcon: {
      fontSize: 28 * scale,
    },
    incomeErrorTitle: {
      fontSize: 14 * scale,
      fontWeight: "600" as const,
      color: palette.red800,
    },
    incomeErrorText: {
      fontSize: 12 * scale,
      color: palette.red900,
      textAlign: "center" as const,
    },
    incomeRetryButton: {
      marginTop: 8 * scale,
      paddingHorizontal: 16 * scale,
      paddingVertical: 8 * scale,
      backgroundColor: colors.primary,
      borderRadius: 999,
    },
    incomeRetryButtonText: {
      fontSize: 13 * scale,
      fontWeight: "600" as const,
      color: colors.textLight,
    },
  };
  // Loading state
  if (loading) {
    return (
      <View style={scaledStyles.incomeBreakdownSection}>
        <View style={scaledStyles.incomeSectionHeader}>
          <Text style={scaledStyles.incomeSectionTitle}>Income Breakdown</Text>
          <Text style={scaledStyles.incomeSectionSubtitle}>Actual income received this month</Text>
        </View>
        <View style={scaledStyles.incomeLoadingContainer}>
          {[1, 2].map((i) => (
            <View key={i} style={scaledStyles.incomeSkeletonRow}>
              <View style={scaledStyles.incomeSkeletonIcon} />
              <View style={scaledStyles.incomeSkeletonBody}>
                <View style={scaledStyles.incomeSkeletonLine} />
                <View style={scaledStyles.incomeSkeletonLineSm} />
              </View>
              <View style={scaledStyles.incomeSkeletonAmount} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={scaledStyles.incomeBreakdownSection}>
        <View style={scaledStyles.incomeSectionHeader}>
          <Text style={scaledStyles.incomeSectionTitle}>Income Breakdown</Text>
          <Text style={scaledStyles.incomeSectionSubtitle}>Actual income received this month</Text>
        </View>
        <View style={scaledStyles.incomeErrorState}>
          <Text style={scaledStyles.incomeErrorIcon}>⚠️</Text>
          <Text style={scaledStyles.incomeErrorTitle}>Failed to load income</Text>
          <Text style={scaledStyles.incomeErrorText}>{error}</Text>
          <Pressable style={scaledStyles.incomeRetryButton} onPress={onRetry}>
            <Text style={scaledStyles.incomeRetryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Empty state
  if (transactions.length === 0) {
    return (
      <View style={scaledStyles.incomeBreakdownSection}>
        <View style={scaledStyles.incomeSectionHeader}>
          <Text style={scaledStyles.incomeSectionTitle}>Income Breakdown</Text>
          <Text style={scaledStyles.incomeSectionSubtitle}>Actual income received this month</Text>
        </View>
        <View style={scaledStyles.incomeEmptyState}>
          <Text style={scaledStyles.incomeEmptyIcon}>💰</Text>
          <Text style={scaledStyles.incomeEmptyTitle}>No income received yet</Text>
          <Text style={scaledStyles.incomeEmptyText}>
            Income transactions you log will appear here
          </Text>
        </View>
      </View>
    );
  }

  // Calculate total income
  const totalIncome = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Income list
  return (
    <View style={scaledStyles.incomeBreakdownSection}>
      <View style={scaledStyles.incomeSectionHeader}>
        <Text style={scaledStyles.incomeSectionTitle}>Income Breakdown</Text>
        <Text style={scaledStyles.incomeSectionSubtitle}>Actual income received this month</Text>
      </View>
      <View style={styles.incomeList}>
        {transactions.map((transaction) => {
          const recurringTemplate = isRecurringIncome(transaction, recurringTemplates);
          const isRecurring = !!recurringTemplate;
          const categoryLabel =
            incomeCategoryLabels[transaction.income_category_id] || "Income";
          const dateLabel = formatTransactionDate(transaction.occurred_at);
          const frequencyLabel = recurringTemplate
            ? recurringFrequencyLabels[recurringTemplate.frequency] || recurringTemplate.frequency
            : null;

          return (
            <View key={transaction.id} style={scaledStyles.incomeRow}>
              {/* Icon Container */}
              <View style={styles.incomeIconContainer}>
                <View style={[scaledStyles.incomeIcon, !isRecurring && scaledStyles.incomeIconOneTime]}>
                  <Text style={scaledStyles.incomeIconText}>{isRecurring ? "💰" : "💵"}</Text>
                </View>
                {isRecurring && (
                  <View style={scaledStyles.incomeRecurringBadge}>
                    <Text style={scaledStyles.incomeRecurringBadgeText}>R</Text>
                  </View>
                )}
              </View>

              {/* Transaction Details */}
              <View style={scaledStyles.incomeDetails}>
                <Text style={scaledStyles.incomeCategory}>{categoryLabel}</Text>
                <Text style={scaledStyles.incomeMeta}>
                  {dateLabel}
                  {isRecurring && frequencyLabel ? ` • ${frequencyLabel}` : ""}
                  {transaction.notes ? ` • ${transaction.notes}` : ""}
                </Text>
              </View>

              {/* Amount */}
              <Text style={scaledStyles.incomeAmount}>
                +{formatCurrency(transaction.amount)}
              </Text>
            </View>
          );
        })}

        {/* Total Row */}
        <View style={scaledStyles.incomeTotalRow}>
          <Text style={scaledStyles.incomeTotalLabel}>Total Income</Text>
          <Text style={scaledStyles.incomeTotalAmount}>+{formatCurrency(totalIncome)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  incomeBreakdownSection: {
    marginTop: 16,
    gap: 8,
  },
  incomeSectionHeader: {
    gap: 2,
  },
  incomeSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.gray900,
  },
  incomeSectionSubtitle: {
    fontSize: 11,
    color: palette.gray500,
  },
  incomeList: {
    gap: 0,
  },
  incomeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.slate200,
  },
  incomeIconContainer: {
    position: "relative",
  },
  incomeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.lime100,
    borderWidth: 1,
    borderColor: palette.lime400,
  },
  incomeIconOneTime: {
    backgroundColor: palette.green350,
    borderColor: palette.green400,
  },
  incomeIconText: {
    fontSize: 18,
  },
  incomeRecurringBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: palette.blue180,
    borderWidth: 2,
    borderColor: palette.white,
    alignItems: "center",
    justifyContent: "center",
  },
  incomeRecurringBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: palette.slate900,
  },
  incomeDetails: {
    flex: 1,
    gap: 2,
  },
  incomeCategory: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.green700,
  },
  incomeMeta: {
    fontSize: 12,
    color: palette.gray500,
  },
  incomeAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: palette.green700,
  },
  // Total row
  incomeTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: palette.green700,
    backgroundColor: palette.green350,
  },
  incomeTotalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.green700,
  },
  incomeTotalAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.green700,
  },
  // Empty state
  incomeEmptyState: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
    backgroundColor: palette.slate180,
    borderRadius: 12,
  },
  incomeEmptyIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  incomeEmptyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.gray700,
  },
  incomeEmptyText: {
    fontSize: 12,
    color: palette.gray500,
    textAlign: "center",
  },
  // Loading state
  incomeLoadingContainer: {
    gap: 8,
  },
  incomeSkeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  incomeSkeletonIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.sand180,
  },
  incomeSkeletonBody: {
    flex: 1,
    gap: 6,
  },
  incomeSkeletonLine: {
    height: 12,
    backgroundColor: palette.sand180,
    borderRadius: 6,
    width: "60%",
  },
  incomeSkeletonLineSm: {
    height: 10,
    backgroundColor: palette.sand180,
    borderRadius: 5,
    width: "40%",
  },
  incomeSkeletonAmount: {
    width: 70,
    height: 14,
    backgroundColor: palette.sand180,
    borderRadius: 6,
  },
  // Error state
  incomeErrorState: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
    backgroundColor: palette.red120,
    borderRadius: 12,
  },
  incomeErrorIcon: {
    fontSize: 28,
  },
  incomeErrorTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.red800,
  },
  incomeErrorText: {
    fontSize: 12,
    color: palette.red900,
    textAlign: "center",
  },
  incomeRetryButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  incomeRetryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textLight,
  },
});
