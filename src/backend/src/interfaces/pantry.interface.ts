// @version mongoose ^6.0.0

/**
 * HUMAN TASKS:
 * 1. Ensure MongoDB indexes are created for efficient pantry item queries
 * 2. Verify that the storage location enum values match the frontend display options
 * 3. Configure expiration notification thresholds in the system
 */

import { Ingredient, IngredientCategory } from './ingredient.interface';

/**
 * Enum defining possible storage locations for pantry items
 * Addresses requirement: Digital Pantry Management - Storage location tracking
 */
export enum StorageLocation {
    REFRIGERATOR = 'REFRIGERATOR',
    FREEZER = 'FREEZER',
    PANTRY = 'PANTRY',
    SPICE_RACK = 'SPICE_RACK'
}

/**
 * Interface for individual pantry inventory items with tracking of quantity, location, and expiration
 * Addresses requirements:
 * - Digital Pantry Management - Item tracking
 * - Expiration Tracking - Purchase and expiration dates
 */
export interface PantryItem {
    ingredientId: string;
    quantity: number;
    unit: string;
    location: StorageLocation;
    purchaseDate: Date;
    expirationDate: Date;
    notes: string;
}

/**
 * Main interface for pantry data structure representing a user's ingredient inventory
 * Addresses requirement: Digital Pantry Management - User pantry management
 */
export interface Pantry {
    id: string;
    userId: string;
    name: string;
    items: PantryItem[];
    locations: StorageLocation[];
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Interface for aggregated pantry statistics and metrics
 * Addresses requirements:
 * - Digital Pantry Management - Inventory analytics
 * - Expiration Tracking - Expiration monitoring
 */
export interface PantryStats {
    totalItems: number;
    expiringItems: number;
    lowStockItems: number;
    itemsByCategory: Map<IngredientCategory, number>;
    itemsByLocation: Map<StorageLocation, number>;
}