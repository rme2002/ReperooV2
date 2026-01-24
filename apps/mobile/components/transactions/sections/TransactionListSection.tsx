import { SectionList, StyleSheet, View } from "react-native";
import { colors } from "@/constants/theme";
import type { TransactionEntry } from "@/components/dummy_data/transactions";
import type { TransactionSection } from "@/hooks/useTransactionsSections";
import { TransactionSwipeRow } from "../widgets/TransactionSwipeRow";
import { TransactionRow } from "./TransactionRow";
import { SectionHeader } from "./SectionHeader";

type TransactionListSectionProps = {
  sections: TransactionSection[];
  categoryOrder: string[];
  getCategoryLabel: (id: string) => string;
  getSubcategoryLabel: (catId: string, subId?: string) => string | null;
  getIncomeCategoryLabel: (id: string) => string;
  formatMoney: (value: number) => string;
  onEdit: (tx: TransactionEntry) => void;
  onDelete: (txId: string) => void;
  onPress: (tx: TransactionEntry) => void;
};

export function TransactionListSection({
  sections,
  categoryOrder,
  getCategoryLabel,
  getSubcategoryLabel,
  getIncomeCategoryLabel,
  formatMoney,
  onEdit,
  onDelete,
  onPress,
}: TransactionListSectionProps) {
  return (
    <View style={[styles.listCard, styles.listCardExpanded]}>
      <SectionList
        style={styles.sectionList}
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        renderItem={({ item }) => (
          <TransactionSwipeRow
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(item.id)}
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
          />
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
      />
    </View>
  );
}

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
