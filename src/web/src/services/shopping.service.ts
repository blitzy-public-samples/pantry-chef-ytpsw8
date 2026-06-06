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

// API endpoints for shopping list operations.
// These mirror the authoritative six-route backend contract exactly (R4/R8):
// the create/update/delete operations target the mount base, while the collection
// GET targets the intentional doubled segment the backend registers (see LISTS).
const SHOPPING_API = {
  // Mount base — create (POST /), update (PUT /:id), delete (DELETE /:id):
  // effective /api/v1/shopping-lists and /api/v1/shopping-lists/:id.
  BASE: '/api/v1/shopping-lists',
  // Collection GET is the INTENTIONAL doubled segment: the backend registers the
  // router-relative GET at '/shopping-lists' under the '/api/v1/shopping-lists'
  // mount, so the effective list URL is /api/v1/shopping-lists/shopping-lists.
  // Used ONLY by getShoppingLists(); every other operation uses BASE.
  LISTS: '/api/v1/shopping-lists/shopping-lists',
  GENERATE: '/api/v1/shopping-lists/:id/generate',
  ITEMS: '/api/v1/shopping-lists/:id/items',
  TOGGLE: '/api/v1/shopping-lists/:id/items/:itemId/toggle'
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
      // POST / -> the mount base (NOT the doubled GET collection path).
      const response = await apiClient.post<ApiEnvelope<ShoppingList>>(SHOPPING_API.BASE, data);
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
      // PUT /:id -> the mount base + id (NOT the doubled GET collection path).
      const response = await apiClient.put<ApiEnvelope<ShoppingList>>(`${SHOPPING_API.BASE}/${id}`, data);
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
      // DELETE /:id -> the mount base + id (NOT the doubled GET collection path).
      await apiClient.delete(`${SHOPPING_API.BASE}/${id}`);
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
   * Toggles the `checked` state of a specific item in a shopping list.
   *
   * Targets the PATCH toggle route from the authoritative contract
   * (`/api/v1/shopping-lists/:id/items/:itemId/toggle`), which the backend
   * controller answers with the FULL updated `ShoppingList` — not the single
   * toggled item. This method therefore resolves to `ShoppingList`, matching the
   * backend's authoritative response contract and the iOS
   * `ShoppingListService.toggleItem` for cross-platform consistency (R8). The
   * unified envelope `{ success, data, metadata }` is unwrapped to `data` so
   * callers receive the domain list directly.
   *
   * Requirement: Shopping List Management
   */
  async updateShoppingListItem(
    listId: string, 
    itemId: string, 
    data: Partial<ShoppingListItem>
  ): Promise<ShoppingList> {
    try {
      const endpoint = SHOPPING_API.TOGGLE
        .replace(':id', listId)
        .replace(':itemId', itemId);
      const response = await apiClient.patch<ApiEnvelope<ShoppingList>>(endpoint, data);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Filters a shopping list's items by the supplied criteria.
   * Requirement: Simplified Grocery Shopping (1.2 Scope/Key Benefits)
   *
   * Filtering is performed CLIENT-SIDE: the authoritative six-route backend contract
   * exposes no filter endpoint (the prior `/api/v1/shopping/lists/:listId/filter`
   * route was never implemented and would hit a dead endpoint). The list is fetched
   * via `getShoppingList(listId)` — itself contract-compliant, sourcing from the
   * collection GET — and its embedded items are filtered in memory. The method
   * signature and `ShoppingListItem[]` return type are unchanged, so the
   * `useShoppingList` hook (`filterItems`) keeps working without modification.
   *
   * Filter semantics:
   * - `categories`: when non-empty, keep items whose `category` is in the set.
   * - `searchTerm`: when non-empty, keep items whose `name` contains it (case-insensitive).
   * - `showCheckedItems`: when false, drop checked-off items.
   * - `recipeId`: when non-empty, keep items originating from that recipe.
   */
  async filterShoppingList(
    listId: string,
    filter: ShoppingListFilter
  ): Promise<ShoppingListItem[]> {
    // getShoppingList already unwraps the unified envelope, maps transport errors,
    // and throws a not-found error for an unknown id, so no extra try/catch is needed.
    const list = await ShoppingService.getShoppingList(listId);

    const searchTerm = filter.searchTerm.trim().toLowerCase();
    const hasCategoryFilter = filter.categories.length > 0;

    return list.items.filter((item) => {
      if (hasCategoryFilter && !filter.categories.includes(item.category)) {
        return false;
      }
      if (searchTerm.length > 0 && !item.name.toLowerCase().includes(searchTerm)) {
        return false;
      }
      if (!filter.showCheckedItems && item.checked) {
        return false;
      }
      if (filter.recipeId.length > 0 && item.recipeId !== filter.recipeId) {
        return false;
      }
      return true;
    });
  }
};

export default ShoppingService;