// External dependencies
// @version @reduxjs/toolkit ^1.9.5
import { configureStore } from '@reduxjs/toolkit';
// @version @jest/globals ^29.0.0
import { describe, expect, jest, test, beforeEach } from '@jest/globals';

// Internal dependencies
import { Recipe, RecipeDifficulty, RecipeFilter } from '../../src/interfaces/recipe.interface';
import { recipeService } from '../../src/services/recipe.service';
import recipeReducer, {
  fetchRecipes,
  fetchRecipeById,
  matchRecipesWithIngredients,
  toggleFavoriteRecipe,
  clearSelectedRecipe,
  clearRecipeError,
  clearMatchedRecipes,
  selectRecipes
} from '../../src/store/slices/recipeSlice';

// Mock recipe service
jest.mock('../../src/services/recipe.service');

// Helper function to create test store
const setupStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      recipe: recipeReducer
    },
    preloadedState
  });
};

// Mock data
const mockRecipe: Recipe = {
  id: '1',
  name: 'Test Recipe',
  description: 'A test recipe',
  difficulty: RecipeDifficulty.MEDIUM,
  prepTime: 30,
  cookTime: 45,
  servings: 4,
  ingredients: [
    {
      id: 'ing1',
      name: 'Test Ingredient',
      quantity: 1,
      unit: 'cup',
      notes: 'fresh',
      optional: false
    }
  ],
  steps: [
    {
      stepNumber: 1,
      instruction: 'Test step',
      duration: 10,
      imageUrl: 'test.jpg'
    }
  ],
  imageUrl: 'recipe.jpg',
  tags: ['test'],
  nutritionInfo: {
    calories: 200,
    protein: 10,
    carbohydrates: 20,
    fat: 5,
    fiber: 3
  },
  createdBy: 'user1',
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('Recipe Slice Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test initial state
  test('should handle initial state', () => {
    const store = setupStore();
    const state = store.getState().recipe;

    expect(state).toEqual({
      recipes: [],
      selectedRecipe: null,
      matchedRecipes: [],
      loading: false,
      error: null,
      totalRecipes: 0,
      favoriteRecipes: new Set()
    });
  });

  // Test fetchRecipes thunk
  describe('fetchRecipes thunk', () => {
    test('should handle fetchRecipes.pending', () => {
      const store = setupStore();
      store.dispatch(fetchRecipes.pending('', {
        filter: {
          difficulty: [],
          maxPrepTime: 0,
          maxCookTime: 0,
          tags: [],
          ingredients: [],
          searchTerm: ''
        }, page: 1, limit: 10
      }));

      const state = store.getState().recipe;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    test('should handle fetchRecipes.fulfilled', async () => {
      const mockResponse = {
        recipes: [mockRecipe],
        total: 1
      };

      (recipeService.getRecipes as jest.Mocked<typeof recipeService.getRecipes>).mockResolvedValue(mockResponse);

      const store = setupStore();
      await store.dispatch(fetchRecipes({
        filter: {} as RecipeFilter,
        page: 1,
        limit: 10
      }));

      const state = store.getState().recipe;
      expect(state.loading).toBe(false);
      expect(state.recipes).toEqual([mockRecipe]);
      expect(state.totalRecipes).toBe(1);
    });

    test('should handle fetchRecipes.rejected', async () => {
      const errorMessage = 'Failed to fetch recipes';
      (recipeService.getRecipes as jest.Mocked<typeof recipeService.getRecipes>).mockRejectedValue(new Error(errorMessage));

      const store = setupStore();
      await store.dispatch(fetchRecipes({
        filter: {} as RecipeFilter,
        page: 1,
        limit: 10
      }));

      const state = store.getState().recipe;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  // Test fetchRecipeById thunk
  describe('fetchRecipeById thunk', () => {
    test('should fetch single recipe successfully', async () => {
      (recipeService.getRecipeById as jest.Mocked<typeof recipeService.getRecipeById>).mockResolvedValue(mockRecipe);

      const store = setupStore();
      await store.dispatch(fetchRecipeById('1'));

      const state = store.getState().recipe;
      expect(state.selectedRecipe).toEqual(mockRecipe);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    test('should handle fetchRecipeById error', async () => {
      const errorMessage = 'Recipe not found';
      (recipeService.getRecipeById as jest.Mocked<typeof recipeService.getRecipeById>).mockRejectedValue(new Error(errorMessage));

      const store = setupStore();
      await store.dispatch(fetchRecipeById('invalid-id'));

      const state = store.getState().recipe;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
      expect(state.selectedRecipe).toBeNull();
    });
  });

  // Test matchRecipesWithIngredients thunk
  describe('matchRecipesWithIngredients thunk', () => {
    test('should find matching recipes successfully', async () => {
      const matchedRecipes = [mockRecipe];
      (recipeService.matchRecipes as jest.Mocked<typeof recipeService.matchRecipes>).mockResolvedValue(matchedRecipes);

      const store = setupStore();
      await store.dispatch(matchRecipesWithIngredients(['ing1']));

      const state = store.getState().recipe;
      expect(state.matchedRecipes).toEqual(matchedRecipes);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    test('should handle matchRecipesWithIngredients error', async () => {
      const errorMessage = 'Failed to match recipes';
      (recipeService.matchRecipes as jest.Mocked<typeof recipeService.matchRecipes>).mockRejectedValue(new Error(errorMessage));

      const store = setupStore();
      await store.dispatch(matchRecipesWithIngredients(['ing1']));

      const state = store.getState().recipe;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
      expect(state.matchedRecipes).toEqual([]);
    });
  });

  // Test toggleFavoriteRecipe thunk
  describe('toggleFavoriteRecipe thunk', () => {
    test('should save recipe as favorite', async () => {
      (recipeService.saveRecipe as jest.Mocked<typeof recipeService.saveRecipe>).mockResolvedValue(undefined);

      const store = setupStore();
      await store.dispatch(toggleFavoriteRecipe({ recipeId: '1', isFavorite: true }));

      const state = store.getState().recipe;
      expect(state.favoriteRecipes.has('1')).toBe(true);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    test('should unsave recipe from favorites', async () => {
      (recipeService.unsaveRecipe as jest.Mocked<typeof recipeService.unsaveRecipe>).mockResolvedValue(undefined);

      const store = setupStore({
        recipe: {
          ...initialState,
          favoriteRecipes: new Set(['1'])
        }
      });

      await store.dispatch(toggleFavoriteRecipe({ recipeId: '1', isFavorite: false }));

      const state = store.getState().recipe;
      expect(state.favoriteRecipes.has('1')).toBe(false);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    test('should handle toggleFavoriteRecipe error', async () => {
      const errorMessage = 'Failed to update favorite status';
      (recipeService.saveRecipe as jest.Mocked<typeof recipeService.saveRecipe>).mockRejectedValue(new Error(errorMessage));

      const store = setupStore();
      await store.dispatch(toggleFavoriteRecipe({ recipeId: '1', isFavorite: true }));

      const state = store.getState().recipe;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
      expect(state.favoriteRecipes.has('1')).toBe(false);
    });
  });

  // Test synchronous actions
  describe('synchronous actions', () => {
    test('should clear selected recipe', () => {
      const store = setupStore({
        recipe: {
          ...initialState,
          selectedRecipe: mockRecipe
        }
      });

      store.dispatch(clearSelectedRecipe());
      const state = store.getState().recipe;
      expect(state.selectedRecipe).toBeNull();
    });

    test('should clear recipe error', () => {
      const store = setupStore({
        recipe: {
          ...initialState,
          error: 'Test error'
        }
      });

      store.dispatch(clearRecipeError());
      const state = store.getState().recipe;
      expect(state.error).toBeNull();
    });

    test('should clear matched recipes', () => {
      const store = setupStore({
        recipe: {
          ...initialState,
          matchedRecipes: [mockRecipe]
        }
      });

      store.dispatch(clearMatchedRecipes());
      const state = store.getState().recipe;
      expect(state.matchedRecipes).toEqual([]);
    });
  });

  // Test selectors
  describe('Recipe selectors', () => {
    test('selectRecipes should return recipe state', () => {
      const store = setupStore({
        recipe: {
          recipes: [mockRecipe],
          selectedRecipe: mockRecipe,
          matchedRecipes: [mockRecipe],
          loading: false,
          error: null,
          totalRecipes: 1,
          favoriteRecipes: new Set(['1'])
        }
      });

      const selected = selectRecipes(store.getState());
      expect(selected).toEqual({
        recipes: [mockRecipe],
        selectedRecipe: mockRecipe,
        matchedRecipes: [mockRecipe],
        loading: false,
        error: null,
        totalRecipes: 1,
        favoriteRecipes: new Set(['1'])
      });
    });
  });
});