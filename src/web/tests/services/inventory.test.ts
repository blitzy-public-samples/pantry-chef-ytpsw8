// External dependencies
// @version jest ^29.0.0
import { describe, beforeEach, afterEach, it, expect } from '@jest/globals';
// @version axios-mock-adapter ^1.21.0
import MockAdapter from 'axios-mock-adapter';

// Internal dependencies
import InventoryService from '../../src/services/inventory.service';
import { apiClient } from '../../src/utils/api';
import { StorageLocation, ExpirationAlertType } from '../../src/interfaces/inventory.interface';

/**
 * HUMAN TASKS:
 * 1. Configure test environment variables for API endpoints
 * 2. Set up test data fixtures in a shared location
 * 3. Configure test coverage thresholds
 * 4. Set up integration test environment if needed
 */

describe('InventoryService', () => {
  let mockAxios: MockAdapter;

  // Mock data for testing
  const mockInventoryItem = {
    id: '123',
    name: 'Test Item',
    quantity: 2,
    unit: 'pieces',
    storageLocation: StorageLocation.REFRIGERATOR,
    category: 'Dairy',
    expirationDate: new Date('2024-01-01'),
    purchaseDate: new Date('2023-12-01'),
    notes: 'Test notes',
    imageUrl: 'http://test.com/image.jpg'
  };

  const mockCategory = {
    id: 'cat1',
    name: 'Dairy',
    description: 'Dairy products',
    iconUrl: 'http://test.com/dairy-icon.png'
  };

  const mockExpirationAlert = {
    itemId: '123',
    itemName: 'Test Item',
    expirationDate: new Date('2024-01-01'),
    daysUntilExpiration: 5,
    alertType: ExpirationAlertType.EXPIRES_SOON
  };

  beforeEach(() => {
    // Initialize mock adapter before each test
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    // Clean up mock adapter after each test
    mockAxios.reset();
    mockAxios.restore();
  });

  // Test suite for getInventoryItems
  describe('getInventoryItems', () => {
    // Requirement: Inventory Management - Category-based filtering
    it('should retrieve filtered inventory items successfully', async () => {
      const filter = {
        categories: ['Dairy'],
        locations: [StorageLocation.REFRIGERATOR],
        expiringWithinDays: 7,
        searchTerm: 'milk'
      };

      const expectedUrl = '/api/pantry/items?categories=Dairy&locations=REFRIGERATOR&expiringWithinDays=7&search=milk';
      mockAxios.onGet(expectedUrl).reply(200, [mockInventoryItem]);

      const result = await InventoryService.getInventoryItems(filter);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockInventoryItem);
    });

    it('should handle empty filter parameters', async () => {
      const filter = {
        categories: [],
        locations: [],
        expiringWithinDays: 0,
        searchTerm: ''
      };

      mockAxios.onGet('/api/pantry/items').reply(200, [mockInventoryItem]);

      const result = await InventoryService.getInventoryItems(filter);
      expect(result).toHaveLength(1);
    });

    it('should handle API errors gracefully', async () => {
      const filter = {
        categories: ['Dairy'],
        locations: [],
        expiringWithinDays: 0,
        searchTerm: ''
      };

      mockAxios.onGet('/api/pantry/items?categories=Dairy').reply(500);

      await expect(InventoryService.getInventoryItems(filter))
        .rejects.toThrow('Internal server error');
    });
  });

  // Test suite for addInventoryItem
  describe('addInventoryItem', () => {
    // Requirement: Digital Pantry Management - Item addition
    it('should add new inventory item successfully', async () => {
      const newItem = {
        name: 'New Item',
        quantity: 1,
        unit: 'piece',
        storageLocation: StorageLocation.PANTRY,
        category: 'Snacks',
        expirationDate: new Date('2024-02-01'),
        purchaseDate: new Date('2023-12-15'),
        notes: 'New item notes',
        imageUrl: 'http://test.com/new-image.jpg'
      };

      mockAxios.onPost('/api/pantry/items').reply(200, { ...newItem, id: '456' });

      const result = await InventoryService.addInventoryItem(newItem);
      expect(result).toHaveProperty('id', '456');
      expect(result.name).toBe(newItem.name);
    });

    it('should validate required fields', async () => {
      const invalidItem = {
        name: '',
        quantity: 0,
        unit: '',
        storageLocation: StorageLocation.PANTRY,
        category: '',
        expirationDate: new Date(),
        purchaseDate: new Date(),
        notes: '',
        imageUrl: ''
      };

      await expect(InventoryService.addInventoryItem(invalidItem))
        .rejects.toThrow('Missing required inventory item fields');
    });

    it('should handle API errors during item addition', async () => {
      const newItem = { ...mockInventoryItem };
      delete newItem.id;

      mockAxios.onPost('/api/pantry/items').reply(400, { message: 'Invalid item data' });

      await expect(InventoryService.addInventoryItem(newItem))
        .rejects.toThrow('Invalid item data');
    });
  });

  // Test suite for updateInventoryItem
  describe('updateInventoryItem', () => {
    // Requirement: Digital Pantry Management - Item updates
    it('should update inventory item successfully', async () => {
      const updates = {
        quantity: 3,
        notes: 'Updated notes'
      };

      mockAxios.onPut('/api/pantry/items/123').reply(200, { ...mockInventoryItem, ...updates });

      const result = await InventoryService.updateInventoryItem('123', updates);
      expect(result.quantity).toBe(3);
      expect(result.notes).toBe('Updated notes');
    });

    it('should validate item ID for update', async () => {
      const updates = { quantity: 3 };

      await expect(InventoryService.updateInventoryItem('', updates))
        .rejects.toThrow('Item ID is required for update');
    });

    it('should handle non-existent item update', async () => {
      const updates = { quantity: 3 };

      mockAxios.onPut('/api/pantry/items/999').reply(404, { message: 'Item not found' });

      await expect(InventoryService.updateInventoryItem('999', updates))
        .rejects.toThrow('Resource not found');
    });
  });

  // Test suite for deleteInventoryItem
  describe('deleteInventoryItem', () => {
    // Requirement: Digital Pantry Management - Item removal
    it('should delete inventory item successfully', async () => {
      mockAxios.onDelete('/api/pantry/items/123').reply(200);

      await expect(InventoryService.deleteInventoryItem('123')).resolves.not.toThrow();
    });

    it('should validate item ID for deletion', async () => {
      await expect(InventoryService.deleteInventoryItem(''))
        .rejects.toThrow('Item ID is required for deletion');
    });

    it('should handle non-existent item deletion', async () => {
      mockAxios.onDelete('/api/pantry/items/999').reply(404, { message: 'Item not found' });

      await expect(InventoryService.deleteInventoryItem('999'))
        .rejects.toThrow('Resource not found');
    });
  });

  // Test suite for getCategories
  describe('getCategories', () => {
    // Requirement: Inventory Management - Category retrieval
    it('should retrieve categories successfully', async () => {
      mockAxios.onGet('/api/pantry/categories').reply(200, [mockCategory]);

      const result = await InventoryService.getCategories();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockCategory);
    });

    it('should handle empty category list', async () => {
      mockAxios.onGet('/api/pantry/categories').reply(200, []);

      const result = await InventoryService.getCategories();
      expect(result).toHaveLength(0);
    });

    it('should handle API errors during category retrieval', async () => {
      mockAxios.onGet('/api/pantry/categories').reply(500);

      await expect(InventoryService.getCategories())
        .rejects.toThrow('Internal server error');
    });
  });

  // Test suite for getExpirationAlerts
  describe('getExpirationAlerts', () => {
    // Requirement: Digital Pantry Management - Expiration tracking
    it('should retrieve expiration alerts successfully', async () => {
      mockAxios.onGet('/api/pantry/items/expiring?days=7').reply(200, [mockExpirationAlert]);

      const result = await InventoryService.getExpirationAlerts(7);
      expect(result).toHaveLength(1);
      expect(result[0].alertType).toBe(ExpirationAlertType.EXPIRES_SOON);
    });

    it('should validate days threshold', async () => {
      await expect(InventoryService.getExpirationAlerts(-1))
        .rejects.toThrow('Days threshold must be a positive number');
    });

    it('should handle no expiring items', async () => {
      mockAxios.onGet('/api/pantry/items/expiring?days=30').reply(200, []);

      const result = await InventoryService.getExpirationAlerts(30);
      expect(result).toHaveLength(0);
    });

    it('should handle API errors during alert retrieval', async () => {
      mockAxios.onGet('/api/pantry/items/expiring?days=7').reply(500);

      await expect(InventoryService.getExpirationAlerts(7))
        .rejects.toThrow('Internal server error');
    });
  });
});