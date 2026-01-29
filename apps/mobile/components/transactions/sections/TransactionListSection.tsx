import { forwardRef } from "react";
import {
  SectionList,
  StyleSheet,
  View,
  type RefreshControlProps,
  type SectionList as SectionListType,
} from "react-native";
import { colors } from "@/constants/theme";
import type { ListTransactions200Item } from "@/lib/gen/model";
import type { TransactionSection } from "@/hooks/useTransactionsSections";
import { TransactionSwipeRow } from "../widgets/TransactionSwipeRow";
import { TransactionRow } from "./TransactionRow";
import { SectionHeader } from "./SectionHeader";
import { getUTCDateKey } from "@/utils/dateHelpers";

type TransactionListSectionProps = {
  sections: TransactionSection[];
  categoryOrder: string[];
  getCategoryLabel: (id: string) => string;
  getSubcategoryLabel: (catId: string, subId?: string) => string | null;
  getIncomeCategoryLabel: (id: string) => string;
  formatMoney: (value: number) => string;
  onEdit: (tx: ListTransactions200Item) => void;
  onDelete: (txId: string, transaction: ListTransactions200Item) => void;
  onPress: (tx: ListTransactions200Item) => void;
  refreshControl?: React.ReactElement<RefreshControlProps>;
};

export const TransactionListSection = forwardRef<
  SectionListType,
  TransactionListSectionProps
>(function TransactionListSection(
  {
    sections,
    categoryOrder,
    getCategoryLabel,
    getSubcategoryLabel,
    getIncomeCategoryLabel,
    formatMoney,
    onEdit,
    onDelete,
    onPress,
    refreshControl,
  },
  ref,
) {
  const todayKey = getUTCDateKey(new Date());

  return (
    <View style={[styles.listCard, styles.listCardExpanded]}>
      <SectionList
        ref={ref}
        style={styles.sectionList}
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        stickySectionHeadersEnabled={false}
        refreshControl={refreshControl}
        renderItem={({ item }) => (
          <TransactionSwipeRow
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(String(item.id), item)}
          >
            <TransactionRow
              transaction={item}
              getCategoryLabel={getCategoryLabel}
              getSubcategoryLabel={getSubcategoryLabel}
              getIncomeCategoryLabel={getIncomeCategoryLabel}
              formatMoney={formatMoney}
              onPress={() => onPress(item)}
            />
          </TransactionSwipeRow>
        )}
        renderSectionHeader={({ section }) => (
          <SectionHeader
            title={section.title}
            total={section.total}
            categoryTotals={section.categoryTotals}
            categoryOrder={categoryOrder}
            formatMoney={formatMoney}
            sectionKey={section.dateKey}
            isToday={section.dateKey === todayKey}
          />
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 14,
    marginBottom: 12,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  listCardExpanded: {
    flex: 1,
  },
  sectionList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 12,
    paddingTop: 4,
    paddingLeft: 4,
    paddingRight: 18,
  },
  itemSeparator: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: 58,
  },
});
