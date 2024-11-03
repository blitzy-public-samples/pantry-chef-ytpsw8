// @version: @jest/globals ^29.0.0
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
// @version: @reduxjs/toolkit ^1.9.5
import { configureStore } from '@reduxjs/toolkit';
import reducer, {
  shoppingSelectors,
  setFilter,
  toggleItemChecked,
  clearFilter,
  fetchShoppingLists,
  fetchShoppingList,
  createShoppingList,
  updateShoppingList,
  deleteShoppingList,
  generateShoppingList
} from '../../src/store/slices/shoppingSlice';
import ShoppingService from '../../src/services/shopping.service';

// Mock the ShoppingService
jest.mock('../../src/services/shopping.service');

// Test data
const mockShoppingList = {
  id: '1',
  name: 'Weekly Groceries',
  items: [
    {
      id: 'item1',
      name: 'Milk',
      quantity: 1,
      unit: 'gallon',
      category: 'Dairy',
      checked: false,
      notes: '',
      recipeId: '',
      recipeName: ''
    },
    {
      id: 'item2',
      name: 'Bread',
      quantity: 2,
      unit: 'loaf',
      category: 'Bakery',
      checked: true,
      notes: '',
      recipeId: 'recipe1',
      recipeName: 'Toast'
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'user1'
};

// Configure test store
const createTestStore = () => {
  return configureStore({
    reducer: { shopping: reducer }
  });
};

describe('Shopping Slice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    jest.clearAllMocks();
  });

  describe('Async Thunks', () => {
    // Test fetchShoppingLists success case
    test('fetchShoppingLists should fetch all shopping lists successfully', async () => {
      const lists = [mockShoppingList];
      (ShoppingService.getShoppingLists as jest.Mock).mockResolvedValue(lists);

      await store.dispatch(fetchShoppingLists());
      const state = store.getState().shopping;

      expect(state.lists).toEqual(lists);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    // Test fetchShoppingLists failure case
    test('fetchShoppingLists should handle errors', async () => {
      const error = 'Failed to fetch shopping lists';
      (ShoppingService.getShoppingLists as jest.Mock).mockRejectedValue(new Error(error));

      await store.dispatch(fetchShoppingLists());
      const state = store.getState().shopping;

      expect(state.lists).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });

    // Test fetchShoppingList success case
    test('fetchShoppingList should fetch a specific shopping list', async () => {
      (ShoppingService.getShoppingList as jest.Mock).mockResolvedValue(mockShoppingList);

      await store.dispatch(fetchShoppingList('1'));
      const state = store.getState().shopping;

      expect(state.currentList).toEqual(mockShoppingList);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    // Test createShoppingList success case
    test('createShoppingList should create a new shopping list', async () => {
      (ShoppingService.createShoppingList as jest.Mock).mockResolvedValue(mockShoppingList);

      await store.dispatch(createShoppingList({ name: 'Weekly Groceries' }));
      const state = store.getState().shopping;

      expect(state.lists).toContainEqual(mockShoppingList);
      expect(state.currentList).toEqual(mockShoppingList);
    });

    // Test updateShoppingList success case
    test('updateShoppingList should update an existing shopping list', async () => {
      const updatedList = { ...mockShoppingList, name: 'Updated List' };
      (ShoppingService.updateShoppingList as jest.Mock).mockResolvedValue(updatedList);

      // First add the original list
      store.dispatch(fetchShoppingLists.fulfilled([mockShoppingList], ''));
      
      await store.dispatch(updateShoppingList({ id: '1', data: { name: 'Updated List' } }));
      const state = store.getState().shopping;

      expect(state.lists[0].name).toBe('Updated List');
    });

    // Test deleteShoppingList success case
    test('deleteShoppingList should remove a shopping list', async () => {
      (ShoppingService.deleteShoppingList as jest.Mock).mockResolvedValue(undefined);

      // First add the list
      store.dispatch(fetchShoppingLists.fulfilled([mockShoppingList], ''));
      
      await store.dispatch(deleteShoppingList('1'));
      const state = store.getState().shopping;

      expect(state.lists).toHaveLength(0);
      expect(state.currentList).toBeNull();
    });

    // Test generateShoppingList success case
    test('generateShoppingList should create a list from recipes', async () => {
      const generatedList = {
        ...mockShoppingList,
        id: '2',
        name: 'Generated List'
      };
      (ShoppingService.generateShoppingList as jest.Mock).mockResolvedValue(generatedList);

      const options = {
        recipeIds: ['recipe1'],
        servings: 4,
        excludeInventoryItems: true,
        mergeDuplicates: true
      };

      await store.dispatch(generateShoppingList(options));
      const state = store.getState().shopping;

      expect(state.lists).toContainEqual(generatedList);
      expect(state.currentList).toEqual(generatedList);
    });
  });

  describe('Actions', () => {
    // Test setFilter action
    test('setFilter should update filter state', () => {
      const filter = {
        categories: ['Dairy'],
        searchTerm: 'milk',
        showCheckedItems: false
      };

      store.dispatch(setFilter(filter));
      const state = store.getState().shopping;

      expect(state.filter.categories).toEqual(['Dairy']);
      expect(state.filter.searchTerm).toBe('milk');
      expect(state.filter.showCheckedItems).toBe(false);
    });

    // Test toggleItemChecked action
    test('toggleItemChecked should toggle item checked status', () => {
      // First add a list
      store.dispatch(fetchShoppingLists.fulfilled([mockShoppingList], ''));
      
      store.dispatch(toggleItemChecked({ listId: '1', itemId: 'item1' }));
      const state = store.getState().shopping;

      const item = state.lists[0].items.find(i => i.id === 'item1');
      expect(item?.checked).toBe(true);
    });

    // Test clearFilter action
    test('clearFilter should reset filter to initial state', () => {
      // First set some filters
      store.dispatch(setFilter({
        categories: ['Dairy'],
        searchTerm: 'milk',
        showCheckedItems: false
      }));

      store.dispatch(clearFilter());
      const state = store.getState().shopping;

      expect(state.filter.categories).toEqual([]);
      expect(state.filter.searchTerm).toBe('');
      expect(state.filter.showCheckedItems).toBe(true);
    });
  });

  describe('Selectors', () => {
    beforeEach(() => {
      // Initialize state with test data
      store.dispatch(fetchShoppingLists.fulfilled([mockShoppingList], ''));
      store.dispatch(fetchShoppingList.fulfilled(mockShoppingList, '', '1'));
    });

    // Test selectAllLists selector
    test('selectAllLists should return all shopping lists', () => {
      const lists = shoppingSelectors.selectAllLists(store.getState());
      expect(lists).toEqual([mockShoppingList]);
    });

    // Test selectCurrentList selector
    test('selectCurrentList should return the current shopping list', () => {
      const currentList = shoppingSelectors.selectCurrentList(store.getState());
      expect(currentList).toEqual(mockShoppingList);
    });

    // Test selectFilter selector
    test('selectFilter should return the current filter state', () => {
      const filter = {
        categories: ['Dairy'],
        searchTerm: 'milk'
      };
      store.dispatch(setFilter(filter));

      const currentFilter = shoppingSelectors.selectFilter(store.getState());
      expect(currentFilter.categories).toEqual(['Dairy']);
      expect(currentFilter.searchTerm).toBe('milk');
    });

    // Test selectFilteredItems selector with various filters
    test('selectFilteredItems should filter items correctly', () => {
      // Test category filter
      store.dispatch(setFilter({ categories: ['Dairy'] }));
      let filteredItems = shoppingSelectors.selectFilteredItems(store.getState());
      expect(filteredItems).toHaveLength(1);
      expect(filteredItems[0].name).toBe('Milk');

      // Test search term filter
      store.dispatch(setFilter({ categories: [], searchTerm: 'bread' }));
      filteredItems = shoppingSelectors.selectFilteredItems(store.getState());
      expect(filteredItems).toHaveLength(1);
      expect(filteredItems[0].name).toBe('Bread');

      // Test checked items filter
      store.dispatch(setFilter({ categories: [], searchTerm: '', showCheckedItems: false }));
      filteredItems = shoppingSelectors.selectFilteredItems(store.getState());
      expect(filteredItems).toHaveLength(1);
      expect(filteredItems[0].checked).toBe(false);

      // Test recipe filter
      store.dispatch(setFilter({ categories: [], searchTerm: '', showCheckedItems: true, recipeId: 'recipe1' }));
      filteredItems = shoppingSelectors.selectFilteredItems(store.getState());
      expect(filteredItems).toHaveLength(1);
      expect(filteredItems[0].recipeId).toBe('recipe1');
    });
  });
});