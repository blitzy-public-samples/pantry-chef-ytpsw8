// @version @reduxjs/toolkit ^1.9.0
// @version @jest/globals ^29.0.0

import { configureStore } from '@reduxjs/toolkit';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import reducer, {
  fetchInventoryItems,
  addItem,
  updateItem,
  deleteItem,
  fetchCategories,
  fetchExpirationAlerts,
  setFilter,
  clearFilter,
  clearError,
  selectInventoryItems,
  selectCategories,
  selectExpirationAlerts
} from '../../src/store/slices/inventorySlice';
import InventoryService from '../../src/services/inventory.service';
import { StorageLocation, ExpirationAlertType } from '../../src/interfaces/inventory.interface';

// Mock the InventoryService
jest.mock('../../src/services/inventory.service');

// Test data setup
const mockInventoryItem = {
  id: '1',
  name: 'Test Item',
  quantity: 2,
  unit: 'pcs',
  storageLocation: StorageLocation.PANTRY,
  category: 'Test Category',
  expirationDate: new Date('2024-12-31'),
  purchaseDate: new Date('2024-01-01'),
  notes: 'Test notes',
  imageUrl: 'test.jpg'
};

const mockCategory = {
  id: '1',
  name: 'Test Category',
  description: 'Test Description',
  iconUrl: 'test-icon.jpg'
};

const mockExpirationAlert = {
  itemId: '1',
  itemName: 'Test Item',
  expirationDate: new Date('2024-12-31'),
  daysUntilExpiration: 7,
  alertType: ExpirationAlertType.EXPIRES_SOON
};

const mockFilter = {
  categories: ['Test Category'],
  locations: [StorageLocation.PANTRY],
  expiringWithinDays: 7,
  searchTerm: 'test'
};

