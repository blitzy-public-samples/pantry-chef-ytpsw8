/**
 * HUMAN TASKS:
 * 1. Verify that shopping list categories align with inventory categories in the backend
 * 2. Ensure recipe servings calculation logic matches backend implementation
 * 3. Confirm shopping list filter options with UX team
 */

// Import required interfaces from inventory and recipe interfaces
// @version: inventory.interface.ts from web/src/interfaces
import { InventoryItem } from './inventory.interface';
// @version: recipe.interface.ts from web/src/interfaces
import { Recipe } from './recipe.interface';

/**
 * Requirement: Shopping List Management - Item tracking and categorization
 * Interface for individual shopping list items with recipe association
 */
export interface ShoppingListItem {
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
 * Requirement: Shopping List Generation - List management with timestamps
 * Interface for shopping list data structure with user association
 */
export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingListItem[];
  createdAt: string;
  updatedAt: string;
  userId: string;
}

/**
 * Requirement: Shopping List Management - Advanced filtering capabilities
 * Interface for shopping list filtering options
 */
export interface ShoppingListFilter {
  categories: string[];
  searchTerm: string;
  showCheckedItems: boolean;
  recipeId: string;
  sortBy: string;
  sortDirection: string;
}

/**
 * Requirement: Shopping List Generation - Customizable list generation
 * Interface for shopping list generation options from recipes
 */
export interface ShoppingListGenerationOptions {
  recipeIds: string[];
  servings: number;
  excludeInventoryItems: boolean;
  mergeDuplicates: boolean;
}