/**
 * HUMAN TASKS:
 * 1. Ensure @testing-library/react@^13.0.0 is installed
 * 2. Verify jest@^29.0.0 is configured properly
 * 3. Confirm theme configuration is available in test environment
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // ^13.0.0
import RecipeCard from '../../src/components/recipe/RecipeCard';
import { Recipe, RecipeDifficulty } from '../../src/interfaces/recipe.interface';

// Mock recipe data for testing
const mockRecipe: Recipe = {
  id: 'test-recipe-1',
  name: 'Test Recipe',
  description: 'A test recipe description that is long enough to test truncation and should span multiple lines when displayed in the card component',
  difficulty: RecipeDifficulty.MEDIUM,
  prepTime: 15,
  cookTime: 30,
  servings: 4,
  ingredients: [],
  steps: [],
  imageUrl: '/assets/images/test-recipe.jpg',
  tags: ['test'],
  nutritionInfo: {
    calories: 500,
    protein: 20,
    carbohydrates: 60,
    fat: 15,
    fiber: 5
  },
  createdBy: 'test-user',
  createdAt: new Date(),
  updatedAt: new Date()
};

// Mock event handlers
const mockHandlers = {
  onRecipeSelect: jest.fn(),
};

describe('RecipeCard Component', () => {
  // Reset mock functions before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test: Basic Rendering
   * Requirement: Recipe Discovery (8.1)
   * Verifies that the component renders all essential recipe information correctly
   */
  it('should render recipe card with all required information', () => {
    render(<RecipeCard recipe={mockRecipe} />);

    // Verify recipe title is rendered
    expect(screen.getByText(mockRecipe.name)).toBeInTheDocument();

    // Verify recipe description is rendered
    expect(screen.getByText(mockRecipe.description)).toBeInTheDocument();

    // Verify difficulty badge is rendered
    expect(screen.getByText(mockRecipe.difficulty)).toBeInTheDocument();

    // Verify recipe image is rendered with correct attributes
    const recipeImage = screen.getByAltText(mockRecipe.name) as HTMLImageElement;
    expect(recipeImage).toBeInTheDocument();
    expect(recipeImage.src).toContain(mockRecipe.imageUrl);
  });

  /**
   * Test: Click Handler
   * Requirement: Recipe Management (1.2)
   * Verifies that the click handler is called with correct recipe ID
   */
  it('should call onClick handler with recipe ID when clicked', async () => {
    render(<RecipeCard recipe={mockRecipe} onClick={mockHandlers.onRecipeSelect} />);

    // Find and click the card
    const card = screen.getByRole('article');
    fireEvent.click(card);

    // Verify click handler was called with correct recipe ID
    expect(mockHandlers.onRecipeSelect).toHaveBeenCalledTimes(1);
    expect(mockHandlers.onRecipeSelect).toHaveBeenCalledWith(mockRecipe.id);
  });

  /**
   * Test: Time Formatting
   * Requirement: Recipe Discovery (8.1)
   * Verifies that prep and cook times are formatted correctly
   */
  it('should format cooking times correctly', () => {
    render(<RecipeCard recipe={mockRecipe} />);

    // Check prep time formatting
    expect(screen.getByText(/Prep: 15m/)).toBeInTheDocument();

    // Check cook time formatting
    expect(screen.getByText(/Cook: 30m/)).toBeInTheDocument();

    // Test with longer duration
    const longRecipe = {
      ...mockRecipe,
      prepTime: 90,
      cookTime: 150
    };
    render(<RecipeCard recipe={longRecipe} />);

    // Verify hours and minutes format
    expect(screen.getByText(/Prep: 1h 30m/)).toBeInTheDocument();
    expect(screen.getByText(/Cook: 2h 30m/)).toBeInTheDocument();
  });

  /**
   * Test: Difficulty Display
   * Requirement: Recipe Discovery (8.1)
   * Verifies that difficulty levels are displayed with correct styling
   */
  it('should display difficulty badge with correct styling', () => {
    const { rerender } = render(<RecipeCard recipe={mockRecipe} />);

    // Test MEDIUM difficulty
    const mediumBadge = screen.getByText(RecipeDifficulty.MEDIUM);
    expect(mediumBadge).toHaveStyle({ backgroundColor: expect.any(String) });

    // Test EASY difficulty
    rerender(<RecipeCard recipe={{ ...mockRecipe, difficulty: RecipeDifficulty.EASY }} />);
    const easyBadge = screen.getByText(RecipeDifficulty.EASY);
    expect(easyBadge).toHaveStyle({ backgroundColor: expect.any(String) });

    // Test HARD difficulty
    rerender(<RecipeCard recipe={{ ...mockRecipe, difficulty: RecipeDifficulty.HARD }} />);
    const hardBadge = screen.getByText(RecipeDifficulty.HARD);
    expect(hardBadge).toHaveStyle({ backgroundColor: expect.any(String) });
  });

  /**
   * Test: Image Loading
   * Requirement: Recipe Discovery (8.1)
   * Verifies image loading behavior and lazy loading attribute
   */
  it('should handle image loading correctly', () => {
    render(<RecipeCard recipe={mockRecipe} />);

    const image = screen.getByAltText(mockRecipe.name) as HTMLImageElement;
    
    // Verify lazy loading is enabled
    expect(image).toHaveAttribute('loading', 'lazy');
    
    // Verify image source
    expect(image.src).toContain(mockRecipe.imageUrl);
  });

  /**
   * Test: Description Truncation
   * Requirement: Recipe Discovery (8.1)
   * Verifies that long descriptions are truncated properly
   */
  it('should truncate long descriptions', () => {
    const longDescription = 'A'.repeat(200);
    render(<RecipeCard recipe={{ ...mockRecipe, description: longDescription }} />);

    const description = screen.getByText(/A+/);
    expect(description).toHaveClass('line-clamp-2');
  });

  /**
   * Test: Responsive Layout
   * Requirement: Recipe Discovery (8.1)
   * Verifies that the card maintains proper layout at different sizes
   */
  it('should maintain responsive layout', () => {
    render(<RecipeCard recipe={mockRecipe} />);

    const card = screen.getByRole('article');
    
    // Verify responsive classes
    expect(card).toHaveClass('w-full');
    expect(card).toHaveClass('max-w-sm');
    
    // Verify aspect ratio of image container
    const imageContainer = card.querySelector('.aspect-[4/3]');
    expect(imageContainer).toBeInTheDocument();
  });

  /**
   * Test: Custom Class Names
   * Requirement: Recipe Discovery (8.1)
   * Verifies that custom class names are applied correctly
   */
  it('should apply custom className prop correctly', () => {
    const customClass = 'custom-test-class';
    render(<RecipeCard recipe={mockRecipe} className={customClass} />);

    const card = screen.getByRole('article');
    expect(card).toHaveClass(customClass);
  });
});