describe('inventorySlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create a fresh store instance
    store = configureStore({
      reducer: {
        inventory: reducer
      }
    });
  });

  // Test initial state
  it('Should initialize with correct default state', () => {
    const state = store.getState().inventory;
    expect(state).toEqual({
      items: [],
      categories: [],
      expirationAlerts: [],
      loading: false,
      error: null,
      currentFilter: null
    });
  });

  // Test fetchInventoryItems thunk
  describe('fetchInventoryItems', () => {
    it('Should handle successful inventory item fetch', async () => {
      // Mock service response
      (InventoryService.getInventoryItems as jest.Mock).mockResolvedValue([mockInventoryItem]);

      // Dispatch the action
      await store.dispatch(fetchInventoryItems(mockFilter));

      // Verify loading states
      expect(store.getState().inventory.loading).toBe(false);
      expect(store.getState().inventory.error).toBeNull();
      expect(store.getState().inventory.items).toEqual([mockInventoryItem]);

      // Verify service called with correct parameters
      expect(InventoryService.getInventoryItems).toHaveBeenCalledWith(mockFilter);
    });

    it('Should handle inventory fetch error state', async () => {
      const error = new Error('Failed to fetch');
      (InventoryService.getInventoryItems as jest.Mock).mockRejectedValue(error);

      await store.dispatch(fetchInventoryItems(mockFilter));

      expect(store.getState().inventory.loading).toBe(false);
      expect(store.getState().inventory.error).toBe('Failed to fetch inventory items');
      expect(store.getState().inventory.items).toEqual([]);
    });
  });

  // Test addItem thunk
  describe('addItem', () => {
    it('Should successfully add new inventory item', async () => {
      const newItem = { ...mockInventoryItem };
      delete newItem.id;

      (InventoryService.addInventoryItem as jest.Mock).mockResolvedValue(mockInventoryItem);

      await store.dispatch(addItem(newItem));

      expect(store.getState().inventory.loading).toBe(false);
      expect(store.getState().inventory.error).toBeNull();
      expect(store.getState().inventory.items).toContainEqual(mockInventoryItem);
      expect(InventoryService.addInventoryItem).toHaveBeenCalledWith(newItem);
    });

    it('Should handle add item errors', async () => {
      const error = new Error('Failed to add');
      (InventoryService.addInventoryItem as jest.Mock).mockRejectedValue(error);

      const newItem = { ...mockInventoryItem };
      delete newItem.id;

      await store.dispatch(addItem(newItem));

      expect(store.getState().inventory.loading).toBe(false);
      expect(store.getState().inventory.error).toBe('Failed to add item');
      expect(store.getState().inventory.items).toEqual([]);
    });
  });

  // Test updateItem thunk
  describe('updateItem', () => {
    it('Should successfully update existing item', async () => {
      // Add initial item
      store = configureStore({
        reducer: { inventory: reducer },
        preloadedState: {
          inventory: {
            items: [mockInventoryItem],
            categories: [],
            expirationAlerts: [],
            loading: false,
            error: null,
            currentFilter: null
          }
        }
      });

      const updates = {
        quantity: 3,
        notes: 'Updated notes'
      };

      const updatedItem = { ...mockInventoryItem, ...updates };
      (InventoryService.updateInventoryItem as jest.Mock).mockResolvedValue(updatedItem);

      await store.dispatch(updateItem({ id: mockInventoryItem.id, updates }));

      expect(store.getState().inventory.loading).toBe(false);
      expect(store.getState().inventory.error).toBeNull();
      expect(store.getState().inventory.items[0]).toEqual(updatedItem);
      expect(InventoryService.updateInventoryItem).toHaveBeenCalledWith(mockInventoryItem.id, updates);
    });

    it('Should handle update item errors', async () => {
      const error = new Error('Failed to update');
      (InventoryService.updateInventoryItem as jest.Mock).mockRejectedValue(error);

      await store.dispatch(updateItem({ id: '1', updates: { quantity: 3 } }));

      expect(store.getState().inventory.loading).toBe(false);
      expect(store.getState().inventory.error).toBe('Failed to update item');
    });
  });

  // Test deleteItem thunk
  describe('deleteItem', () => {
    it('Should successfully delete inventory item', async () => {
      // Add initial item
      store = configureStore({
        reducer: { inventory: reducer },
        preloadedState: {
          inventory: {
            items: [mockInventoryItem],
            categories: [],
            expirationAlerts: [],
            loading: false,
            error: null,
            currentFilter: null
          }
        }
      });

      (InventoryService.deleteInventoryItem as jest.Mock).mockResolvedValue(undefined);

      await store.dispatch(deleteItem(mockInventoryItem.id));

      expect(store.getState().inventory.loading).toBe(false);
      expect(store.getState().inventory.error).toBeNull();
      expect(store.getState().inventory.items).toEqual([]);
      expect(InventoryService.deleteInventoryItem).toHaveBeenCalledWith(mockInventoryItem.id);
    });

    it('Should handle delete item errors', async () => {
      const error = new Error('Failed to delete');
      (InventoryService.deleteInventoryItem as jest.Mock).mockRejectedValue(error);

      await store.dispatch(deleteItem('1'));

      expect(store.getState().inventory.loading).toBe(false);
      expect(store.getState().inventory.error).toBe('Failed to delete item');
    });
  });

  // Test fetchCategories thunk
  describe('fetchCategories', () => {
    it('Should successfully fetch categories', async () => {
      (InventoryService.getCategories as jest.Mock).mockResolvedValue([mockCategory]);

      await store.dispatch(fetchCategories());

      expect(store.getState().inventory.loading).toBe(false);
      expect(store.getState().inventory.error).toBeNull();
      expect(store.getState().inventory.categories).toEqual([mockCategory]);
      expect(InventoryService.getCategories).toHaveBeenCalled();
    });

    it('Should handle category fetch errors', async () => {
      const error = new Error('Failed to fetch categories');
      (InventoryService.getCategories as jest.Mock).mockRejectedValue(error);

      await store.dispatch(fetchCategories());

      expect(store.getState().inventory.loading).toBe(false);
      expect(store.getState().inventory.error).toBe('Failed to fetch categories');
      expect(store.getState().inventory.categories).toEqual([]);
    });
  });

  // Test fetchExpirationAlerts thunk
  describe('fetchExpirationAlerts', () => {
    it('Should successfully fetch expiration alerts', async () => {
      (InventoryService.getExpirationAlerts as jest.Mock).mockResolvedValue([mockExpirationAlert]);

      await store.dispatch(fetchExpirationAlerts(7));

      expect(store.getState().inventory.loading).toBe(false);
      expect(store.getState().inventory.error).toBeNull();
      expect(store.getState().inventory.expirationAlerts).toEqual([mockExpirationAlert]);
      expect(InventoryService.getExpirationAlerts).toHaveBeenCalledWith(7);
    });

    it('Should handle expiration alert fetch errors', async () => {
      const error = new Error('Failed to fetch alerts');
      (InventoryService.getExpirationAlerts as jest.Mock).mockRejectedValue(error);

      await store.dispatch(fetchExpirationAlerts(7));

      expect(store.getState().inventory.loading).toBe(false);
      expect(store.getState().inventory.error).toBe('Failed to fetch expiration alerts');
      expect(store.getState().inventory.expirationAlerts).toEqual([]);
    });
  });

  // Test synchronous actions
  describe('synchronous actions', () => {
    it('Should handle setFilter', () => {
      store.dispatch(setFilter(mockFilter));
      expect(store.getState().inventory.currentFilter).toEqual(mockFilter);
    });

    it('Should handle clearFilter', () => {
      store.dispatch(setFilter(mockFilter));
      store.dispatch(clearFilter());
      expect(store.getState().inventory.currentFilter).toBeNull();
    });

    it('Should handle clearError', () => {
      // Set up initial error state
      store = configureStore({
        reducer: { inventory: reducer },
        preloadedState: {
          inventory: {
            items: [],
            categories: [],
            expirationAlerts: [],
            loading: false,
            error: 'Test error',
            currentFilter: null
          }
        }
      });

      store.dispatch(clearError());
      expect(store.getState().inventory.error).toBeNull();
    });
  });

  // Test selectors
  describe('selectors', () => {
    beforeEach(() => {
      store = configureStore({
        reducer: { inventory: reducer },
        preloadedState: {
          inventory: {
            items: [mockInventoryItem],
            categories: [mockCategory],
            expirationAlerts: [mockExpirationAlert],
            loading: false,
            error: null,
            currentFilter: mockFilter
          }
        }
      });
    });

    it('Should correctly select inventory items', () => {
      const items = selectInventoryItems(store.getState());
      expect(items).toEqual([mockInventoryItem]);
    });

    it('Should correctly select categories', () => {
      const categories = selectCategories(store.getState());
      expect(categories).toEqual([mockCategory]);
    });

    it('Should correctly select expiration alerts', () => {
      const alerts = selectExpirationAlerts(store.getState());
      expect(alerts).toEqual([mockExpirationAlert]);
    });
  });
});