// @version mongoose ^6.0.0
import { Schema, model, Document } from 'mongoose';
import { 
    Ingredient, 
    IngredientCategory, 
    NutritionalInfo, 
    ShelfLife 
} from '../interfaces/ingredient.interface';

/**
 * HUMAN TASKS:
 * 1. Ensure MongoDB text indexes are created for name and recognitionTags fields
 * 2. Verify that the compound index on category and name is optimized for your queries
 * 3. Monitor the performance of text search operations on large datasets
 */

// Extend Document for Mongoose typing
export interface IngredientDocument extends Ingredient, Document {}

// Create IngredientSchema class for Mongoose schema definition
class IngredientSchema extends Schema {
    constructor() {
        // Define schema with validation rules
        super({
            // Basic ingredient information
            name: {
                type: String,
                required: [true, 'Ingredient name is required'],
                trim: true,
                index: 'text' // Addresses requirement: Recipe Matching - text search
            },
            category: {
                type: String,
                required: [true, 'Ingredient category is required'],
                enum: Object.values(IngredientCategory),
                index: true // Addresses requirement: Digital Pantry Management - category filtering
            },

            // Measurement information
            defaultUnit: {
                type: String,
                required: [true, 'Default unit is required'],
                trim: true
            },
            alternativeUnits: {
                type: [String],
                default: [],
                validate: {
                    validator: (units: string[]) => Array.isArray(units),
                    message: 'Alternative units must be an array'
                }
            },

            // Nutritional information
            nutritionalInfo: {
                type: {
                    calories: {
                        type: Number,
                        required: [true, 'Calories are required'],
                        min: [0, 'Calories cannot be negative']
                    },
                    protein: {
                        type: Number,
                        required: [true, 'Protein content is required'],
                        min: [0, 'Protein cannot be negative']
                    },
                    carbohydrates: {
                        type: Number,
                        required: [true, 'Carbohydrate content is required'],
                        min: [0, 'Carbohydrates cannot be negative']
                    },
                    fat: {
                        type: Number,
                        required: [true, 'Fat content is required'],
                        min: [0, 'Fat cannot be negative']
                    },
                    servingSize: {
                        type: String,
                        required: [true, 'Serving size is required'],
                        trim: true
                    }
                },
                required: [true, 'Nutritional information is required']
            },

            // Image and recognition data
            imageUrl: {
                type: String,
                trim: true
            },
            recognitionTags: {
                type: [String],
                default: [],
                index: 'text' // Addresses requirement: Photographic Ingredient Recognition - tag search
            },

            // Storage and expiration tracking
            averageShelfLife: {
                type: {
                    refrigerated: {
                        type: Number,
                        required: [true, 'Refrigerated shelf life is required'],
                        validate: {
                            validator: this.validateShelfLife,
                            message: 'Shelf life must be a positive number'
                        }
                    },
                    frozen: {
                        type: Number,
                        required: [true, 'Frozen shelf life is required'],
                        validate: {
                            validator: this.validateShelfLife,
                            message: 'Shelf life must be a positive number'
                        }
                    },
                    pantry: {
                        type: Number,
                        required: [true, 'Pantry shelf life is required'],
                        validate: {
                            validator: this.validateShelfLife,
                            message: 'Shelf life must be a positive number'
                        }
                    }
                },
                required: [true, 'Average shelf life information is required']
            }
        }, {
            timestamps: true, // Automatically manage createdAt and updatedAt
            toJSON: { virtuals: true },
            toObject: { virtuals: true }
        });

        // Create compound index for category and name
        // Addresses requirement: Digital Pantry Management - efficient category-based queries
        this.index({ category: 1, name: 1 });

        // Create text index for recipe matching and search
        // Addresses requirements: Recipe Matching and Photographic Ingredient Recognition
        this.index({ 
            name: 'text',
            recognitionTags: 'text'
        }, {
            weights: {
                name: 10, // Name matches are more important
                recognitionTags: 5
            }
        });
    }

    /**
     * Validates that shelf life values are positive numbers
     * @param value - The shelf life value to validate
     * @returns boolean indicating if the value is valid
     */
    private validateShelfLife(value: number): boolean {
        return typeof value === 'number' && value > 0;
    }
}

// Create and export the Mongoose model
// Addresses all core requirements through MongoDB integration
const ingredientSchema = new IngredientSchema();
export const IngredientModel = model<IngredientDocument>('Ingredient', ingredientSchema);