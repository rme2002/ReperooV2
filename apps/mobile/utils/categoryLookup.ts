import type { ExpenseCategory } from "@/lib/gen/model";

export const buildCategoryLookup = (categories: ExpenseCategory[]) =>
  new Map(categories.map((category) => [category.id, category]));

/**
 * Get display label for a category by ID
 * @param categoryId - Category identifier
 * @returns Display label or the ID itself if not found
 */
export const getCategoryLabel = (
  categoryLookup: Map<string, ExpenseCategory>,
  categoryId: string
): string => categoryLookup.get(categoryId)?.label ?? categoryId;

/**
 * Get display label for a subcategory by category and subcategory ID
 * @param categoryId - Parent category identifier
 * @param subcategoryId - Subcategory identifier
 * @returns Display label or the subcategory ID itself if not found
 */
export const getSubcategoryLabel = (
  categoryLookup: Map<string, ExpenseCategory>,
  categoryId: string,
  subcategoryId: string
): string =>
  categoryLookup
    .get(categoryId)
    ?.subcategories?.find((sub) => sub.id === subcategoryId)?.label ??
  subcategoryId;
