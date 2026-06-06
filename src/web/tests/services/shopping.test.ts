// External dependencies
// @version: jest ^29.0.0
import { describe, beforeEach, afterEach, it, expect } from '@jest/globals';
// @version: axios-mock-adapter ^1.21.0
import MockAdapter from 'axios-mock-adapter';

// Internal dependencies
import ShoppingService from '../../src/services/shopping.service';
import { apiClient } from '../../src/utils/api';
import { 
  ShoppingList, 
  ShoppingListItem, 
  ShoppingListFilter, 
  ShoppingListGenerationOptions 
} from '../../src/interfaces/shopping.interface';

// Wraps a payload in the backend's unified success envelope { success, data,
// metadata }. The service unwraps `.data.data`, so success mocks must use this.
function envelope<T>(data: T) {
  return { success: true, data, metadata: {} };
}

// axios-mock-adapter serializes every reply body through JSON, so `Date` fields
// (createdAt/updatedAt) round-trip back as ISO strings — exactly as the real
// HTTP API returns them and as the service (which does not re-hydrate dates)
// surfaces them. Normalize expected fixtures the same way before deep-equality.
function serialized<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

describe('ShoppingService', () => {
  let mockApi: MockAdapter;

  // Mock data for testing
  const mockShoppingListItem: ShoppingListItem = {
    id: 'item1',
    name: 'Tomatoes',
    quantity: 2,
    unit: 'kg',
    category: 'Vegetables',
    checked: false,
    notes: 'Ripe ones please',
    recipeId: 'recipe1',
    recipeName: 'Pasta Sauce'
  };

  const mockShoppingList: ShoppingList = {
    id: 'list1',
    name: 'Weekly Groceries',
    items: [mockShoppingListItem],
    userId: 'user1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockFilter: ShoppingListFilter = {
    categories: ['Vegetables', 'Fruits'],
    searchTerm: 'tomato',
    showCheckedItems: false,
    recipeId: 'recipe1'
  };

  const mockGenerationOptions: ShoppingListGenerationOptions = {
    recipeIds: ['recipe1', 'recipe2'],
    servings: 4,
    excludeInventoryItems: true,
    mergeDuplicates: true
  };

  beforeEach(() => {
    // Initialize mock adapter before each test
    mockApi = new MockAdapter(apiClient);
  });

  afterEach(() => {
    // Clean up mock adapter after each test
    mockApi.reset();
    mockApi.restore();
  });

  // Test: getShoppingLists
  describe('getShoppingLists', () => {
    it('should fetch all shopping lists successfully', async () => {
      // Requirement: Shopping List Management
      mockApi.onGet('/api/v1/shopping-lists').reply(200, envelope([mockShoppingList]));

      const result = await ShoppingService.getShoppingLists();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(serialized(mockShoppingList));
    });

    it('should handle error when fetching shopping lists fails', async () => {
      mockApi.onGet('/api/v1/shopping-lists').reply(500);

      await expect(ShoppingService.getShoppingLists()).rejects.toThrow('Internal server error');
    });
  });

  // Test: getShoppingList
  // The API contract has NO GET-by-id route; the service fetches the list
  // collection (GET /api/v1/shopping-lists) and selects the match client-side.
  describe('getShoppingList', () => {
    it('should fetch a specific shopping list by ID', async () => {
      // Requirement: Shopping List Management
      mockApi.onGet('/api/v1/shopping-lists').reply(200, envelope([mockShoppingList]));

      const result = await ShoppingService.getShoppingList('list1');
      expect(result).toEqual(serialized(mockShoppingList));
    });

    it('should throw when the list ID does not exist in the collection', async () => {
      mockApi.onGet('/api/v1/shopping-lists').reply(200, envelope([mockShoppingList]));

      await expect(ShoppingService.getShoppingList('nonexistent')).rejects.toThrow('not found');
    });
  });

  // Test: createShoppingList
  describe('createShoppingList', () => {
    it('should create a new shopping list successfully', async () => {
      // Requirement: Shopping List Management
      const newList = { name: 'New List', items: [] };
      mockApi.onPost('/api/v1/shopping-lists').reply(201, envelope(mockShoppingList));

      const result = await ShoppingService.createShoppingList(newList);
      expect(result).toEqual(serialized(mockShoppingList));
    });

    it('should handle validation errors during list creation', async () => {
      const invalidList = { items: 'invalid' };
      mockApi.onPost('/api/v1/shopping-lists').reply(400, { message: 'Invalid list data' });

      // handleApiError surfaces the server-provided `message` for 400s
      // (falling back to a generic 'Invalid request' only when absent).
      await expect(ShoppingService.createShoppingList(invalidList)).rejects.toThrow('Invalid list data');
    });
  });

  // Test: updateShoppingList
  describe('updateShoppingList', () => {
    it('should update an existing shopping list', async () => {
      // Requirement: Shopping List Management
      const updates = { name: 'Updated List' };
      mockApi.onPut('/api/v1/shopping-lists/list1').reply(200, envelope({ ...mockShoppingList, ...updates }));

      const result = await ShoppingService.updateShoppingList('list1', updates);
      expect(result.name).toBe('Updated List');
    });

    it('should handle partial updates correctly', async () => {
      const partialUpdate = { items: [{ ...mockShoppingListItem, checked: true }] };
      mockApi.onPut('/api/v1/shopping-lists/list1').reply(200, envelope({ ...mockShoppingList, ...partialUpdate }));

      const result = await ShoppingService.updateShoppingList('list1', partialUpdate);
      expect(result.items[0].checked).toBe(true);
    });
  });

  // Test: deleteShoppingList
  describe('deleteShoppingList', () => {
    it('should delete a shopping list successfully', async () => {
      // Requirement: Shopping List Management
      mockApi.onDelete('/api/v1/shopping-lists/list1').reply(204);

      await expect(ShoppingService.deleteShoppingList('list1')).resolves.not.toThrow();
    });

    it('should handle deletion of non-existent list', async () => {
      mockApi.onDelete('/api/v1/shopping-lists/nonexistent').reply(404);

      await expect(ShoppingService.deleteShoppingList('nonexistent')).rejects.toThrow('Resource not found');
    });
  });

  // Test: generateShoppingList
  describe('generateShoppingList', () => {
    it('should generate shopping list from recipes', async () => {
      // Requirement: Shopping List Generation
      mockApi.onPost('/api/v1/shopping-lists/list1/generate').reply(201, envelope(mockShoppingList));

      const result = await ShoppingService.generateShoppingList('list1', mockGenerationOptions);
      expect(result).toEqual(serialized(mockShoppingList));
    });

    it('should handle recipe-based quantity calculations', async () => {
      const optionsWithServings = { ...mockGenerationOptions, servings: 6 };
      const adjustedList = {
        ...mockShoppingList,
        items: [{ ...mockShoppingListItem, quantity: 3 }]
      };
      mockApi.onPost('/api/v1/shopping-lists/list1/generate').reply(201, envelope(adjustedList));

      const result = await ShoppingService.generateShoppingList('list1', optionsWithServings);
      expect(result.items[0].quantity).toBe(3);
    });

    it('should reject when no list id is supplied (no doubled-slash URL)', async () => {
      await expect(
        ShoppingService.generateShoppingList('', mockGenerationOptions)
      ).rejects.toThrow('id is required');
    });
  });

  // Test: updateShoppingListItem
  // Item updates use the PATCH toggle route from the authoritative contract:
  // PATCH /api/v1/shopping-lists/:id/items/:itemId/toggle, returning the
  // unified envelope { success, data, metadata }.
  describe('updateShoppingListItem', () => {
    it('should update a specific shopping list item', async () => {
      // Requirement: Shopping List Management
      const itemUpdate = { checked: true, notes: 'Updated notes' };
      mockApi.onPatch('/api/v1/shopping-lists/list1/items/item1/toggle').reply(200, envelope({
        ...mockShoppingListItem,
        ...itemUpdate
      }));

      const result = await ShoppingService.updateShoppingListItem('list1', 'item1', itemUpdate);
      expect(result.checked).toBe(true);
      expect(result.notes).toBe('Updated notes');
    });

    it('should handle invalid item updates', async () => {
      const invalidUpdate = { quantity: -1 };
      // Body is an empty object (no `message`) so handleApiError falls back to
      // the generic 'Invalid request' message for the 400 branch.
      mockApi.onPatch('/api/v1/shopping-lists/list1/items/item1/toggle').reply(400, {});

      await expect(
        ShoppingService.updateShoppingListItem('list1', 'item1', invalidUpdate)
      ).rejects.toThrow('Invalid request');
    });
  });

  // Test: filterShoppingList
  describe('filterShoppingList', () => {
    it('should filter shopping list items by criteria', async () => {
      // Requirement: Simplified Grocery Shopping
      mockApi.onGet('/api/v1/shopping/lists/list1/filter').reply(200, [mockShoppingListItem]);

      const result = await ShoppingService.filterShoppingList('list1', mockFilter);
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('Vegetables');
    });

    it('should handle multiple filter criteria correctly', async () => {
      const complexFilter: ShoppingListFilter = {
        ...mockFilter,
        categories: ['Vegetables', 'Fruits'],
        showCheckedItems: true
      };

      mockApi.onGet('/api/v1/shopping/lists/list1/filter').reply(200, [mockShoppingListItem]);

      const result = await ShoppingService.filterShoppingList('list1', complexFilter);
      expect(result).toHaveLength(1);
    });

    it('should return empty array for no matches', async () => {
      const noMatchFilter: ShoppingListFilter = {
        ...mockFilter,
        searchTerm: 'nonexistent'
      };

      mockApi.onGet('/api/v1/shopping/lists/list1/filter').reply(200, []);

      const result = await ShoppingService.filterShoppingList('list1', noMatchFilter);
      expect(result).toHaveLength(0);
    });
  });
});