import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import { getCategoryAccent } from "@/utils/categoryHelpers";

type SectionHeaderProps = {
  title: string;
  total: number;
  categoryTotals: Record<string, number>;
  categoryOrder: string[];
  formatMoney: (value: number) => string;
  sectionKey: string;
};

export function SectionHeader({
  title,
  total,
  categoryTotals,
  categoryOrder,
  formatMoney,
  sectionKey,
}: SectionHeaderProps) {
  const segments =
    total > 0
      ? categoryOrder
          .map((categoryId) => {
            const amount = categoryTotals[categoryId];
            if (!amount) {
              return null;
            }
            const color = getCategoryAccent(categoryId).fill;
            return (
              <View
                key={`${sectionKey}-${categoryId}`}
                style={[
                  styles.sectionBarSegment,
                  { backgroundColor: color, flex: amount },
                ]}
              />
            );
          })
          .filter(Boolean)
      : [];

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
        <Text style={styles.sectionHeaderValue}>{formatMoney(total)}</Text>
      </View>
      {total > 0 ? (
        <View style={styles.sectionBarTrack}>
          {segments.length ? segments : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingVertical: 12,
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  sectionHeaderValue: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  sectionBarTrack: {
    flexDirection: "row",
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.borderLight,
    overflow: "hidden",
  },
  sectionBarSegment: {
    height: "100%",
  },
});
