/**
 * HUMAN TASKS:
 * 1. Configure shopping list API endpoints in environment variables
 * 2. Set up error tracking for shopping list operations
 * 3. Verify shopping list generation logic with backend team
 * 4. Configure caching parameters for shopping list data
 */

// External dependencies
// @version: axios ^1.4.0
import { AxiosError } from 'axios';

// Internal dependencies
import { 
  ShoppingList, 
  ShoppingListItem, 
  ShoppingListFilter, 
  ShoppingListGenerationOptions 
} from '../interfaces/shopping.interface';
import { apiClient, handleApiError } from '../utils/api';

// API endpoints for shopping list operations
const SHOPPING_API = {
  BASE: '/api/v1/shopping',
  LISTS: '/api/v1/shopping/lists',
  GENERATE: '/api/v1/shopping/generate',
  ITEMS: '/api/v1/shopping/lists/:listId/items',
  FILTER: '/api/v1/shopping/lists/:listId/filter'
};

/**
 * Service module implementing shopping list management functionality
 * Requirement: Shopping List Management (8.1 User Interface Design/Screen Components)
 */
const ShoppingService = {
  /**
   * Retrieves all shopping lists for the current user
   * Requirement: Shopping List Management
   */
  async getShoppingLists(): Promise<ShoppingList[]> {
    try {
      const response = await apiClient.get<ShoppingList[]>(SHOPPING_API.LISTS);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Retrieves a specific shopping list by ID
   * Requirement: Shopping List Management
   */
  async getShoppingList(id: string): Promise<ShoppingList> {
    try {
      const response = await apiClient.get<ShoppingList>(`${SHOPPING_API.LISTS}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Creates a new shopping list
   * Requirement: Shopping List Management
   */
  async createShoppingList(data: Partial<ShoppingList>): Promise<ShoppingList> {
    try {
      const response = await apiClient.post<ShoppingList>(SHOPPING_API.LISTS, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Updates an existing shopping list
   * Requirement: Shopping List Management
   */
  async updateShoppingList(id: string, data: Partial<ShoppingList>): Promise<ShoppingList> {
    try {
      const response = await apiClient.put<ShoppingList>(`${SHOPPING_API.LISTS}/${id}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Deletes a shopping list
   * Requirement: Shopping List Management
   */
  async deleteShoppingList(id: string): Promise<void> {
    try {
      await apiClient.delete(`${SHOPPING_API.LISTS}/${id}`);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Generates a shopping list from selected recipes
   * Requirement: Shopping List Generation (1.2 Scope/Core Capabilities)
   */
  async generateShoppingList(options: ShoppingListGenerationOptions): Promise<ShoppingList> {
    try {
      const response = await apiClient.post<ShoppingList>(SHOPPING_API.GENERATE, options);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Updates a specific item in a shopping list
   * Requirement: Shopping List Management
   */
  async updateShoppingListItem(
    listId: string, 
    itemId: string, 
    data: Partial<ShoppingListItem>
  ): Promise<ShoppingListItem> {
    try {
      const endpoint = SHOPPING_API.ITEMS.replace(':listId', listId);
      const response = await apiClient.put<ShoppingListItem>(
        `${endpoint}/${itemId}`, 
        data
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Filters shopping list items based on criteria
   * Requirement: Simplified Grocery Shopping (1.2 Scope/Key Benefits)
   */
  async filterShoppingList(
    listId: string, 
    filter: ShoppingListFilter
  ): Promise<ShoppingListItem[]> {
    try {
      const endpoint = SHOPPING_API.FILTER.replace(':listId', listId);
      const response = await apiClient.get<ShoppingListItem[]>(endpoint, {
        params: {
          categories: filter.categories.join(','),
          searchTerm: filter.searchTerm,
          showCheckedItems: filter.showCheckedItems,
          recipeId: filter.recipeId
        }
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }
};

export default ShoppingService;