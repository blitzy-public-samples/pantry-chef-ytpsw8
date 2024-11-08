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
    recipeId: 'recipe1',
    sortBy: '',
    sortDirection: '',
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
      mockApi.onGet('/api/v1/shopping/lists').reply(200, [mockShoppingList]);

      const result = await ShoppingService.getShoppingLists();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockShoppingList);
    });

    it('should handle error when fetching shopping lists fails', async () => {
      mockApi.onGet('/api/v1/shopping/lists').reply(500);

      await expect(ShoppingService.getShoppingLists()).rejects.toThrow('Internal server error');
    });
  });

  // Test: getShoppingList
  describe('getShoppingList', () => {
    it('should fetch a specific shopping list by ID', async () => {
      // Requirement: Shopping List Management
      mockApi.onGet('/api/v1/shopping/lists/list1').reply(200, mockShoppingList);

      const result = await ShoppingService.getShoppingList('list1');
      expect(result).toEqual(mockShoppingList);
    });

    it('should handle non-existent list ID', async () => {
      mockApi.onGet('/api/v1/shopping/lists/nonexistent').reply(404);

      await expect(ShoppingService.getShoppingList('nonexistent')).rejects.toThrow('Resource not found');
    });
  });

  // Test: createShoppingList
  describe('createShoppingList', () => {
    it('should create a new shopping list successfully', async () => {
      // Requirement: Shopping List Management
      const newList = { name: 'New List', items: [] };
      mockApi.onPost('/api/v1/shopping/lists').reply(201, mockShoppingList);

      const result = await ShoppingService.createShoppingList(newList);
      expect(result).toEqual(mockShoppingList);
    });

    it('should handle validation errors during list creation', async () => {
      const invalidList = { items: [] }; //{ items: 'invalid' }?
      mockApi.onPost('/api/v1/shopping/lists').reply(400, { message: 'Invalid list data' });

      await expect(ShoppingService.createShoppingList(invalidList)).rejects.toThrow('Invalid request');
    });
  });

  // Test: updateShoppingList
  describe('updateShoppingList', () => {
    it('should update an existing shopping list', async () => {
      // Requirement: Shopping List Management
      const updates = { name: 'Updated List' };
      mockApi.onPut('/api/v1/shopping/lists/list1').reply(200, { ...mockShoppingList, ...updates });

      const result = await ShoppingService.updateShoppingList('list1', updates);
      expect(result.name).toBe('Updated List');
    });

    it('should handle partial updates correctly', async () => {
      const partialUpdate = { items: [{ ...mockShoppingListItem, checked: true }] };
      mockApi.onPut('/api/v1/shopping/lists/list1').reply(200, { ...mockShoppingList, ...partialUpdate });

      const result = await ShoppingService.updateShoppingList('list1', partialUpdate);
      expect(result.items[0].checked).toBe(true);
    });
  });

  // Test: deleteShoppingList
  describe('deleteShoppingList', () => {
    it('should delete a shopping list successfully', async () => {
      // Requirement: Shopping List Management
      mockApi.onDelete('/api/v1/shopping/lists/list1').reply(204);

      await expect(ShoppingService.deleteShoppingList('list1')).resolves.not.toThrow();
    });

    it('should handle deletion of non-existent list', async () => {
      mockApi.onDelete('/api/v1/shopping/lists/nonexistent').reply(404);

      await expect(ShoppingService.deleteShoppingList('nonexistent')).rejects.toThrow('Resource not found');
    });
  });

  // Test: generateShoppingList
  describe('generateShoppingList', () => {
    it('should generate shopping list from recipes', async () => {
      // Requirement: Shopping List Generation
      mockApi.onPost('/api/v1/shopping/generate').reply(200, mockShoppingList);

      const result = await ShoppingService.generateShoppingList(mockGenerationOptions);
      expect(result).toEqual(mockShoppingList);
    });

    it('should handle recipe-based quantity calculations', async () => {
      const optionsWithServings = { ...mockGenerationOptions, servings: 6 };
      const adjustedList = {
        ...mockShoppingList,
        items: [{ ...mockShoppingListItem, quantity: 3 }]
      };
      mockApi.onPost('/api/v1/shopping/generate').reply(200, adjustedList);

      const result = await ShoppingService.generateShoppingList(optionsWithServings);
      expect(result.items[0].quantity).toBe(3);
    });
  });

  // Test: updateShoppingListItem
  describe('updateShoppingListItem', () => {
    it('should update a specific shopping list item', async () => {
      // Requirement: Shopping List Management
      const itemUpdate = { checked: true, notes: 'Updated notes' };
      mockApi.onPut('/api/v1/shopping/lists/list1/items/item1').reply(200, {
        ...mockShoppingListItem,
        ...itemUpdate
      });

      const result = await ShoppingService.updateShoppingListItem('list1', 'item1', itemUpdate);
      expect(result.checked).toBe(true);
      expect(result.notes).toBe('Updated notes');
    });

    it('should handle invalid item updates', async () => {
      const invalidUpdate = { quantity: -1 };
      mockApi.onPut('/api/v1/shopping/lists/list1/items/item1').reply(400);

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