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
  isToday?: boolean;
};

export function SectionHeader({
  title,
  total,
  categoryTotals,
  categoryOrder,
  formatMoney,
  sectionKey,
  isToday = false,
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
    <View style={[styles.sectionHeader, isToday && styles.todayHeader]}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.sectionHeaderTitle, isToday && styles.todayTitle]}
          >
            {title}
          </Text>
          {isToday && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>•</Text>
            </View>
          )}
        </View>
        <Text style={[styles.sectionHeaderValue, isToday && styles.todayValue]}>
          {formatMoney(total)}
        </Text>
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
  todayHeader: {
    backgroundColor: "rgba(31, 138, 91, 0.05)",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: -12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  todayTitle: {
    color: colors.primary,
  },
  todayValue: {
    color: colors.primary,
  },
  todayBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  todayBadgeText: {
    fontSize: 18,
    lineHeight: 18,
    color: colors.primary,
    fontWeight: "700",
  },
});
