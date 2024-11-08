/**
 * HUMAN TASKS:
 * 1. Configure recipe matching thresholds in environment variables
 * 2. Set up analytics tracking for recipe interactions
 * 3. Verify recipe filtering performance with large datasets
 * 4. Configure recipe image CDN endpoints
 */

import React, { useEffect, useState, useCallback } from 'react'; // ^18.0.0
import { useRouter } from 'next/router'; // ^13.0.0
import MainLayout from '../../../components/layout/MainLayout';
import RecipeGrid from '../../../components/recipe/RecipeGrid';
import useRecipes from '../../../hooks/useRecipes';
import { RecipeFilter } from '../../../interfaces/recipe.interface';
import { APP_ROUTES } from '../../../config/constants';

/**
 * Recipe dashboard page component that implements recipe discovery and management functionality
 * Implements requirements:
 * - Recipe Discovery (1.2): Smart recipe matching based on available ingredients
 * - Recipe Management (8.1): Recipe discovery with filter panel and grid
 * - Basic Nutritional Information (1.2): Display of nutritional info in recipe cards
 */
const RecipesPage: React.FC = () => {
  const router = useRouter();
  const {
    recipes,
    loading,
    error,
    fetchRecipes,
    findMatchingRecipes
  } = useRecipes();

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 12;

  // Filter state
  const [currentFilters, setCurrentFilters] = useState<RecipeFilter>({
    difficulty: [],
    maxPrepTime: 0,
    maxCookTime: 0,
    tags: [],
    ingredients: [],
    searchTerm: ''
  });

  /**
   * Requirement: Recipe Management
   * Handles navigation to recipe detail page when a recipe is selected
   */
  const handleRecipeSelect = useCallback((recipeId: string) => {
    router.push(`${APP_ROUTES.RECIPES}/${recipeId}`);
  }, [router]);

  /**
   * Requirement: Recipe Discovery
   * Handles filter changes and triggers recipe fetching with updated filters
   */
  const handleFilterChange = useCallback((filters: RecipeFilter) => {
    setCurrentFilters(filters);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  /**
   * Requirement: Recipe Discovery
   * Fetches recipes on component mount and when filters/pagination change
   */
  useEffect(() => {
    const fetchRecipesData = async () => {

      if (currentFilters.ingredients.length > 0) {
        // Use smart matching when ingredients are selected
        await findMatchingRecipes(currentFilters.ingredients);
      } else {
        // Regular recipe fetching with filters
        await fetchRecipes(currentFilters, currentPage, ITEMS_PER_PAGE);
      }
    };

    fetchRecipesData();
  }, [currentPage, fetchRecipes, findMatchingRecipes]);

  return (
    <>
      <div className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Recipes
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Discover recipes based on your ingredients and preferences
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">
              {error}
            </p>
          </div>
        )}

        {/* Recipe Grid with Filters */}
        <div className="mt-6">
          <RecipeGrid
            recipes={recipes}
            loading={loading}
            onRecipeSelect={handleRecipeSelect}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Pagination Controls */}
        {!loading && recipes.length > 0 && (
          <div className="mt-8 flex justify-center">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-md bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                Page {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={recipes.length < ITEMS_PER_PAGE}
                className="px-3 py-2 rounded-md bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>
    </>
  );
};

export default RecipesPage;