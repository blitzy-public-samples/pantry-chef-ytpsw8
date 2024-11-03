/**
 * HUMAN TASKS:
 * 1. Configure error tracking integration for shopping list operations
 * 2. Verify shopping list categories with backend team
 * 3. Set up monitoring for shopping list performance metrics
 * 4. Review caching strategy for shopping list data
 */

// External dependencies
// @version: react ^18.0.0
import { useEffect, useCallback } from 'react';
// @version: react-redux ^8.0.0
import { useDispatch, useSelector } from 'react-redux';

// Internal dependencies
import { 
  ShoppingList, 
  ShoppingListItem, 
  ShoppingListFilter, 
  ShoppingListGenerationOptions 
} from '../interfaces/shopping.interface';
import ShoppingService from '../services/shopping.service';
import { 
  fetchShoppingLists,
  fetchShoppingList,
  createShoppingList,
  updateShoppingList,
  deleteShoppingList,
  generateShoppingList,
  setFilter,
  toggleItemChecked,
  shoppingSelectors
} from '../store/slices/shoppingSlice';

/**
 * Custom hook for managing shopping list state and operations
 * Requirement: Shopping List Management (8.1 User Interface Design/Screen Components)
 */
export const useShoppingList = () => {
  const dispatch = useDispatch();

  // Selectors for shopping list state
  const shoppingLists = useSelector(shoppingSelectors.selectAllLists);
  const loading = useSelector((state: any) => state.shopping.loading);
  const error = useSelector((state: any) => state.shopping.error);

  /**
   * Fetch all shopping lists on component mount
   * Requirement: Shopping List Management
   */
  useEffect(() => {
    dispatch(fetchShoppingLists());
  }, [dispatch]);

  /**
   * Create a new shopping list
   * Requirement: Shopping List Management
   */
  const createList = useCallback(async (data: Partial<ShoppingList>) => {
    try {
      await dispatch(createShoppingList(data)).unwrap();
    } catch (error) {
      throw new Error(`Failed to create shopping list: ${error}`);
    }
  }, [dispatch]);

  /**
   * Update an existing shopping list
   * Requirement: Shopping List Management
   */
  const updateList = useCallback(async (id: string, data: Partial<ShoppingList>) => {
    try {
      await dispatch(updateShoppingList({ id, data })).unwrap();
    } catch (error) {
      throw new Error(`Failed to update shopping list: ${error}`);
    }
  }, [dispatch]);

  /**
   * Delete a shopping list
   * Requirement: Shopping List Management
   */
  const deleteList = useCallback(async (id: string) => {
    try {
      await dispatch(deleteShoppingList(id)).unwrap();
    } catch (error) {
      throw new Error(`Failed to delete shopping list: ${error}`);
    }
  }, [dispatch]);

  /**
   * Generate a shopping list from recipes
   * Requirement: Shopping List Generation (1.2 Scope/Core Capabilities)
   */
  const generateList = useCallback(async (options: ShoppingListGenerationOptions) => {
    try {
      await dispatch(generateShoppingList(options)).unwrap();
    } catch (error) {
      throw new Error(`Failed to generate shopping list: ${error}`);
    }
  }, [dispatch]);

  /**
   * Add a new item to a shopping list
   * Requirement: Shopping List Management
   */
  const addItem = useCallback(async (listId: string, item: Partial<ShoppingListItem>) => {
    try {
      const list = shoppingLists.find(l => l.id === listId);
      if (!list) throw new Error('Shopping list not found');

      const updatedItems = [...list.items, { ...item, id: crypto.randomUUID() }];
      await dispatch(updateShoppingList({
        id: listId,
        data: { items: updatedItems }
      })).unwrap();
    } catch (error) {
      throw new Error(`Failed to add item to shopping list: ${error}`);
    }
  }, [dispatch, shoppingLists]);

  /**
   * Update an existing item in a shopping list
   * Requirement: Shopping List Management
   */
  const updateItem = useCallback(async (
    listId: string,
    itemId: string,
    data: Partial<ShoppingListItem>
  ) => {
    try {
      const list = shoppingLists.find(l => l.id === listId);
      if (!list) throw new Error('Shopping list not found');

      const updatedItems = list.items.map(item =>
        item.id === itemId ? { ...item, ...data } : item
      );

      await dispatch(updateShoppingList({
        id: listId,
        data: { items: updatedItems }
      })).unwrap();
    } catch (error) {
      throw new Error(`Failed to update shopping list item: ${error}`);
    }
  }, [dispatch, shoppingLists]);

  /**
   * Delete an item from a shopping list
   * Requirement: Shopping List Management
   */
  const deleteItem = useCallback(async (listId: string, itemId: string) => {
    try {
      const list = shoppingLists.find(l => l.id === listId);
      if (!list) throw new Error('Shopping list not found');

      const updatedItems = list.items.filter(item => item.id !== itemId);
      await dispatch(updateShoppingList({
        id: listId,
        data: { items: updatedItems }
      })).unwrap();
    } catch (error) {
      throw new Error(`Failed to delete shopping list item: ${error}`);
    }
  }, [dispatch, shoppingLists]);

  /**
   * Toggle the checked status of a shopping list item
   * Requirement: Simplified Grocery Shopping (1.2 Scope/Key Benefits)
   */
  const toggleItemCheck = useCallback(async (listId: string, itemId: string) => {
    try {
      const list = shoppingLists.find(l => l.id === listId);
      if (!list) throw new Error('Shopping list not found');

      const item = list.items.find(i => i.id === itemId);
      if (!item) throw new Error('Item not found');

      await dispatch(updateShoppingList({
        id: listId,
        data: {
          items: list.items.map(i =>
            i.id === itemId ? { ...i, checked: !i.checked } : i
          )
        }
      })).unwrap();
    } catch (error) {
      throw new Error(`Failed to toggle item check status: ${error}`);
    }
  }, [dispatch, shoppingLists]);

  /**
   * Filter shopping list items
   * Requirement: Shopping List Management
   */
  const filterItems = useCallback(async (listId: string, filter: ShoppingListFilter) => {
    try {
      const filteredItems = await ShoppingService.filterShoppingList(listId, filter);
      dispatch(setFilter(filter));
      return filteredItems;
    } catch (error) {
      throw new Error(`Failed to filter shopping list items: ${error}`);
    }
  }, [dispatch]);

  return {
    // State
    shoppingLists,
    loading,
    error,

    // List operations
    createList,
    updateList,
    deleteList,
    generateList,

    // Item operations
    addItem,
    updateItem,
    deleteItem,
    toggleItemCheck,
    filterItems
  };
};

export default useShoppingList;