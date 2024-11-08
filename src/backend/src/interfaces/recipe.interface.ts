// @version mongoose ^6.0.0

/**
 * HUMAN TASKS:
 * 1. Verify that the recipe difficulty levels align with frontend display requirements
 * 2. Ensure the rating scale (1-5) is consistently implemented across the application
 * 3. Confirm that the nutritional information units match the ingredient interface units
 */

/**
 * Interface for recipe ingredients with quantity and preparation notes
 * Addresses requirement: Recipe Management - Smart recipe matching based on available ingredients
 */
export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: string;
  notes: string;
}

/**
 * Interface for recipe cooking steps with timing and visual guidance
 * Addresses requirement: Recipe Management - Comprehensive recipe instructions
 */
export interface CookingStep {
  stepNumber: number;
  instruction: string;
  duration: number; // Duration in minutes
  imageUrl: string;
}

/**
 * Enum for recipe difficulty levels
 * Addresses requirement: Recipe Management - User skill level matching
 */
export enum RecipeDifficulty {
  EASY = 'EASY',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

/**
 * Interface for recipe nutritional information per serving
 * Addresses requirement: Basic Nutritional Information - Provides basic nutritional information for recipes
 */
export interface RecipeNutritionalInfo {
  servingSize: string;
  calories: number;
  protein: number; // in grams
  carbohydrates: number; // in grams
  fat: number; // in grams
}

/**
 * Interface for recipe user ratings and comments
 * Addresses requirement: Recipe Sharing - Social recipe sharing and community features
 */
export interface RecipeRating {
  userId: string;
  rating: number; // Scale of 1-5
  comment: string;
  createdAt: Date;
}

/**
 * Main interface for recipe data structure
 * Addresses requirements:
 * - Recipe Management - Smart recipe matching
 * - Recipe Sharing - Social features
 * - Recipe Service - Core recipe data structure
 * - Basic Nutritional Information - Nutritional tracking
 */
export interface Recipe {
  id: string;
  name: string;
  description: string;
  authorId: string;

  // Recipe composition
  ingredients: RecipeIngredient[];
  instructions: CookingStep[];

  // Timing information
  prepTime: number; // in minutes
  cookTime: number; // in minutes
  servings: number;

  // Classification
  difficulty: RecipeDifficulty;
  cuisine: string;
  tags: string[];

  // Media
  imageUrl: string;

  // Nutritional data
  nutritionalInfo: RecipeNutritionalInfo;

  // Social features
  ratings: RecipeRating[];
  averageRating: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
