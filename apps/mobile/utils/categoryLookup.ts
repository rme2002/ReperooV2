import spendingCategories from "../../../shared/config/spending-categories.json";

/**
 * Type definition for spending categories configuration
 */
type SpendingCategoriesConfig = {
  categories: {
    id: string;
    label: string;
    icon: string;
    subcategories?: { id: string; label: string }[];
  }[];
};

/**
 * Loaded spending categories configuration
 */
const categoryConfig: SpendingCategoriesConfig = spendingCategories;

/**
 * Map for fast category lookups by ID
 */
export const categoryLookup = new Map(
  categoryConfig.categories.map((category) => [category.id, category])
);

/**
 * Get display label for a category by ID
 * @param categoryId - Category identifier
 * @returns Display label or the ID itself if not found
 */
export const getCategoryLabel = (categoryId: string): string =>
  categoryLookup.get(categoryId)?.label ?? categoryId;

/**
 * Get display label for a subcategory by category and subcategory ID
 * @param categoryId - Parent category identifier
 * @param subcategoryId - Subcategory identifier
 * @returns Display label or the subcategory ID itself if not found
 */
export const getSubcategoryLabel = (
  categoryId: string,
  subcategoryId: string
): string =>
  categoryLookup
    .get(categoryId)
    ?.subcategories?.find((sub) => sub.id === subcategoryId)?.label ??
  subcategoryId;
