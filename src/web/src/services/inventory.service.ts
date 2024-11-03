// External dependencies
// @version axios ^1.4.0
import { AxiosError } from 'axios';

// Internal dependencies
import { apiClient, handleApiError } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import {
  InventoryItem,
  InventoryFilter,
  InventoryCategory,
  ExpirationAlert,
  StorageLocation
} from '../interfaces/inventory.interface';

/**
 * HUMAN TASKS:
 * 1. Configure expiration alert thresholds in environment variables
 * 2. Set up monitoring for inventory tracking metrics
 * 3. Configure category icons in CDN or static assets
 * 4. Set up backup strategy for inventory data
 */

// Requirement: Digital Pantry Management (1.2 Scope/Core Capabilities)
// Service object for managing inventory operations
const InventoryService = {
  /**
   * Retrieves inventory items with optional filtering
   * Requirement: Inventory Management (8.1 User Interface Design/Screen Components)
   */
  async getInventoryItems(filter: InventoryFilter): Promise<InventoryItem[]> {
    try {
      // Construct query parameters for filtering
      const queryParams = new URLSearchParams();
      
      if (filter.categories?.length) {
        queryParams.append('categories', filter.categories.join(','));
      }
      
      if (filter.locations?.length) {
        queryParams.append('locations', filter.locations.join(','));
      }
      
      if (filter.expiringWithinDays) {
        queryParams.append('expiringWithinDays', filter.expiringWithinDays.toString());
      }
      
      if (filter.searchTerm) {
        queryParams.append('search', filter.searchTerm);
      }

      const response = await apiClient.get(
        `${API_ENDPOINTS.PANTRY.LIST}?${queryParams.toString()}`
      );
      
      // Transform dates from strings to Date objects
      return response.data.map((item: any) => ({
        ...item,
        expirationDate: new Date(item.expirationDate),
        purchaseDate: new Date(item.purchaseDate)
      }));
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Adds a new item to the inventory
   * Requirement: Digital Pantry Management (1.2 Scope/Core Capabilities)
   */
  async addInventoryItem(item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> {
    try {
      // Validate required fields
      if (!item.name || !item.quantity || !item.unit || !item.storageLocation) {
        throw new Error('Missing required inventory item fields');
      }

      const response = await apiClient.post(API_ENDPOINTS.PANTRY.ADD, item);
      
      return {
        ...response.data,
        expirationDate: new Date(response.data.expirationDate),
        purchaseDate: new Date(response.data.purchaseDate)
      };
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Updates an existing inventory item
   * Requirement: Digital Pantry Management (1.2 Scope/Core Capabilities)
   */
  async updateInventoryItem(
    id: string,
    updates: Partial<InventoryItem>
  ): Promise<InventoryItem> {
    try {
      // Validate item ID
      if (!id) {
        throw new Error('Item ID is required for update');
      }

      const endpoint = API_ENDPOINTS.PANTRY.UPDATE.replace(':id', id);
      const response = await apiClient.put(endpoint, updates);
      
      return {
        ...response.data,
        expirationDate: new Date(response.data.expirationDate),
        purchaseDate: new Date(response.data.purchaseDate)
      };
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Deletes an inventory item
   * Requirement: Digital Pantry Management (1.2 Scope/Core Capabilities)
   */
  async deleteInventoryItem(id: string): Promise<void> {
    try {
      // Validate item ID
      if (!id) {
        throw new Error('Item ID is required for deletion');
      }

      const endpoint = API_ENDPOINTS.PANTRY.DELETE.replace(':id', id);
      await apiClient.delete(endpoint);
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Retrieves all available inventory categories
   * Requirement: Inventory Management (8.1 User Interface Design/Screen Components)
   */
  async getCategories(): Promise<InventoryCategory[]> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PANTRY.CATEGORIES);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  /**
   * Retrieves expiration alerts for inventory items
   * Requirement: Expiration Tracking (1.2 Scope/Core Capabilities)
   */
  async getExpirationAlerts(daysThreshold: number): Promise<ExpirationAlert[]> {
    try {
      // Validate days threshold
      if (daysThreshold < 0) {
        throw new Error('Days threshold must be a positive number');
      }

      const response = await apiClient.get(
        `${API_ENDPOINTS.PANTRY.LIST}/expiring?days=${daysThreshold}`
      );
      
      return response.data.map((alert: any) => ({
        ...alert,
        expirationDate: new Date(alert.expirationDate)
      }));
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }
};

export default InventoryService;