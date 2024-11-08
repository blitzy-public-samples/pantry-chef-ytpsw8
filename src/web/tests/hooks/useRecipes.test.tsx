// @version: @testing-library/react-hooks ^8.0.1
import { renderHook, act } from '@testing-library/react';
// @version: @testing-library/react ^13.0.0
import { act as reactAct } from '@testing-library/react';
// @version: react-redux ^8.0.0
import * as ReactRedux from 'react-redux';
// @version: @reduxjs/toolkit ^1.9.5
import { configureStore } from '@reduxjs/toolkit';
// @version: jest ^29.0.0

import useRecipes from '../../src/hooks/useRecipes';
import { Recipe, RecipeDifficulty, RecipeFilter } from '../../src/interfaces/recipe.interface';

// Mock recipe data matching Recipe interface
const mockRecipes: Recipe[] = [
  {
    id: '1',
    name: 'Test Recipe 1',
    description: 'A test recipe',
    difficulty: RecipeDifficulty.EASY,
    prepTime: 15,
    cookTime: 30,
    servings: 4,
    ingredients: [
      {
        id: 'ing1',
        name: 'Test Ingredient 1',
        quantity: 2,
        unit: 'cups',
        notes: '',
        optional: false
      }
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Test step',
        duration: 5,
        imageUrl: 'test.jpg'
      }
    ],
    imageUrl: 'recipe.jpg',
    tags: ['test'],
    nutritionInfo: {
      calories: 300,
      protein: 10,
      carbohydrates: 40,
      fat: 12,
      fiber: 5
    },
    createdBy: 'user1',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Mock Redux store
const mockStore = configureStore({
  reducer: {
    recipes: (state = {
      recipes: [],
      matchedRecipes: [],
      loading: false,
      error: null,
      totalRecipes: 0,
      favoriteRecipes: []
    }, action) => {
      switch (action.type) {
        case 'recipes/fetchRecipes/pending':
          return { ...state, loading: true };
        case 'recipes/fetchRecipes/fulfilled':
          return {
            ...state,
            loading: false,
            recipes: action.payload,
            error: null
          };
        case 'recipes/fetchRecipes/rejected':
          return {
            ...state,
            loading: false,
            error: action.error.message
          };
        case 'recipes/matchRecipesWithIngredients/fulfilled':
          return {
            ...state,
            loading: false,
            matchedRecipes: action.payload,
            error: null
          };
        default:
          return state;
      }
    }
  }
});

// Mock dispatch function
const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const originalModule = jest.requireActual('react-redux') as typeof ReactRedux;

  return {
    __esModule: true, // Use it when dealing with esModules
    ...originalModule,
    useDispatch: () => mockDispatch
  };

});

describe('useRecipes hook', () => {
  // Test wrapper with Redux Provider
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ReactRedux.Provider store={mockStore}>
      {children}
    </ReactRedux.Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch recipes successfully', async () => {
    // Test requirement: Recipe Discovery
    mockDispatch.mockReturnValue({ payload: mockRecipes });

    const { result } = renderHook(() => useRecipes(), { wrapper });

    const filter: RecipeFilter = {
      difficulty: [RecipeDifficulty.EASY],
      maxPrepTime: 30,
      maxCookTime: 60,
      ingredients: [],
      tags: [],
      searchTerm: ''
    };

    await act(async () => {
      await result.current.fetchRecipes(filter, 1, 10);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('recipes/fetchRecipes')
      })
    );
  });

  it('should handle recipe matching', async () => {
    // Test requirement: Smart Recipe Matching
    const matchedRecipes = mockRecipes;
    mockDispatch.mockReturnValue({ payload: matchedRecipes });

    const { result } = renderHook(() => useRecipes(), { wrapper });
    const ingredientIds = ['ing1', 'ing2'];

    await act(async () => {
      await result.current.findMatchingRecipes(ingredientIds);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('recipes/matchRecipesWithIngredients'),
        payload: ingredientIds
      })
    );
  });

  it('should fetch recipe recommendations', async () => {
    // Test requirement: Recipe Recommendations
    mockDispatch.mockReturnValue({ payload: mockRecipes });

    const { result } = renderHook(() => useRecipes(), { wrapper });

    await act(async () => {
      await result.current.fetchRecommendedRecipes();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('recipes/fetchRecipes'),
        payload: expect.objectContaining({
          filter: expect.objectContaining({
            difficulty: [],
            maxPrepTime: 0,
            maxCookTime: 0,
            ingredients: [],
            tags: [],
            searchTerm: ''
          }),
          page: 1,
          limit: 10
        })
      })
    );
  });

  it('should handle errors correctly', async () => {
    // Test error handling for recipe operations
    const errorMessage = 'Failed to fetch recipes';
    mockDispatch.mockReturnValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useRecipes(), { wrapper });
    const filter: RecipeFilter = {
      difficulty: [],
      maxPrepTime: 0,
      maxCookTime: 0,
      ingredients: [],
      tags: [],
      searchTerm: ''
    };

    await act(async () => {
      await result.current.fetchRecipes(filter, 1, 10);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(errorMessage);
  });

  it('should fetch recipe details', async () => {
    // Test fetching individual recipe details
    const recipeId = '1';
    mockDispatch.mockReturnValueOnce({ payload: mockRecipes[0] });

    const { result } = renderHook(() => useRecipes(), { wrapper });

    await act(async () => {
      await result.current.fetchRecipeDetails(recipeId);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('recipes/fetchRecipeById'),
        payload: recipeId
      })
    );
  });

  it('should handle loading states correctly', async () => {
    // Test loading state transitions
    mockDispatch.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

    const { result } = renderHook(() => useRecipes(), { wrapper });
    const filter: RecipeFilter = {
      difficulty: [],
      maxPrepTime: 0,
      maxCookTime: 0,
      ingredients: [],
      tags: [],
      searchTerm: ''
    };

    const fetchPromise = act(async () => {
      await result.current.fetchRecipes(filter, 1, 10);
    });

    expect(result.current.loading).toBe(true);
    await fetchPromise;
    expect(result.current.loading).toBe(false);
  });
});