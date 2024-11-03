/**
 * HUMAN TASKS:
 * 1. Configure recipe matching thresholds in environment variables
 * 2. Set up monitoring for recipe search performance
 * 3. Verify recipe caching strategy with backend team
 * 4. Configure error tracking for recipe operations
 */

// External dependencies
// @version @reduxjs/toolkit ^1.9.5
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Internal dependencies
import { Recipe, RecipeFilter, RecipeDifficulty } from '../../interfaces/recipe.interface';
import { recipeService } from '../../services/recipe.service';

// State interface definition
interface RecipeState {
  recipes: Recipe[];
  selectedRecipe: Recipe | null;
  matchedRecipes: Recipe[];
  loading: boolean;
  error: string | null;
  totalRecipes: number;
  favoriteRecipes: Set<string>;
}

// Initial state
const initialState: RecipeState = {
  recipes: [],
  selectedRecipe: null,
  matchedRecipes: [],
  loading: false,
  error: null,
  totalRecipes: 0,
  favoriteRecipes: new Set()
};

/**
 * Requirement: Recipe Discovery (8.1 User Interface Design/Screen Components)
 * Async thunk for fetching recipes with pagination and advanced filtering
 */
export const fetchRecipes = createAsyncThunk(
  'recipe/fetchRecipes',
  async ({ filter, page, limit }: { filter: RecipeFilter; page: number; limit: number }) => {
    try {
      const response = await recipeService.getRecipes(filter, page, limit);
      return response;
    } catch (error) {
      throw error instanceof Error ? error.message : 'Failed to fetch recipes';
    }
  }
);

/**
 * Requirement: Recipe Management (1.2 Scope/Core Capabilities)
 * Async thunk for fetching a single recipe by ID with complete details
 */
export const fetchRecipeById = createAsyncThunk(
  'recipe/fetchRecipeById',
  async (recipeId: string) => {
    try {
      const recipe = await recipeService.getRecipeById(recipeId);
      return recipe;
    } catch (error) {
      throw error instanceof Error ? error.message : 'Failed to fetch recipe details';
    }
  }
);

/**
 * Requirement: Recipe Management (1.2 Scope/Core Capabilities)
 * Async thunk for finding recipes that match available ingredients
 */
export const matchRecipesWithIngredients = createAsyncThunk(
  'recipe/matchRecipesWithIngredients',
  async (ingredientIds: string[]) => {
    try {
      const matchedRecipes = await recipeService.matchRecipes(ingredientIds);
      return matchedRecipes;
    } catch (error) {
      throw error instanceof Error ? error.message : 'Failed to match recipes';
    }
  }
);

/**
 * Requirement: Recipe Management (1.2 Scope/Core Capabilities)
 * Async thunk for toggling recipe favorite status
 */
export const toggleFavoriteRecipe = createAsyncThunk(
  'recipe/toggleFavoriteRecipe',
  async ({ recipeId, isFavorite }: { recipeId: string; isFavorite: boolean }) => {
    try {
      if (isFavorite) {
        await recipeService.saveRecipe(recipeId);
      } else {
        await recipeService.unsaveRecipe(recipeId);
      }
      return { recipeId, isFavorite };
    } catch (error) {
      throw error instanceof Error ? error.message : 'Failed to update recipe favorite status';
    }
  }
);

// Create the recipe slice
const recipeSlice = createSlice({
  name: 'recipe',
  initialState,
  reducers: {
    clearSelectedRecipe: (state) => {
      state.selectedRecipe = null;
    },
    clearRecipeError: (state) => {
      state.error = null;
    },
    clearMatchedRecipes: (state) => {
      state.matchedRecipes = [];
    }
  },
  extraReducers: (builder) => {
    // Fetch recipes reducers
    builder
      .addCase(fetchRecipes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecipes.fulfilled, (state, action: PayloadAction<{ recipes: Recipe[]; total: number }>) => {
        state.loading = false;
        state.recipes = action.payload.recipes;
        state.totalRecipes = action.payload.total;
      })
      .addCase(fetchRecipes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch recipes';
      })

    // Fetch recipe by ID reducers
      .addCase(fetchRecipeById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecipeById.fulfilled, (state, action: PayloadAction<Recipe>) => {
        state.loading = false;
        state.selectedRecipe = action.payload;
      })
      .addCase(fetchRecipeById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch recipe details';
      })

    // Match recipes reducers
      .addCase(matchRecipesWithIngredients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(matchRecipesWithIngredients.fulfilled, (state, action: PayloadAction<Recipe[]>) => {
        state.loading = false;
        state.matchedRecipes = action.payload;
      })
      .addCase(matchRecipesWithIngredients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to match recipes';
      })

    // Toggle favorite recipe reducers
      .addCase(toggleFavoriteRecipe.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleFavoriteRecipe.fulfilled, (state, action: PayloadAction<{ recipeId: string; isFavorite: boolean }>) => {
        state.loading = false;
        if (action.payload.isFavorite) {
          state.favoriteRecipes.add(action.payload.recipeId);
        } else {
          state.favoriteRecipes.delete(action.payload.recipeId);
        }
      })
      .addCase(toggleFavoriteRecipe.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update recipe favorite status';
      });
  }
});

// Export actions
export const { clearSelectedRecipe, clearRecipeError, clearMatchedRecipes } = recipeSlice.actions;

// Export selector
export const selectRecipes = (state: { recipe: RecipeState }) => ({
  recipes: state.recipe.recipes,
  selectedRecipe: state.recipe.selectedRecipe,
  matchedRecipes: state.recipe.matchedRecipes,
  loading: state.recipe.loading,
  error: state.recipe.error,
  totalRecipes: state.recipe.totalRecipes,
  favoriteRecipes: state.recipe.favoriteRecipes
});

// Export reducer
export default recipeSlice.reducer;