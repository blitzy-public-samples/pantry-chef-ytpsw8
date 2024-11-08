/**
 * HUMAN TASKS:
 * 1. Verify that recipe difficulty levels match backend validation rules
 * 2. Ensure nutrition info units align with third-party recipe API data
 * 3. Confirm recipe tag categories with content management team
 */

// Import required interfaces and types
// @version: inventory.interface.ts from web/src/interfaces
import { InventoryItem } from './inventory.interface';
// @version: analytics.interface.ts from web/src/interfaces
import { AnalyticsEventType } from './analytics.interface';

/**
 * Requirement: Recipe Management - Recipe difficulty categorization
 * Enum defining recipe difficulty levels for filtering and display
 */
export enum RecipeDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

/**
 * Requirement: Recipe Management - Detailed ingredient specifications
 * Interface for recipe ingredient data structure with optional ingredients support
 */
export interface RecipeIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  notes: string;
  optional: boolean;
}

/**
 * Requirement: Recipe Management - Guided recipe preparation
 * Interface for recipe step data structure with visual aids
 */
export interface RecipeStep {
  stepNumber: number;
  instruction: string;
  duration: number;
  imageUrl: string;
}

/**
 * Requirement: Basic Nutritional Information - Nutrition tracking
 * Interface for basic recipe nutrition information
 */
export interface NutritionInfo {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
}

/**
 * Requirement: Recipe Management - Comprehensive recipe data structure
 * Main interface for recipe data with all required fields
 */
export interface Recipe {
  id: string;
  name: string;
  description: string;
  difficulty: RecipeDifficulty;
  prepTime: number;
  cookTime: number;
  servings: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  imageUrl: string;
  tags: string[];
  nutritionInfo: NutritionInfo;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Requirement: Recipe Discovery - Advanced search and filtering
 * Interface for recipe filtering options
 */
export interface RecipeFilter {
  difficulty: RecipeDifficulty[];
  maxPrepTime: number;
  maxCookTime: number;
  tags: string[];
  ingredients: string[];
  searchTerm: string;
}

/**
 * Requirement: Recipe Management - Recipe matching with pantry
 * Type for recipe match score calculation
 */
export type RecipeMatchScore = {
  recipe: Recipe;
  matchPercentage: number;
  missingIngredients: RecipeIngredient[];
  availableIngredients: InventoryItem[];
};

/**
 * Requirement: Recipe Discovery - Recipe sorting options
 * Enum for recipe sort criteria
 */
export enum RecipeSortCriteria {
  MATCH_SCORE = 'MATCH_SCORE',
  PREP_TIME = 'PREP_TIME',
  DIFFICULTY = 'DIFFICULTY',
  RATING = 'RATING',
  CREATED_DATE = 'CREATED_DATE'
}

/**
 * Requirement: Recipe Management - Recipe analytics tracking
 * Type for recipe view analytics event
 */
export type RecipeViewEvent = {
  eventType: AnalyticsEventType.RECIPE_VIEW;
  recipeId: string;
  userId: string;
  timestamp: Date;
  viewDuration: number;
};

/**
 * Requirement: Recipe Management - Recipe collection management
 * Interface for user recipe collections
 */
export interface RecipeCollection {
  id: string;
  name: string;
  description: string;
  recipes: Recipe[];
  createdBy: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}