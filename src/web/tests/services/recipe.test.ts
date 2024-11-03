// External dependencies
// @version jest ^29.0.0
import { jest } from '@jest/globals';
// @version axios-mock-adapter ^1.21.0
import MockAdapter from 'axios-mock-adapter';

// Internal dependencies
import { recipeService } from '../../src/services/recipe.service';
import { apiClient } from '../../src/utils/api';
import { Recipe, RecipeDifficulty } from '../../src/interfaces/recipe.interface';

/**
 * HUMAN TASKS:
 * 1. Configure test environment variables for API endpoints
 * 2. Set up test data fixtures for recipe variations
 * 3. Configure test coverage thresholds
 * 4. Set up integration test environment with Elasticsearch
 */

describe('recipeService', () => {
  let mockAxios: MockAdapter;

  // Mock recipe data matching the Recipe interface
  const mockRecipe: Recipe = {
    id: 'test-recipe-id',
    name: 'Test Recipe',
    description: 'Test recipe description',
    difficulty: RecipeDifficulty.MEDIUM,
    prepTime: 15,
    cookTime: 30,
    servings: 4,
    ingredients: [
      {
        id: 'ingredient-1',
        name: 'Test Ingredient',
        quantity: 1,
        unit: 'cup',
        notes: 'Test notes',
        optional: false
      }
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Test instruction',
        duration: 10,
        imageUrl: 'test-step-image.jpg'
      }
    ],
    imageUrl: 'test-image.jpg',
    tags: ['test'],
    nutritionInfo: {
      calories: 200,
      protein: 10,
      carbohydrates: 25,
      fat: 8,
      fiber: 3
    },
    createdBy: 'test-user',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    // Create new mock adapter instance for each test
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    // Reset mock adapter and clear all mocks
    mockAxios.reset();
    jest.clearAllMocks();
  });

  /**
   * Requirement: Recipe Discovery (8.1 User Interface Design/Screen Components)
   * Tests recipe fetching functionality with Elasticsearch integration
   */
  test('getRecipes should fetch recipes with filters and pagination', async () => {
    // Mock response data
    const mockResponse = {
      recipes: [mockRecipe],
      total: 1
    };

    // Configure mock for getRecipes endpoint with query parameters
    mockAxios.onGet(/\/recipes\?.*/).reply(200, mockResponse);

    // Test with filter parameters
    const filter = {
      difficulty: [RecipeDifficulty.MEDIUM],
      maxPrepTime: 30,
      maxCookTime: 60,
      ingredients: ['ingredient-1'],
      tags: ['test'],
      searchTerm: 'test recipe'
    };

    const result = await recipeService.getRecipes(filter, 1, 20);

    // Verify response structure and data
    expect(result).toEqual(mockResponse);
    expect(result.recipes[0]).toHaveProperty('id', mockRecipe.id);
    expect(result.total).toBe(1);

    // Verify query parameters were correctly formatted
    const lastRequest = mockAxios.history.get[0];
    expect(lastRequest.url).toContain('difficulty=MEDIUM');
    expect(lastRequest.url).toContain('maxPrepTime=30');
    expect(lastRequest.url).toContain('ingredients=ingredient-1');
  });

  /**
   * Requirement: Recipe Management (1.2 Scope/Core Capabilities)
   * Tests fetching single recipe by ID with complete details
   */
  test('getRecipeById should fetch complete recipe details', async () => {
    // Configure mock for getRecipeById endpoint
    mockAxios.onGet(`/recipes/${mockRecipe.id}`).reply(200, mockRecipe);

    const result = await recipeService.getRecipeById(mockRecipe.id);

    // Verify complete recipe data structure
    expect(result).toEqual(mockRecipe);
    expect(result.ingredients).toHaveLength(1);
    expect(result.steps).toHaveLength(1);
    expect(result.nutritionInfo).toBeDefined();

    // Test error handling for invalid recipe ID
    await expect(recipeService.getRecipeById('')).rejects.toThrow('Recipe ID is required');
  });

  /**
   * Requirement: Recipe Management (1.2 Scope/Core Capabilities)
   * Tests intelligent recipe matching functionality
   */
  test('matchRecipes should return recipes matched by ingredients', async () => {
    // Mock response with relevance scores
    const mockMatchResponse = {
      recipes: [mockRecipe],
      scores: {
        'test-recipe-id': 0.85
      }
    };

    // Configure mock for matchRecipes endpoint
    mockAxios.onPost('/recipes/match').reply(200, mockMatchResponse);

    const ingredientIds = ['ingredient-1', 'ingredient-2'];
    const result = await recipeService.matchRecipes(ingredientIds);

    // Verify matched recipes are returned and sorted
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(mockRecipe);

    // Verify request payload
    const lastRequest = mockAxios.history.post[0];
    expect(JSON.parse(lastRequest.data)).toEqual({ ingredientIds });

    // Test error handling for empty ingredients list
    await expect(recipeService.matchRecipes([])).rejects.toThrow('At least one ingredient ID is required');
  });

  /**
   * Requirement: Recipe Management (1.2 Scope/Core Capabilities)
   * Tests recipe saving functionality for user favorites
   */
  test('saveRecipe should save recipe to user favorites', async () => {
    // Configure mock for saveRecipe endpoint
    mockAxios.onPost(`/recipes/${mockRecipe.id}/save`).reply(200);

    await expect(recipeService.saveRecipe(mockRecipe.id)).resolves.not.toThrow();

    // Verify request was made correctly
    expect(mockAxios.history.post[0].url).toContain(`/recipes/${mockRecipe.id}/save`);

    // Test error handling for invalid recipe ID
    await expect(recipeService.saveRecipe('')).rejects.toThrow('Recipe ID is required');
  });

  /**
   * Requirement: Recipe Management (1.2 Scope/Core Capabilities)
   * Tests recipe unsaving functionality from user favorites
   */
  test('unsaveRecipe should remove recipe from user favorites', async () => {
    // Configure mock for unsaveRecipe endpoint
    mockAxios.onDelete(`/recipes/${mockRecipe.id}/save`).reply(200);

    await expect(recipeService.unsaveRecipe(mockRecipe.id)).resolves.not.toThrow();

    // Verify request was made correctly
    expect(mockAxios.history.delete[0].url).toContain(`/recipes/${mockRecipe.id}/save`);

    // Test error handling for invalid recipe ID
    await expect(recipeService.unsaveRecipe('')).rejects.toThrow('Recipe ID is required');
  });

  /**
   * Requirement: Recipe Search (6.1 Component Diagrams/6.1.1 Core System Components)
   * Tests error handling for API failures
   */
  test('should handle API errors correctly', async () => {
    // Mock network error
    mockAxios.onGet(/\/recipes/).networkError();
    await expect(recipeService.getRecipes({} as any)).rejects.toThrow();

    // Mock 404 error
    mockAxios.onGet(`/recipes/${mockRecipe.id}`).reply(404);
    await expect(recipeService.getRecipeById(mockRecipe.id)).rejects.toThrow();

    // Mock 500 error
    mockAxios.onPost('/recipes/match').reply(500);
    await expect(recipeService.matchRecipes(['ingredient-1'])).rejects.toThrow();
  });
});