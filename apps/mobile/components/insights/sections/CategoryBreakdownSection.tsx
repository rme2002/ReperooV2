import { Pressable, StyleSheet, Text, View } from "react-native";
import { Circle, Svg } from "react-native-svg";
import { alpha, colors } from "@/constants/theme";
import { GlassCard } from "@/components/shared/GlassCard";
import {
  categoryLookup,
  getCategoryLabel,
  getSubcategoryLabel,
} from "@/utils/categoryLookup";
import { fallbackSubcategoryColors } from "@/utils/insightsConstants";

interface SubcategoryData {
  id: string;
  total: number;
  percent: number;
  color: string;
}

interface CategoryData {
  id: string;
  total: number;
  percent: number;
  items: number;
  color: string;
  subcategories?: SubcategoryData[];
}

type CategoryBreakdownSectionProps = {
  categories: CategoryData[];
  activeCategoryId: string | null;
  onCategoryPress: (categoryId: string) => void;
  formatCurrency: (value: number) => string;
  width: number;
};

export function CategoryBreakdownSection({
  categories,
  activeCategoryId,
  onCategoryPress,
  formatCurrency,
  width,
}: CategoryBreakdownSectionProps) {
  return (
    <GlassCard>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Category breakdown</Text>
        <Text style={styles.subText}>Totals, share, and items</Text>
      </View>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableCell, styles.tableCategory]}>Category</Text>
        <Text style={[styles.tableCell, styles.tableNumeric]}>Total</Text>
        <Text style={[styles.tableCell, styles.tableNumeric]}>%</Text>
        <Text style={[styles.tableCell, styles.tableNumeric]}>Items</Text>
      </View>
      {categories.map((cat) => {
        const catLabel = getCategoryLabel(cat.id);
        const isActive = activeCategoryId === cat.id;
        const rawSubcategories = cat.subcategories ?? [];
        const configCategory = categoryLookup.get(cat.id);
        const configuredSubcategories = configCategory?.subcategories ?? [];
        const subcategoryDataMap = new Map(
          rawSubcategories.map((sub) => [sub.id, sub]),
        );
        const orderedSubcategories =
          configuredSubcategories.length > 0
            ? configuredSubcategories.map((configSub, index) => {
                const existing = subcategoryDataMap.get(configSub.id);
                const fallbackColor =
                  existing?.color ??
                  fallbackSubcategoryColors[
                    index % fallbackSubcategoryColors.length
                  ] ??
                  cat.color;
                return (
                  existing ?? {
                    id: configSub.id,
                    total: 0,
                    percent: 0,
                    color: fallbackColor,
                  }
                );
              })
            : rawSubcategories;
        const additionalSubcategories =
          rawSubcategories.length > configuredSubcategories.length
            ? rawSubcategories.filter(
                (sub) =>
                  !configuredSubcategories.some(
                    (configSub) => configSub.id === sub.id,
                  ),
              )
            : [];
        const subcategories = [
          ...orderedSubcategories,
          ...additionalSubcategories,
        ];
        const hasSubcategories = subcategories.length > 0;
        const compactLayout = width < 420;
        const availableWidth = width - (compactLayout ? 48 : 140);
        const subChartSize = Math.max(160, Math.min(availableWidth, 240));
        const subPieStroke = Math.max(10, subChartSize * 0.12);
        const subPieRadius = subChartSize / 2 - subPieStroke / 2;
        const subCircumference = 2 * Math.PI * subPieRadius;
        const visibleSubcategories = subcategories.filter(
          (sub) => sub.percent > 0,
        );
        const segmentCount = visibleSubcategories.length;
        const gapLength =
          segmentCount > 1 ? Math.min(6, subCircumference * 0.012) : 0;
        const subSegments = visibleSubcategories.reduce<
          {
            length: number;
            offset: number;
            color: string;
            id: string;
            fullLength: number;
          }[]
        >((acc, sub) => {
          const prevTotal = acc.reduce((sum, item) => sum + item.fullLength, 0);
          const fullLength = (sub.percent / 100) * subCircumference;
          const length = Math.max(0, fullLength - gapLength);
          return [
            ...acc,
            {
              length,
              offset: prevTotal,
              color: sub.color,
              id: sub.id,
              fullLength,
            },
          ];
        }, []);

        return (
          <View key={cat.id}>
            <Pressable
              onPress={() => onCategoryPress(cat.id)}
              style={({ pressed }) => [
                styles.tableRow,
                styles.tableRowPressable,
                isActive && styles.tableRowActive,
                pressed && styles.tableRowPressed,
              ]}
            >
              <View style={[styles.tableCategory, styles.tableCellRow]}>
                <View
                  style={[styles.legendDot, { backgroundColor: cat.color }]}
                />
                <Text style={[styles.tableText, styles.tableCell]}>
                  {catLabel}
                </Text>
              </View>
              <Text style={[styles.tableCell, styles.tableNumeric]}>
                {Math.round(cat.total)}
              </Text>
              <Text style={[styles.tableCell, styles.tableNumeric]}>
                {cat.percent}%
              </Text>
              <Text style={[styles.tableCell, styles.tableNumeric]}>
                {cat.items}
              </Text>
            </Pressable>
            {isActive && hasSubcategories && (
              <View style={styles.subCategoryPanel}>
                <Text style={styles.subCategoryTitle}>
                  {catLabel} breakdown
                </Text>
                <View
                  style={[
                    styles.subCategoryContent,
                    compactLayout && styles.subCategoryContentStacked,
                  ]}
                >
                  <View style={styles.subCategoryChartColumn}>
                    <View
                      style={[
                        styles.subCategoryChart,
                        { width: subChartSize, height: subChartSize },
                      ]}
                    >
                      <Svg
                        width={subChartSize}
                        height={subChartSize}
                        style={styles.subCategorySvg}
                      >
                        <Circle
                          cx={subChartSize / 2}
                          cy={subChartSize / 2}
                          r={subPieRadius}
                          stroke={colors.borderLight}
                          strokeWidth={subPieStroke}
                          fill="none"
                          strokeLinecap="round"
                        />
                        {subSegments.map((segment) => (
                          <Circle
                            key={`sub-segment-${segment.id}`}
                            cx={subChartSize / 2}
                            cy={subChartSize / 2}
                            r={subPieRadius}
                            stroke={segment.color}
                            strokeWidth={subPieStroke}
                            strokeDasharray={`${segment.length} ${subCircumference - segment.length}`}
                            strokeDashoffset={-segment.offset}
                            strokeLinecap="round"
                            fill="none"
                            rotation={-90}
                            originX={subChartSize / 2}
                            originY={subChartSize / 2}
                          />
                        ))}
                      </Svg>
                      <View
                        style={[
                          styles.subCategoryCenter,
                          {
                            width: subChartSize * 0.6,
                            height: subChartSize * 0.6,
                            borderRadius: (subChartSize * 0.6) / 2,
                          },
                        ]}
                      >
                        <Text style={styles.subCategoryValue}>
                          {formatCurrency(Math.round(cat.total))}
                        </Text>
                        <Text style={styles.subCategoryLabel}>Total</Text>
                      </View>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.subCategoryLegend,
                      compactLayout && styles.subCategoryLegendFull,
                    ]}
                  >
                    {subcategories.map((sub, index) => {
                      const subLabel = getSubcategoryLabel(cat.id, sub.id);
                      return (
                        <View
                          key={`${sub.id}-${index}`}
                          style={styles.legendRowSmall}
                        >
                          <View
                            style={[
                              styles.legendDot,
                              { backgroundColor: sub.color },
                            ]}
                          />
                          <View style={styles.legendTextBlock}>
                            <Text style={styles.legendLabelSmall}>
                              {subLabel}
                            </Text>
                            <Text style={styles.legendPercentSmall}>
                              {sub.percent > 0
                                ? `${sub.percent}% · ${formatCurrency(Math.round(sub.total))}`
                                : "No spending yet"}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  subText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tableRowPressable: {
    backgroundColor: "transparent",
  },
  tableRowActive: {
    backgroundColor: colors.borderLight,
  },
  tableRowPressed: {
    backgroundColor: colors.borderLight,
    opacity: 0.8,
  },
  tableCell: {
    fontSize: 14,
    color: colors.text,
  },
  tableCategory: {
    flex: 2,
  },
  tableCellRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tableNumeric: {
    flex: 1,
    textAlign: "right",
    fontWeight: "600",
  },
  tableText: {
    fontWeight: "500",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  subCategoryPanel: {
    backgroundColor: alpha.offWhite50,
    padding: 16,
    gap: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  subCategoryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  subCategoryContent: {
    flexDirection: "row",
    gap: 20,
  },
  subCategoryContentStacked: {
    flexDirection: "column",
    alignItems: "center",
  },
  subCategoryChartColumn: {
    alignItems: "center",
  },
  subCategoryChart: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  subCategorySvg: {
    position: "absolute",
  },
  subCategoryCenter: {
    backgroundColor: alpha.offWhite90,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.text,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  subCategoryValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  subCategoryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  subCategoryLegend: {
    flex: 1,
    gap: 12,
  },
  subCategoryLegendFull: {
    width: "100%",
  },
  legendRowSmall: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  legendTextBlock: {
    flex: 1,
    gap: 2,
  },
  legendLabelSmall: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text,
  },
  legendPercentSmall: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
