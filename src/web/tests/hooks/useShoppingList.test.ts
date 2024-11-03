/**
 * HUMAN TASKS:
 * 1. Configure test environment variables for shopping list API endpoints
 * 2. Set up test data fixtures for shopping list items
 * 3. Verify mock service responses match production API structure
 */

// External dependencies
// @version: @testing-library/react-hooks ^8.0.1
import { renderHook, act } from '@testing-library/react-hooks';
// @version: @testing-library/react ^13.0.0
import { act as reactAct } from '@testing-library/react';
// @version: react-redux ^8.0.0
import { Provider } from 'react-redux';
// @version: @reduxjs/toolkit ^1.9.0
import { configureStore } from '@reduxjs/toolkit';
// @version: jest ^29.0.0
import { jest } from '@jest/globals';

// Internal dependencies
import useShoppingList from '../../src/hooks/useShoppingList';
import ShoppingService from '../../src/services/shopping.service';
import { ShoppingList, ShoppingListItem } from '../../src/interfaces/shopping.interface';

// Mock shopping service
jest.mock('../../src/services/shopping.service');

// Mock shopping list data
const mockShoppingList: ShoppingList = {
  id: '1',
  name: 'Weekly Groceries',
  items: [
    {
      id: '1',
      name: 'Milk',
      quantity: 1,
      unit: 'gallon',
      category: 'Dairy',
      checked: false,
      notes: '',
      recipeId: '',
      recipeName: ''
    }
  ],
  userId: 'user1',
  createdAt: new Date(),
  updatedAt: new Date()
};

// Mock store setup
const mockStore = configureStore({
  reducer: {
    shopping: (state = {
      lists: [],
      loading: false,
      error: null
    }, action) => {
      switch (action.type) {
        case 'shopping/fetchShoppingLists':
          return { ...state, lists: [mockShoppingList] };
        default:
          return state;
      }
    }
  }
});

// Test wrapper component
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={mockStore}>
    {children}
  </Provider>
);

describe('useShoppingList', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Set up service mocks
    (ShoppingService.getShoppingLists as jest.Mock).mockResolvedValue([mockShoppingList]);
    (ShoppingService.createShoppingList as jest.Mock).mockResolvedValue(mockShoppingList);
    (ShoppingService.updateShoppingList as jest.Mock).mockResolvedValue(mockShoppingList);
    (ShoppingService.deleteShoppingList as jest.Mock).mockResolvedValue(undefined);
    (ShoppingService.generateShoppingList as jest.Mock).mockResolvedValue(mockShoppingList);
    (ShoppingService.updateShoppingListItem as jest.Mock).mockResolvedValue(mockShoppingList.items[0]);
    (ShoppingService.filterShoppingList as jest.Mock).mockResolvedValue(mockShoppingList.items);
  });

  /**
   * Test: Initial shopping list fetching
   * Requirement: Shopping List Management
   */
  it('should fetch shopping lists on mount', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useShoppingList(), { wrapper });

    // Initial loading state
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    await waitForNextUpdate();

    // Verify final state
    expect(result.current.loading).toBe(false);
    expect(result.current.shoppingLists).toEqual([mockShoppingList]);
    expect(ShoppingService.getShoppingLists).toHaveBeenCalledTimes(1);
  });

  /**
   * Test: Shopping list creation
   * Requirement: Shopping List Management
   */
  it('should handle shopping list creation', async () => {
    const { result } = renderHook(() => useShoppingList(), { wrapper });
    const newList = { name: 'New List' };

    await act(async () => {
      await result.current.createList(newList);
    });

    expect(ShoppingService.createShoppingList).toHaveBeenCalledWith(newList);
  });

  /**
   * Test: Shopping list updates
   * Requirement: Shopping List Management
   */
  it('should handle shopping list updates', async () => {
    const { result } = renderHook(() => useShoppingList(), { wrapper });
    const updates = { name: 'Updated List' };

    await act(async () => {
      await result.current.updateList('1', updates);
    });

    expect(ShoppingService.updateShoppingList).toHaveBeenCalledWith('1', updates);
  });

  /**
   * Test: Shopping list deletion
   * Requirement: Shopping List Management
   */
  it('should handle shopping list deletion', async () => {
    const { result } = renderHook(() => useShoppingList(), { wrapper });

    await act(async () => {
      await result.current.deleteList('1');
    });

    expect(ShoppingService.deleteShoppingList).toHaveBeenCalledWith('1');
  });

  /**
   * Test: Shopping list generation from recipes
   * Requirement: Shopping List Generation
   */
  it('should handle list generation from recipes', async () => {
    const { result } = renderHook(() => useShoppingList(), { wrapper });
    const options = {
      recipeIds: ['recipe1'],
      servings: 4,
      excludeInventoryItems: true,
      mergeDuplicates: true
    };

    await act(async () => {
      await result.current.generateList(options);
    });

    expect(ShoppingService.generateShoppingList).toHaveBeenCalledWith(options);
  });

  /**
   * Test: Shopping list item management
   * Requirement: Shopping List Management
   */
  it('should handle item management operations', async () => {
    const { result } = renderHook(() => useShoppingList(), { wrapper });
    const newItem: Partial<ShoppingListItem> = {
      name: 'Eggs',
      quantity: 12,
      unit: 'pieces',
      category: 'Dairy'
    };

    // Test adding item
    await act(async () => {
      await result.current.addItem('1', newItem);
    });

    // Test updating item
    await act(async () => {
      await result.current.updateItem('1', '1', { quantity: 24 });
    });

    // Test deleting item
    await act(async () => {
      await result.current.deleteItem('1', '1');
    });

    // Test toggling item check
    await act(async () => {
      await result.current.toggleItemCheck('1', '1');
    });

    expect(ShoppingService.updateShoppingList).toHaveBeenCalledTimes(4);
  });

  /**
   * Test: Shopping list item filtering
   * Requirement: Shopping List Management
   */
  it('should handle item filtering', async () => {
    const { result } = renderHook(() => useShoppingList(), { wrapper });
    const filter = {
      categories: ['Dairy'],
      searchTerm: 'milk',
      showCheckedItems: true,
      recipeId: ''
    };

    await act(async () => {
      await result.current.filterItems('1', filter);
    });

    expect(ShoppingService.filterShoppingList).toHaveBeenCalledWith('1', filter);
  });

  /**
   * Test: Error handling
   * Requirement: Shopping List Management
   */
  it('should handle errors appropriately', async () => {
    const errorMessage = 'Failed to fetch shopping lists';
    (ShoppingService.getShoppingLists as jest.Mock).mockRejectedValue(new Error(errorMessage));

    const { result, waitForNextUpdate } = renderHook(() => useShoppingList(), { wrapper });

    await waitForNextUpdate();

    expect(result.current.error).toBeTruthy();

    // Test error handling for list creation
    (ShoppingService.createShoppingList as jest.Mock).mockRejectedValue(new Error('Creation failed'));
    
    await act(async () => {
      try {
        await result.current.createList({ name: 'Test List' });
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    // Verify error state is cleared on subsequent successful operations
    (ShoppingService.getShoppingLists as jest.Mock).mockResolvedValue([mockShoppingList]);
    
    await act(async () => {
      await result.current.createList({ name: 'New List' });
    });

    expect(result.current.error).toBeNull();
  });
});