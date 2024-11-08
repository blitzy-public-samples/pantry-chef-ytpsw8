/**
 * HUMAN TASKS:
 * 1. Ensure that the StorageLocation enum values match any existing backend configurations
 * 2. Verify that the InventoryItem interface aligns with the database schema
 * 3. Confirm that the ExpirationAlertType values match notification service configurations
 */

/**
 * Enum defining possible storage locations for inventory items
 * Requirement: Digital Pantry Management - Multi-location storage tracking
 */
export enum StorageLocation {
  REFRIGERATOR = 'REFRIGERATOR',
  FREEZER = 'FREEZER',
  PANTRY = 'PANTRY'
}

/**
 * Core interface for inventory item data structure
 * Requirement: Digital Pantry Management - Comprehensive item tracking
 */
export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  storageLocation: StorageLocation;
  category: string;
  expirationDate: Date;
  purchaseDate?: Date;
  notes?: string;
  imageUrl?: string;
}

/**
 * Interface for inventory category data structure
 * Requirement: Inventory Management - Category-based organization
 */
export interface InventoryCategory {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
}

/**
 * Interface for inventory filtering options
 * Requirement: Inventory Management - Search and filtering capabilities
 */
export interface InventoryFilter {
  categories: string[];
  locations: StorageLocation[];
  expiringWithinDays: number;
  searchTerm: string;
}

/**
 * Enum for expiration alert types
 * Requirement: Expiration Tracking - Food waste reduction
 */
export enum ExpirationAlertType {
  EXPIRES_SOON = 'EXPIRES_SOON',
  EXPIRED = 'EXPIRED'
}

/**
 * Interface for expiration alert data structure
 * Requirement: Expiration Tracking - Proactive monitoring
 */
export interface ExpirationAlert {
  itemId: string;
  itemName: string;
  expirationDate: Date;
  daysUntilExpiration: number;
  alertType: ExpirationAlertType;
}