// @version @testing-library/react-hooks ^8.0.1
// @version @testing-library/react ^13.0.0
// @version react-redux ^8.0.0
// @version @reduxjs/toolkit ^1.9.0
// @version jest ^29.0.0

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import useInventory from '../../src/hooks/useInventory';
import { StorageLocation, ExpirationAlertType } from '../../src/interfaces/inventory.interface';

// Mock Redux store initial state
const initialState = {
  inventory: {
    items: [],
    categories: [],
    expirationAlerts: [],
    loading: false,
    error: null,
    filter: {
      categories: [],
      locations: [],
      expiringWithinDays: 7,
      searchTerm: ''
    }
  }
};

// Mock inventory item for testing
const mockInventoryItem = {
  name: 'Test Item',
  quantity: 1,
  unit: 'piece',
  storageLocation: StorageLocation.PANTRY,
  category: 'test-category',
  expirationDate: new Date('2024-01-01'),
  purchaseDate: new Date('2023-12-01'),
  notes: 'Test notes',
  imageUrl: 'test-image.jpg'
};

// Mock category for testing
const mockCategory = {
  id: 'cat-1',
  name: 'Test Category',
  description: 'Test Description',
  iconUrl: 'test-icon.jpg'
};

// Mock expiration alert for testing
const mockExpirationAlert = {
  itemId: 'item-1',
  itemName: 'Expiring Item',
  expirationDate: new Date('2024-01-01'),
  daysUntilExpiration: 5,
  alertType: ExpirationAlertType.EXPIRES_SOON
};

describe('useInventory', () => {
  let store: any;
  let wrapper: any;

  beforeEach(() => {
    // Create fresh store for each test
    store = configureStore({
      reducer: {
        inventory: (state = initialState.inventory, action) => state
      }
    });

    // Create wrapper with Redux Provider
    wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store} > {children} </Provider>
    );
  });

  // Test initial state
  it('should initialize with default state', async () => {
    // Requirement: Digital Pantry Management - Initialize empty inventory
    const { result } = renderHook(
      () => useInventory({
        categories: [],
        locations: [],
        expiringWithinDays: 7,
        searchTerm: ''
      }),
      { wrapper }
    );

    expect(result.current.items).toEqual([]);
    expect(result.current.categories).toEqual([]);
    expect(result.current.expirationAlerts).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  // Test inventory fetching
  it('should fetch inventory items with filters', async () => {
    // Requirement: Inventory Tracking - Filtered inventory retrieval
    const mockItems = [{ ...mockInventoryItem, id: 'item-1' }];

    store.dispatch = jest.fn().mockResolvedValue({ payload: mockItems });

    const { result } = renderHook(
      () => useInventory({
        categories: ['test-category'],
        locations: [StorageLocation.PANTRY],
        expiringWithinDays: 7,
        searchTerm: 'test'
      }),
      { wrapper }
    );

    await waitFor(() => expect(result.current));

    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('fetchInventoryItems')
      })
    );
    expect(result.current.loading).toBe(false);
  });

  // Test item operations
  it('should handle item operations', async () => {
    // Requirement: Digital Pantry Management - CRUD operations
    const { result } = renderHook(
      () => useInventory({
        categories: [],
        locations: [],
        expiringWithinDays: 7,
        searchTerm: ''
      }),
      { wrapper }
    );

    // Test add item
    store.dispatch = jest.fn().mockResolvedValue({ payload: { id: 'new-item' } });
    await act(async () => {
      await result.current.addItem(mockInventoryItem);
    });
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('addItem')
      })
    );

    // Test update item
    store.dispatch = jest.fn().mockResolvedValue({ payload: { id: 'item-1' } });
    await act(async () => {
      await result.current.updateItem('item-1', { quantity: 2 });
    });
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('updateItem')
      })
    );

    // Test delete item
    store.dispatch = jest.fn().mockResolvedValue({ payload: 'item-1' });
    await act(async () => {
      await result.current.deleteItem('item-1');
    });
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('deleteItem')
      })
    );
  });

  // Test expiration tracking
  it('should track expiring items', async () => {
    // Requirement: Expiration Management - Expiration alerts
    const mockAlerts = [mockExpirationAlert];

    store.dispatch = jest.fn().mockResolvedValue({ payload: mockAlerts });

    const { result } = renderHook(
      () => useInventory({
        categories: [],
        locations: [],
        expiringWithinDays: 7,
        searchTerm: ''
      }),
      { wrapper }
    );

    await waitFor(() => expect(result.current));

    // Verify expiration alerts are fetched
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('fetchExpirationAlerts')
      })
    );

    // Test periodic expiration check
    jest.useFakeTimers();
    jest.advanceTimersByTime(15 * 60 * 1000); // 15 minutes

    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('fetchExpirationAlerts')
      })
    );
    jest.useRealTimers();
  });

  // Test error handling
  it('should handle errors gracefully', async () => {
    const errorMessage = 'Failed to fetch inventory';

    store.dispatch = jest.fn().mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(
      () => useInventory({
        categories: [],
        locations: [],
        expiringWithinDays: 7,
        searchTerm: ''
      }),
      { wrapper }
    );

    await waitFor(() => expect(result.current));

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.loading).toBe(false);
  });

  // Test filter updates
  it('should update filters and refresh inventory', async () => {
    const { result } = renderHook(
      () => useInventory({
        categories: [],
        locations: [],
        expiringWithinDays: 7,
        searchTerm: ''
      }),
      { wrapper }
    );

    store.dispatch = jest.fn().mockResolvedValue({ payload: [] });

    await act(async () => {
      await result.current.setFilter({
        categories: ['test-category'],
        locations: [StorageLocation.PANTRY],
        expiringWithinDays: 3,
        searchTerm: 'test'
      });
    });

    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('setFilter')
      })
    );
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('fetchInventoryItems')
      })
    );
  });

  // Test cleanup
  it('should clean up expiration check interval on unmount', () => {
    const { unmount } = renderHook(
      () => useInventory({
        categories: [],
        locations: [],
        expiringWithinDays: 7,
        searchTerm: ''
      }),
      { wrapper }
    );

    jest.useFakeTimers();
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    jest.useRealTimers();
  });
});