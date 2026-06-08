// @version mongoose ^6.0.0

/**
 * HUMAN TASKS:
 * 1. Verify that shopping list item categories align with the inventory/ingredient
 *    categories used by the pantry and ingredient domains for consistent classification.
 * 2. Ensure the recipe servings calculation used during list generation matches the
 *    recipe service's serving-scaling logic so generated quantities stay accurate.
 * 3. Confirm cross-platform field mapping with the iOS client, where the local model
 *    uses `isPurchased` (and `quantity: Double`); reconcile `isPurchased` <-> `checked`
 *    when serializing/deserializing shopping list payloads.
 */

/**
 * Interface for individual shopping list items with recipe association.
 * Mirrors the web `ShoppingListItem` contract field-for-field so the backend,
 * web, and iOS clients share a single canonical item shape.
 * Addresses requirement: Shopping List Management - Item tracking and categorization
 */
export interface IShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
  notes: string;
  recipeId: string;
  recipeName: string;
}

/**
 * Interface describing the options used to generate a shopping list from one or more
 * recipes. Drives recipe-sourced item aggregation, serving scaling, optional pantry
 * inventory exclusion, and duplicate merging.
 * Addresses requirement: Shopping List Generation - Customizable list generation
 */
export interface IShoppingListGenerationOptions {
  recipeIds: string[];
  servings: number;
  excludeInventoryItems: boolean;
  mergeDuplicates: boolean;
}

/**
 * Main interface for the shopping list data structure, scoped to an authenticated user
 * and persisted server-side for cross-device synchronization. Embeds the list's items
 * and, for generated lists, the generation options that produced it.
 * Addresses requirement: Shopping List Generation - List management with timestamps
 */
export interface IShoppingList {
  id: string;
  userId: string;
  name: string;
  items: IShoppingListItem[];
  generationOptions?: IShoppingListGenerationOptions;
  createdAt: Date;
  updatedAt: Date;
}
