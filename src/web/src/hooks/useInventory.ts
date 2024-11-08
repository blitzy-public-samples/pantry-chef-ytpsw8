/**
 * HUMAN TASKS:
 * 1. Verify that the expiration check interval (15 minutes) aligns with business requirements
 * 2. Ensure that error messages are properly localized
 * 3. Confirm that the inventory service endpoints are correctly configured
 */

// @version react ^18.0.0
// @version react-redux ^8.0.0

import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectInventoryItems,
  selectCategories,
  selectExpirationAlerts,
  fetchInventoryItems,
  fetchCategories,
  fetchExpirationAlerts,
  addItem,
  updateItem,
  deleteItem,
  setFilter
} from '../store/slices/inventorySlice';
import {
  InventoryItem,
  InventoryFilter,
  InventoryCategory,
  ExpirationAlert,
  StorageLocation
} from '../interfaces/inventory.interface';
import { AppDispatch } from '../store/store';

// Expiration check interval in milliseconds (15 minutes)
const EXPIRATION_CHECK_INTERVAL = 15 * 60 * 1000;

/**
 * Custom hook for managing inventory state and operations
 * Requirement: Digital Pantry Management - Comprehensive inventory management
 */
export const useInventory = (initialFilter: InventoryFilter) => {
  const dispatch = useDispatch<AppDispatch>();

  // Local state for loading and error handling
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setLocalFilter] = useState<InventoryFilter>(initialFilter);

  // Redux selectors for inventory state
  const items = useSelector(selectInventoryItems);

  // mock data
  // const items = [
  //   {
  //     id: '1',
  //     name: 'Milk',
  //     quantity: 2,
  //     unit: 'liters',
  //     storageLocation: StorageLocation.REFRIGERATOR,
  //     category: 'Dairy',
  //     expirationDate: new Date('2024-11-15'),
  //     purchaseDate: new Date('2024-11-01'),
  //     notes: 'Organic, whole milk',
  //     imageUrl: 'https://example.com/images/milk.jpg',
  //   },
  //   {
  //     id: '2',
  //     name: 'Frozen Peas',
  //     quantity: 1,
  //     unit: 'kg',
  //     storageLocation: StorageLocation.FREEZER,
  //     category: 'Vegetables',
  //     expirationDate: new Date('2025-02-01'),
  //     purchaseDate: new Date('2024-10-15'),
  //     imageUrl: 'https://example.com/images/frozen-peas.jpg',
  //   },
  //   {
  //     id: '3',
  //     name: 'Rice',
  //     quantity: 5,
  //     unit: 'kg',
  //     storageLocation: StorageLocation.PANTRY,
  //     category: 'Grains',
  //     expirationDate: new Date('2025-10-01'),
  //     notes: 'Basmati rice',
  //     imageUrl: 'https://example.com/images/rice.jpg',
  //   },
  //   {
  //     id: '4',
  //     name: 'Eggs',
  //     quantity: 12,
  //     unit: 'pieces',
  //     storageLocation: StorageLocation.REFRIGERATOR,
  //     category: 'Dairy',
  //     expirationDate: new Date('2024-11-20'),
  //     purchaseDate: new Date('2024-11-05'),
  //     notes: 'Free-range',
  //     imageUrl: 'https://example.com/images/eggs.jpg',
  //   },
  //   {
  //     id: '5',
  //     name: 'Chicken Breast',
  //     quantity: 2,
  //     unit: 'kg',
  //     storageLocation: StorageLocation.FREEZER,
  //     category: 'Meat',
  //     expirationDate: new Date('2024-12-15'),
  //     purchaseDate: new Date('2024-11-01'),
  //     imageUrl: 'https://example.com/images/chicken-breast.jpg',
  //   },
  //   {
  //     id: '6',
  //     name: 'Olive Oil',
  //     quantity: 1,
  //     unit: 'liter',
  //     storageLocation: StorageLocation.PANTRY,
  //     category: 'Condiments',
  //     expirationDate: new Date('2026-01-01'),
  //     purchaseDate: new Date('2024-10-25'),
  //     notes: 'Extra virgin',
  //     imageUrl: 'https://example.com/images/olive-oil.jpg',
  //   },
  //   {
  //     id: '7',
  //     name: 'Bread',
  //     quantity: 1,
  //     unit: 'loaf',
  //     storageLocation: StorageLocation.PANTRY,
  //     category: 'Bakery',
  //     expirationDate: new Date('2024-11-10'),
  //     purchaseDate: new Date('2024-11-07'),
  //     imageUrl: 'https://example.com/images/bread.jpg',
  //   },
  //   {
  //     id: '8',
  //     name: 'Carrots',
  //     quantity: 1,
  //     unit: 'kg',
  //     storageLocation: StorageLocation.REFRIGERATOR,
  //     category: 'Vegetables',
  //     expirationDate: new Date('2024-11-25'),
  //     purchaseDate: new Date('2024-11-05'),
  //     imageUrl: 'https://example.com/images/carrots.jpg',
  //   },
  //   {
  //     id: '9',
  //     name: 'Ice Cream',
  //     quantity: 1,
  //     unit: 'liters',
  //     storageLocation: StorageLocation.FREEZER,
  //     category: 'Desserts',
  //     expirationDate: new Date('2024-12-20'),
  //     purchaseDate: new Date('2024-11-01'),
  //     notes: 'Vanilla flavor',
  //     imageUrl: 'https://example.com/images/ice-cream.jpg',
  //   },
  //   {
  //     id: '10',
  //     name: 'Cereal',
  //     quantity: 2,
  //     unit: 'boxes',
  //     storageLocation: StorageLocation.PANTRY,
  //     category: 'Breakfast',
  //     expirationDate: new Date('2025-05-01'),
  //     purchaseDate: new Date('2024-10-15'),
  //     imageUrl: 'https://example.com/images/cereal.jpg',
  //   },
  // ];
  const categories = useSelector(selectCategories);
  const expirationAlerts = useSelector(selectExpirationAlerts);

  /**
   * Fetch inventory data with current filter
   * Requirement: Digital Pantry Management - Real-time inventory updates
   */
  const refreshInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        dispatch(fetchInventoryItems(filter)),
        dispatch(fetchCategories()),
        dispatch(fetchExpirationAlerts(filter.expiringWithinDays))
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh inventory');
    } finally {
      setLoading(false);
    }
  }, [dispatch, filter]);

  /**
   * Update filter and refresh inventory
   * Requirement: Inventory Tracking - Advanced filtering capabilities
   */
  const handleSetFilter = useCallback(async (newFilter: InventoryFilter) => {
    setLocalFilter(newFilter);
    dispatch(setFilter(newFilter));
    try {
      setLoading(true);
      setError(null);
      await dispatch(fetchInventoryItems(newFilter));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply filter');
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  /**
   * Add new inventory item
   * Requirement: Digital Pantry Management - Item addition
   */
  const handleAddItem = useCallback(async (item: Omit<InventoryItem, 'id'>) => {
    try {
      setLoading(true);
      setError(null);
      await dispatch(addItem(item));
      await refreshInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dispatch, refreshInventory]);

  /**
   * Update existing inventory item
   * Requirement: Digital Pantry Management - Item updates
   */
  const handleUpdateItem = useCallback(async (id: string, updates: Partial<InventoryItem>) => {
    try {
      setLoading(true);
      setError(null);
      await dispatch(updateItem({ id, updates }));
      await refreshInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dispatch, refreshInventory]);

  /**
   * Delete inventory item
   * Requirement: Digital Pantry Management - Item removal
   */
  const handleDeleteItem = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await dispatch(deleteItem(id));
      await refreshInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dispatch, refreshInventory]);

  // Initial data fetch on mount
  useEffect(() => {
    refreshInventory();
  }, [refreshInventory]);

  /**
   * Periodic expiration check
   * Requirement: Expiration Management - Regular expiration monitoring
   */
  useEffect(() => {
    const checkExpirations = () => {
      dispatch(fetchExpirationAlerts(filter.expiringWithinDays));
    };

    const intervalId = setInterval(checkExpirations, EXPIRATION_CHECK_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [dispatch, filter.expiringWithinDays]);

  return {
    // State
    items,
    categories,
    expirationAlerts,
    loading,
    error,
    filter,

    // Actions
    setFilter: handleSetFilter,
    addItem: handleAddItem,
    updateItem: handleUpdateItem,
    deleteItem: handleDeleteItem,
    refreshInventory
  };
};

export default useInventory;