/**
 * HUMAN TASKS:
 * 1. Verify that grid layout responsiveness meets design requirements
 * 2. Ensure proper loading states are displayed during recipe fetching
 * 3. Confirm accessibility requirements for grid navigation
 */

import React, { useCallback, useState, useEffect } from 'react'; // ^18.0.0
import classNames from 'classnames'; // ^2.3.1
import RecipeCard from './RecipeCard';
import RecipeFilter from './RecipeFilter';
import { Recipe, RecipeFilter as IRecipeFilter } from '../../interfaces/recipe.interface';

/**
 * Props interface for the RecipeGrid component
 * Implements requirements from Recipe Discovery and Management
 */
interface RecipeGridProps {
  /** Array of recipes to display in the grid */
  recipes: Recipe[];
  /** Loading state indicator */
  loading: boolean;
  /** Callback when a recipe is selected */
  onRecipeSelect: (recipeId: string) => void;
  /** Callback when filters are changed */
  onFilterChange: (filters: IRecipeFilter) => void;
  /** Optional array of available recipe tags for filtering */
  availableTags?: string[];
  /** Optional array of available ingredients for filtering */
  availableIngredients?: string[];
}

/**
 * A responsive grid component that displays recipe cards with filtering capabilities
 * Implements requirements:
 * - Recipe Discovery (8.1): Recipe discovery and management with filtering and sorting capabilities
 * - Recipe Management (1.2): Smart recipe matching based on available ingredients
 */
const RecipeGrid: React.FC<RecipeGridProps> = ({
  recipes,
  loading,
  onRecipeSelect,
  onFilterChange,
  availableTags = [],
  availableIngredients = []
}) => {
  // Initial filter state
  const [filters, setFilters] = useState<IRecipeFilter>({
    difficulty: [],
    maxPrepTime: 0,
    maxCookTime: 0,
    tags: [],
    ingredients: [],
    searchTerm: ''
  });

  // Handle recipe card click
  const handleRecipeClick = useCallback((recipeId: string) => {
    onRecipeSelect(recipeId);
  }, [onRecipeSelect]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: IRecipeFilter) => {
    setFilters(newFilters);
    onFilterChange(newFilters);
  }, [onFilterChange]);

  // Reset filters when available tags or ingredients change
  useEffect(() => {
    setFilters(prevFilters => ({
      ...prevFilters,
      tags: prevFilters.tags.filter(tag => availableTags.includes(tag)),
      ingredients: prevFilters.ingredients.filter(ingredient => 
        availableIngredients.includes(ingredient)
      )
    }));
  }, [availableTags, availableIngredients]);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Filter Sidebar */}
      <aside className="w-full lg:w-80 flex-shrink-0">
        <RecipeFilter
          initialFilters={filters}
          onFilterChange={handleFilterChange}
          availableTags={availableTags}
          availableIngredients={availableIngredients}
          loading={loading}
        />
      </aside>

      {/* Recipe Grid */}
      <main className="flex-grow">
        {loading ? (
          // Loading State
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="animate-pulse bg-gray-200 rounded-lg aspect-[4/3]"
              />
            ))}
          </div>
        ) : recipes.length > 0 ? (
          // Recipe Grid
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            role="grid"
            aria-label="Recipe grid"
          >
            {recipes.map(recipe => (
              <div
                key={recipe.id}
                role="gridcell"
                className="flex"
              >
                <RecipeCard
                  recipe={recipe}
                  onClick={handleRecipeClick}
                  className="h-full"
                />
              </div>
            ))}
          </div>
        ) : (
          // Empty State
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg
              className="w-16 h-16 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No recipes found
            </h3>
            <p className="text-sm text-gray-500">
              Try adjusting your filters or search terms
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default RecipeGrid;