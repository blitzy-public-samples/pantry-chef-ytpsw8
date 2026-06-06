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
  BASE: '/api/v1/shopping-lists',
  LISTS: '/api/v1/shopping-lists',
  GENERATE: '/api/v1/shopping-lists/:id/generate',
  ITEMS: '/api/v1/shopping-lists/:id/items',
  TOGGLE: '/api/v1/shopping-lists/:id/items/:itemId/toggle',
  FILTER: '/api/v1/shopping/lists/:listId/filter'
};

/**
 * Backend unified success envelope. Every shopping-list endpoint wraps its
 * payload as `{ success, data, metadata }` (see the backend recipe/user/image
 * controllers and the shopping e2e suite). The service unwraps `data` so its
 * callers — the Redux `shoppingSlice` thunks — receive domain objects
 * (`ShoppingList[]`, `ShoppingList`, `ShoppingListItem`), never the transport
 * envelope.
 */
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  metadata?: Record<string, unknown>;
}

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
      const response = await apiClient.get<ApiEnvelope<ShoppingList[]>>(SHOPPING_API.LISTS);
      // Unwrap the unified backend envelope { success, data, metadata }.
      return response.data.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Retrieves a specific shopping list by ID.
   * Requirement: Shopping List Management
   *
   * The API route contract exposes NO GET-by-id endpoint for shopping lists
   * (the six routes are GET /, POST /, PUT /:id, DELETE /:id, POST /:id/generate,
   * and PATCH /:id/items/:itemId/toggle). To honor that contract without calling
   * an unsupported route, this fetches the user's list collection and selects the
   * matching list client-side. `getShoppingLists()` already unwraps the envelope
   * and maps transport errors, so only the not-found case is added here.
   */
  async getShoppingList(id: string): Promise<ShoppingList> {
    const lists = await ShoppingService.getShoppingLists();
    const match = lists.find((list) => list.id === id);
    if (!match) {
      throw new Error(`Shopping list ${id} not found`);
    }
    return match;
  },

  /**
   * Creates a new shopping list
   * Requirement: Shopping List Management
   */
  async createShoppingList(data: Partial<ShoppingList>): Promise<ShoppingList> {
    try {
      const response = await apiClient.post<ApiEnvelope<ShoppingList>>(SHOPPING_API.LISTS, data);
      return response.data.data;
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
      const response = await apiClient.put<ApiEnvelope<ShoppingList>>(`${SHOPPING_API.LISTS}/${id}`, data);
      return response.data.data;
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
  async generateShoppingList(id: string, options: ShoppingListGenerationOptions): Promise<ShoppingList> {
    // The generate route is POST /:id/generate, so a real list id is REQUIRED.
    // Guarding here prevents building a doubled-slash URL
    // (`/api/v1/shopping-lists//generate`) that would miss the backend route.
    if (!id) {
      throw new Error('A shopping list id is required to generate a shopping list');
    }
    try {
      const endpoint = SHOPPING_API.GENERATE.replace(':id', id);
      const response = await apiClient.post<ApiEnvelope<ShoppingList>>(endpoint, options);
      return response.data.data;
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
      const endpoint = SHOPPING_API.TOGGLE
        .replace(':id', listId)
        .replace(':itemId', itemId);
      const response = await apiClient.patch<ApiEnvelope<ShoppingListItem>>(endpoint, data);
      return response.data.data;
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