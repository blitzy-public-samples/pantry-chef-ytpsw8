/**
 * HUMAN TASKS:
 * 1. Verify that all filter options align with backend API capabilities
 * 2. Ensure proper error handling for invalid time inputs
 * 3. Confirm accessibility requirements are met for all filter controls
 */

import React, { useCallback } from 'react';
import classNames from 'classnames'; // v2.3.1
import { RecipeFilter as IRecipeFilter, RecipeDifficulty } from '../../interfaces/recipe.interface';
import { Dropdown, DropdownOption } from '../common/Dropdown';

// Props interface for the RecipeFilter component
interface RecipeFilterProps {
  initialFilters: IRecipeFilter;
  onFilterChange: (filters: IRecipeFilter) => void;
  availableTags?: string[];
  availableIngredients?: string[];
  loading?: boolean;
}

// Convert RecipeDifficulty enum to dropdown options
const difficultyOptions: DropdownOption[] = Object.values(RecipeDifficulty).map(difficulty => ({
  value: difficulty,
  label: difficulty.charAt(0) + difficulty.slice(1).toLowerCase()
}));

/**
 * RecipeFilter Component
 * Requirement: Recipe Discovery - Recipe discovery and management with filtering and sorting capabilities
 * Requirement: Smart Recipe Matching - Smart recipe matching based on available ingredients
 */
export const RecipeFilter: React.FC<RecipeFilterProps> = ({
  initialFilters,
  onFilterChange,
  availableTags = [],
  availableIngredients = [],
  loading = false
}) => {
  // Convert tags to dropdown options
  const tagOptions: DropdownOption[] = availableTags.map(tag => ({
    value: tag,
    label: tag
  }));

  // Convert ingredients to dropdown options
  const ingredientOptions: DropdownOption[] = availableIngredients.map(ingredient => ({
    value: ingredient,
    label: ingredient
  }));

  // Handle difficulty filter changes
  const handleDifficultyChange = useCallback((selectedDifficulties: string | string[]) => {
    const difficulties = Array.isArray(selectedDifficulties) 
      ? selectedDifficulties as RecipeDifficulty[]
      : [selectedDifficulties as RecipeDifficulty];

    onFilterChange({
      ...initialFilters,
      difficulty: difficulties
    });
  }, [initialFilters, onFilterChange]);

  // Handle time filter changes (prep time and cook time)
  const handleTimeChange = useCallback((type: 'maxPrepTime' | 'maxCookTime', value: string) => {
    const numericValue = parseInt(value, 10);
    if (isNaN(numericValue) || numericValue < 0) return;

    onFilterChange({
      ...initialFilters,
      [type]: numericValue
    });
  }, [initialFilters, onFilterChange]);

  // Handle tag filter changes
  const handleTagsChange = useCallback((selectedTags: string | string[]) => {
    const tags = Array.isArray(selectedTags) ? selectedTags : [selectedTags];
    onFilterChange({
      ...initialFilters,
      tags
    });
  }, [initialFilters, onFilterChange]);

  // Handle ingredient filter changes
  const handleIngredientsChange = useCallback((selectedIngredients: string | string[]) => {
    const ingredients = Array.isArray(selectedIngredients) ? selectedIngredients : [selectedIngredients];
    onFilterChange({
      ...initialFilters,
      ingredients
    });
  }, [initialFilters, onFilterChange]);

  // Handle search term changes
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...initialFilters,
      searchTerm: event.target.value
    });
  }, [initialFilters, onFilterChange]);

  return (
    <div className="flex flex-col gap-4 p-4 bg-white rounded-lg shadow">
      {/* Search Input */}
      <div className="flex flex-col gap-2">
        <label 
          htmlFor="recipe-search"
          className="text-sm font-medium text-gray-700"
        >
          Search Recipes
        </label>
        <input
          id="recipe-search"
          type="text"
          value={initialFilters.searchTerm}
          onChange={handleSearchChange}
          placeholder="Search by recipe name..."
          disabled={loading}
          className={classNames(
            'w-full px-3 py-2 border border-gray-300 rounded-md',
            'focus:ring-primary-500 focus:border-primary-500',
            { 'bg-gray-100 cursor-not-allowed': loading }
          )}
        />
      </div>

      {/* Difficulty Filter */}
      <Dropdown
        id="difficulty-filter"
        name="difficulty"
        label="Difficulty Level"
        options={difficultyOptions}
        value={initialFilters.difficulty}
        onChange={handleDifficultyChange}
        multiple
        disabled={loading}
        placeholder="Select difficulty levels"
      />

      {/* Preparation Time Filter */}
      <div className="flex flex-col gap-2">
        <label 
          htmlFor="prep-time"
          className="text-sm font-medium text-gray-700"
        >
          Maximum Preparation Time (minutes)
        </label>
        <input
          id="prep-time"
          type="number"
          min="0"
          value={initialFilters.maxPrepTime || ''}
          onChange={(e) => handleTimeChange('maxPrepTime', e.target.value)}
          disabled={loading}
          className={classNames(
            'w-full px-3 py-2 border border-gray-300 rounded-md',
            'focus:ring-primary-500 focus:border-primary-500',
            { 'bg-gray-100 cursor-not-allowed': loading }
          )}
        />
      </div>

      {/* Cooking Time Filter */}
      <div className="flex flex-col gap-2">
        <label 
          htmlFor="cook-time"
          className="text-sm font-medium text-gray-700"
        >
          Maximum Cooking Time (minutes)
        </label>
        <input
          id="cook-time"
          type="number"
          min="0"
          value={initialFilters.maxCookTime || ''}
          onChange={(e) => handleTimeChange('maxCookTime', e.target.value)}
          disabled={loading}
          className={classNames(
            'w-full px-3 py-2 border border-gray-300 rounded-md',
            'focus:ring-primary-500 focus:border-primary-500',
            { 'bg-gray-100 cursor-not-allowed': loading }
          )}
        />
      </div>

      {/* Tags Filter */}
      <Dropdown
        id="tags-filter"
        name="tags"
        label="Recipe Tags"
        options={tagOptions}
        value={initialFilters.tags}
        onChange={handleTagsChange}
        multiple
        disabled={loading}
        placeholder="Select recipe tags"
      />

      {/* Ingredients Filter */}
      <Dropdown
        id="ingredients-filter"
        name="ingredients"
        label="Required Ingredients"
        options={ingredientOptions}
        value={initialFilters.ingredients}
        onChange={handleIngredientsChange}
        multiple
        disabled={loading}
        placeholder="Select required ingredients"
      />
    </div>
  );
};

export type { RecipeFilterProps };