import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { alpha, colors, palette } from "@/constants/theme";
import type { ExpenseCategory } from "@/lib/gen/model";

type FilterBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  activeCategories: string[];
  showRecurringOnly: boolean;
  onCategoriesChange: (categoryIds: string[]) => void;
  onRecurringChange: (value: boolean) => void;
  categories: ExpenseCategory[];
};

const SHEET_HEIGHT = 500;

export function FilterBottomSheet({
  visible,
  onClose,
  activeCategories,
  showRecurringOnly,
  onCategoriesChange,
  onRecurringChange,
  categories,
}: FilterBottomSheetProps) {
  const [mounted, setMounted] = useState(visible);
  const [localCategories, setLocalCategories] = useState<string[]>(activeCategories);
  const [localRecurring, setLocalRecurring] = useState(showRecurringOnly);

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      // Reset local state when opening
      setLocalCategories(activeCategories);
      setLocalRecurring(showRecurringOnly);

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible, activeCategories, showRecurringOnly, translateY, overlayOpacity, mounted]);

  if (!mounted) return null;

  const handleClose = () => {
    if (visible) {
      onClose();
    }
  };

  const handleClearAll = () => {
    setLocalCategories([]);
    setLocalRecurring(false);
  };

  const handleApply = () => {
    onCategoriesChange(localCategories);
    onRecurringChange(localRecurring);
    onClose();
  };

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.backdrop,
          { opacity: overlayOpacity },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={styles.dragIndicator} />

        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Filters</Text>
          <Pressable onPress={handleClose} hitSlop={16}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetContent}
        >
          {/* Category Section */}
          <View style={styles.surface}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Categories</Text>
              {localCategories.length > 0 && (
                <Text style={styles.selectionCount}>
                  {localCategories.length} selected
                </Text>
              )}
            </View>

            {/* All Categories Option */}
            <Pressable
              onPress={() => setLocalCategories([])}
              style={styles.categoryItem}
            >
              <View style={styles.checkbox}>
                {localCategories.length === 0 && (
                  <View style={styles.checkboxChecked} />
                )}
              </View>
              <View style={[styles.categoryColorDot, { backgroundColor: colors.textSecondary }]} />
              <Text style={styles.categoryItemLabel}>All Categories</Text>
            </Pressable>

            {/* Category Checkboxes */}
            {categories.map((category) => {
              const isSelected = localCategories.includes(category.id);
              return (
                <Pressable
                  key={category.id}
                  onPress={() => {
                    setLocalCategories((prev) =>
                      prev.includes(category.id)
                        ? prev.filter((id) => id !== category.id)
                        : [...prev, category.id]
                    );
                  }}
                  style={styles.categoryItem}
                >
                  <View style={styles.checkbox}>
                    {isSelected && <View style={styles.checkboxChecked} />}
                  </View>
                  <View
                    style={[
                      styles.categoryColorDot,
                      { backgroundColor: category.color || colors.primary },
                    ]}
                  />
                  <Text style={styles.categoryItemLabel}>{category.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Recurring Section */}
          <View style={styles.surface}>
            <Text style={styles.sectionTitle}>Transaction Type</Text>
            <View style={styles.toggleRow}>
              <Pressable
                onPress={() => setLocalRecurring(false)}
                style={[
                  styles.toggleButton,
                  !localRecurring && styles.toggleButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    !localRecurring && styles.toggleButtonTextActive,
                  ]}
                >
                  All Transactions
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setLocalRecurring(true)}
                style={[
                  styles.toggleButton,
                  localRecurring && styles.toggleButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    localRecurring && styles.toggleButtonTextActive,
                  ]}
                >
                  Recurring Only
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable onPress={handleClearAll} hitSlop={8}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.applyButton,
              pressed && styles.applyButtonPressed,
            ]}
            onPress={handleApply}
          >
            <Text style={styles.applyButtonText}>Apply</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: alpha.black35,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: SHEET_HEIGHT,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 32,
  },
  dragIndicator: {
    width: 60,
    height: 5,
    borderRadius: 999,
    alignSelf: "center",
    backgroundColor: colors.borderLight,
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "600",
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  sheetContent: {
    gap: 16,
    paddingBottom: 20,
  },
  surface: {
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  selectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 12,
    borderRadius: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: palette.slate300,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryItemLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  toggleButtonTextActive: {
    color: colors.textLight,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  clearAllText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  applyButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  applyButtonPressed: {
    opacity: 0.85,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textLight,
  },
});
