// @version mongoose ^6.0.0

/**
 * HUMAN TASKS:
 * 1. Ensure MongoDB is configured to handle the specified ingredient categories
 * 2. Verify that the nutritional information units align with the frontend display requirements
 * 3. Confirm that the shelf life durations are specified in days as per the schema
 */

/**
 * Enum defining the available ingredient categories for classification and filtering
 * Addresses requirement: Digital Pantry Management - Ingredient categorization
 */
export enum IngredientCategory {
    PRODUCE = 'PRODUCE',
    MEAT = 'MEAT',
    DAIRY = 'DAIRY',
    GRAINS = 'GRAINS',
    SPICES = 'SPICES',
    CONDIMENTS = 'CONDIMENTS',
    BEVERAGES = 'BEVERAGES',
    OTHER = 'OTHER'
}

/**
 * Interface defining the nutritional information structure for ingredients
 * Addresses requirement: Digital Pantry Management - Nutritional tracking
 */
export interface NutritionalInfo {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    servingSize: string;
}

/**
 * Interface defining shelf life durations in days for different storage methods
 * Addresses requirement: Digital Pantry Management - Expiration tracking
 */
export interface ShelfLife {
    refrigerated: number;
    frozen: number;
    pantry: number;
}

/**
 * Main interface for ingredient data structure
 * Addresses requirements:
 * - Photographic Ingredient Recognition (recognitionTags)
 * - Digital Pantry Management (category, shelf life)
 * - Recipe Matching (through ingredient properties)
 */
export interface Ingredient {
    // MongoDB document ID
    id: string;

    // Basic ingredient information
    name: string;
    category: IngredientCategory;

    // Measurement information
    defaultUnit: string;
    alternativeUnits: string[];

    // Nutritional content
    nutritionalInfo: NutritionalInfo;

    // Image and recognition data
    imageUrl: string;
    recognitionTags: string[];

    // Storage and expiration tracking
    averageShelfLife: ShelfLife;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
}