// External dependencies
// @version axios ^1.4.0
import axios from 'axios';

// Internal dependencies
import { Recipe, RecipeFilter, RecipeDifficulty } from '../interfaces/recipe.interface';
import { apiClient, handleApiError } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';

/**
 * HUMAN TASKS:
 * 1. Configure recipe matching algorithm thresholds in environment variables
 * 2. Set up monitoring for recipe search performance
 * 3. Configure caching parameters for recipe data
 * 4. Verify nutritional information calculation methods
 */

/**
 * Service module that handles recipe-related operations including fetching, filtering,
 * matching, and managing recipes in the PantryChef web application.
 */
const recipeService = {
  /**
   * Requirement: Recipe Discovery (8.1.2 Screen Components)
   * Fetches a paginated list of recipes with optional filtering using Elasticsearch integration
   */
  async getRecipes(
    filter: RecipeFilter,
    page: number = 1,
    limit: number = 20
  ): Promise<{ recipes: Recipe[]; total: number }> {
    try {
      // Normalize filter parameters
      const normalizedFilter = {
        difficulty: filter.difficulty || [],
        maxPrepTime: filter.maxPrepTime || 0,
        maxCookTime: filter.maxCookTime || 0,
        ingredients: filter.ingredients || [],
        tags: filter.tags || [],
        searchTerm: filter.searchTerm?.trim() || ''
      };

      // Construct query parameters
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...normalizedFilter,
        difficulty: normalizedFilter.difficulty.join(','),
        ingredients: normalizedFilter.ingredients.join(','),
        tags: normalizedFilter.tags.join(',')
      });

      const response = await apiClient.get(
        `${API_ENDPOINTS.RECIPES.LIST}?${queryParams.toString()}`
      );

      return {
        recipes: response.data.recipes,
        total: response.data.total
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw handleApiError(error);
      }
      throw error;
    }
  },

  /**
   * Requirement: Recipe Management (1.2 Scope/Core Capabilities)
   * Retrieves detailed information for a specific recipe including nutritional information
   */
  async getRecipeById(recipeId: string): Promise<Recipe> {
    try {
      // Validate recipe ID
      if (!recipeId) {
        throw new Error('Recipe ID is required');
      }

      const response = await apiClient.get(
        API_ENDPOINTS.RECIPES.DETAIL.replace(':id', recipeId)
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw handleApiError(error);
      }
      throw error;
    }
  },

  /**
   * Requirement: Recipe Management (1.2 Scope/Core Capabilities)
   * Finds recipes that match available ingredients using intelligent matching algorithm
   */
  async matchRecipes(ingredientIds: string[]): Promise<Recipe[]> {
    try {
      // Validate ingredient IDs array
      if (!Array.isArray(ingredientIds) || ingredientIds.length === 0) {
        throw new Error('At least one ingredient ID is required');
      }

      const response = await apiClient.post(API_ENDPOINTS.RECIPES.MATCH, {
        ingredientIds
      });

      // Sort matching recipes by relevance score
      return response.data.sort((a: Recipe, b: Recipe) => {
        const scoreA = response.data.scores[a.id] || 0;
        const scoreB = response.data.scores[b.id] || 0;
        return scoreB - scoreA;
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw handleApiError(error);
      }
      throw error;
    }
  },

  /**
   * Requirement: Recipe Management (1.2 Scope/Core Capabilities)
   * Saves a recipe to user's favorites collection
   */
  async saveRecipe(recipeId: string): Promise<void> {
    try {
      // Validate recipe ID
      if (!recipeId) {
        throw new Error('Recipe ID is required');
      }

      await apiClient.post(
        API_ENDPOINTS.RECIPES.SAVE.replace(':id', recipeId)
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw handleApiError(error);
      }
      throw error;
    }
  },

  /**
   * Requirement: Recipe Management (1.2 Scope/Core Capabilities)
   * Removes a recipe from user's favorites collection
   */
  async unsaveRecipe(recipeId: string): Promise<void> {
    try {
      // Validate recipe ID
      if (!recipeId) {
        throw new Error('Recipe ID is required');
      }

      await apiClient.delete(
        API_ENDPOINTS.RECIPES.UNSAVE.replace(':id', recipeId)
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw handleApiError(error);
      }
      throw error;
    }
  }
};

export { recipeService };