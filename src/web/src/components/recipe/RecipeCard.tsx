/**
 * HUMAN TASKS:
 * 1. Ensure all required dependencies are installed:
 *    - react@^18.0.0
 *    - classnames@^2.3.0
 * 2. Verify that theme configuration is properly imported
 * 3. Add required icons to the project assets
 */

import React from 'react'; // ^18.0.0
import classnames from 'classnames'; // ^2.3.0
import Card from '../common/Card';
import { Recipe, RecipeDifficulty } from '../../interfaces/recipe.interface';
import { theme } from '../../config/theme';

/**
 * Props interface for the RecipeCard component
 * Implements requirements from Recipe Discovery and Management
 */
interface RecipeCardProps {
  /** Recipe data to be displayed in the card */
  recipe: Recipe;
  /** Optional click handler for recipe selection */
  onClick?: (recipeId: string) => void;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * A reusable recipe card component that displays recipe information in a visually appealing format
 * Implements requirements:
 * - Recipe Discovery (8.1): Recipe discovery with filtering and sorting capabilities
 * - Recipe Management (1.2): Smart recipe matching and personalized recommendations
 */
const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick, className }) => {
  // Format cooking times into human-readable format
  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  // Map difficulty levels to theme colors
  const difficultyColorMap = {
    [RecipeDifficulty.EASY]: theme.palette.success.main,
    [RecipeDifficulty.MEDIUM]: theme.palette.warning.main,
    [RecipeDifficulty.HARD]: theme.palette.error.main,
  };

  // Handle click events
  const handleClick = () => {
    if (onClick) {
      onClick(recipe.id);
    }
  };

  return (
    <Card
      elevation="md"
      padding="none"
      onClick={handleClick}
      className={classnames(
        'w-full max-w-sm transition-transform duration-200 hover:scale-105',
        className
      )}
    >
      {/* Recipe Image */}
      <div className="relative w-full aspect-[4/3] overflow-hidden rounded-t-md">
        <img
          src={recipe.imageUrl}
          alt={recipe.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Difficulty Badge */}
        <div
          className="absolute top-4 right-4 px-3 py-1 rounded-full text-white text-sm font-medium"
          style={{ backgroundColor: difficultyColorMap[recipe.difficulty] }}
        >
          {recipe.difficulty}
        </div>
      </div>

      {/* Recipe Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className={classnames(
          'text-lg font-semibold mb-2',
          theme.typography.fontFamily.sans
        )}>
          {recipe.name}
        </h3>

        {/* Description */}
        <p className={classnames(
          'text-sm text-gray-600 mb-4 line-clamp-2',
          theme.typography.fontFamily.sans
        )}>
          {recipe.description}
        </p>

        {/* Cooking Times */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {/* Prep Time */}
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
            </svg>
            <span>Prep: {formatTime(recipe.prepTime)}</span>
          </div>

          {/* Cook Time */}
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
            <span>Cook: {formatTime(recipe.cookTime)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RecipeCard;