/**
 * HUMAN TASKS:
 * 1. Configure recipe matching thresholds in environment variables
 * 2. Set up error tracking for recipe operations
 * 3. Verify recipe caching strategy with backend team
 */

// External dependencies
// @version: react-redux ^8.0.0
import { useSelector, useDispatch } from 'react-redux';
// @version: react ^18.0.0
import { useState, useCallback } from 'react';

// Internal dependencies
import { Recipe, RecipeFilter } from '../interfaces/recipe.interface';
import {
  selectRecipes,
  fetchRecipes,
  matchRecipesWithIngredients,
  fetchRecipeById
} from '../store/slices/recipeSlice';
import { AppDispatch } from '../store/store';

/**
 * Custom hook for managing recipe-related operations and state in the PantryChef web application
 * Implements requirements from:
 * - Smart Recipe Matching (1.2 Scope/Core Capabilities)
 * - Recipe Recommendations (1.2 Scope/Core Capabilities)
 * - Recipe Discovery (8.1 User Interface Design/Mobile Application Layout)
 */
export const useRecipes = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Get recipe state from Redux store
  const {
    recipes,
    matchedRecipes,
    loading: reduxLoading,
    error: reduxError,
    totalRecipes,
    favoriteRecipes
  } = useSelector(selectRecipes);

  // Local state for loading and error handling
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Requirement: Recipe Discovery
   * Fetches recipes with filtering, pagination and sorting capabilities
   */
  const fetchRecipesList = useCallback(async (
    filter: RecipeFilter,
    page?: number,
    limit?: number
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await dispatch(fetchRecipes({ filter, page, limit })).unwrap();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recipes');
      console.log('Failed to fetch recipes')
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  /**
   * Requirement: Smart Recipe Matching
   * Finds recipes that match with provided ingredient IDs
   */
  const findMatchingRecipes = useCallback(async (
    ingredientIds: string[]
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await dispatch(matchRecipesWithIngredients(ingredientIds)).unwrap();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find matching recipes');
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  /**
   * Requirement: Recipe Recommendations
   * Fetches recommended recipes based on user preferences and history
   */
  const fetchRecommendedRecipes = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      // Use empty filter to get recommended recipes
      const recommendedFilter: RecipeFilter = {
        difficulty: [],
        maxPrepTime: 0,
        maxCookTime: 0,
        ingredients: [],
        tags: [],
        searchTerm: ''
      };
      await dispatch(fetchRecipes({
        filter: recommendedFilter,
        page: 1,
        limit: 10
      })).unwrap();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recommended recipes');
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  /**
   * Fetches detailed recipe information by ID
   */
  const fetchRecipeDetails = useCallback(async (
    recipeId: string
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await dispatch(fetchRecipeById(recipeId)).unwrap();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recipe details');
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  return {
    // Recipe data
    recipes,
    matchedRecipes,
    totalRecipes,
    favoriteRecipes,

    // Loading and error states
    loading: loading || reduxLoading,
    error: error || reduxError,

    // Recipe operations
    fetchRecipes: fetchRecipesList,
    findMatchingRecipes,
    fetchRecommendedRecipes,
    fetchRecipeDetails
  };
};

export default useRecipes;