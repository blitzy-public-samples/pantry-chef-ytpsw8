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
  favoriteRecipes: string[];
}

// Initial state
const initialState: RecipeState = {
  recipes: [],
  selectedRecipe: null,
  matchedRecipes: [],
  loading: false,
  error: null,
  totalRecipes: 0,
  favoriteRecipes: [],
};

/**
 * Requirement: Recipe Discovery (8.1 User Interface Design/Screen Components)
 * Async thunk for fetching recipes with pagination and advanced filtering
 */
export const fetchRecipes = createAsyncThunk(
  'recipe/fetchRecipes',
  async ({ filter, page, limit }: { filter: RecipeFilter; page?: number; limit?: number }) => {
    try {
      const response = await recipeService.getRecipes(filter, page, limit);
      return response;
      // Mock data
      // return {
      //   recipes: [
      //     {
      //       id: "1",
      //       name: "Spaghetti Carbonara",
      //       description: "A classic Italian pasta dish with a creamy sauce and pancetta.",
      //       difficulty: RecipeDifficulty.MEDIUM,
      //       prepTime: 15,
      //       cookTime: 20,
      //       servings: 4,
      //       ingredients: [
      //         {
      //           id: "ing1",
      //           name: "Spaghetti",
      //           quantity: 200,
      //           unit: "g",
      //           notes: "",
      //           optional: false,
      //         },
      //         {
      //           id: "ing2",
      //           name: "Pancetta",
      //           quantity: 100,
      //           unit: "g",
      //           notes: "Or substitute with bacon",
      //           optional: false,
      //         },
      //         {
      //           id: "ing3",
      //           name: "Eggs",
      //           quantity: 2,
      //           unit: "large",
      //           notes: "Room temperature",
      //           optional: false,
      //         },
      //         {
      //           id: "ing4",
      //           name: "Parmesan Cheese",
      //           quantity: 50,
      //           unit: "g",
      //           notes: "Grated",
      //           optional: false,
      //         },
      //         {
      //           id: "ing5",
      //           name: "Black Pepper",
      //           quantity: 1,
      //           unit: "tsp",
      //           notes: "Freshly ground",
      //           optional: false,
      //         },
      //       ],
      //       steps: [
      //         {
      //           stepNumber: 1,
      //           instruction: "Boil the spaghetti in salted water until al dente.",
      //           duration: 10,
      //           imageUrl: "https://example.com/step1.jpg",
      //         },
      //         {
      //           stepNumber: 2,
      //           instruction: "Fry the pancetta until crispy.",
      //           duration: 5,
      //           imageUrl: "https://example.com/step2.jpg",
      //         },
      //         {
      //           stepNumber: 3,
      //           instruction: "Mix eggs and Parmesan cheese in a bowl.",
      //           duration: 5,
      //           imageUrl: "https://example.com/step3.jpg",
      //         },
      //         {
      //           stepNumber: 4,
      //           instruction: "Combine spaghetti, pancetta, and egg mixture off heat.",
      //           duration: 5,
      //           imageUrl: "https://example.com/step4.jpg",
      //         },
      //       ],
      //       imageUrl: "https://static01.nyt.com/images/2021/02/14/dining/carbonara-horizontal/carbonara-horizontal-googleFourByThree-v2.jpg",
      //       tags: ["Italian", "Pasta", "Main Dish"],
      //       nutritionInfo: {
      //         calories: 500,
      //         protein: 20,
      //         carbohydrates: 60,
      //         fat: 20,
      //         fiber: 2,
      //       },
      //       createdBy: "Chef Mario",
      //       createdAt: new Date("2024-01-01").toISOString(),
      //       updatedAt: new Date("2024-01-05").toISOString(),
      //     },
      //     {
      //       id: "2",
      //       name: "Chicken Caesar Salad",
      //       description: "A fresh and crispy salad with grilled chicken, romaine lettuce, and Caesar dressing.",
      //       difficulty: RecipeDifficulty.EASY,
      //       prepTime: 10,
      //       cookTime: 15,
      //       servings: 2,
      //       ingredients: [
      //         {
      //           id: "ing1",
      //           name: "Romaine Lettuce",
      //           quantity: 1,
      //           unit: "head",
      //           notes: "Chopped",
      //           optional: false,
      //         },
      //         {
      //           id: "ing2",
      //           name: "Chicken Breast",
      //           quantity: 200,
      //           unit: "g",
      //           notes: "Grilled and sliced",
      //           optional: false,
      //         },
      //         {
      //           id: "ing3",
      //           name: "Caesar Dressing",
      //           quantity: 3,
      //           unit: "tbsp",
      //           notes: "",
      //           optional: false,
      //         },
      //         {
      //           id: "ing4",
      //           name: "Croutons",
      //           quantity: 50,
      //           unit: "g",
      //           notes: "Store-bought or homemade",
      //           optional: true,
      //         },
      //         {
      //           id: "ing5",
      //           name: "Parmesan Cheese",
      //           quantity: 20,
      //           unit: "g",
      //           notes: "Grated",
      //           optional: false,
      //         },
      //       ],
      //       steps: [
      //         {
      //           stepNumber: 1,
      //           instruction: "Grill the chicken breast until cooked through, then slice.",
      //           duration: 15,
      //           imageUrl: "https://example.com/step1-salad.jpg",
      //         },
      //         {
      //           stepNumber: 2,
      //           instruction: "Chop romaine lettuce and add to a large bowl.",
      //           duration: 5,
      //           imageUrl: "https://example.com/step2-salad.jpg",
      //         },
      //         {
      //           stepNumber: 3,
      //           instruction: "Add Caesar dressing and toss to coat the lettuce.",
      //           duration: 2,
      //           imageUrl: "https://example.com/step3-salad.jpg",
      //         },
      //         {
      //           stepNumber: 4,
      //           instruction: "Top with sliced chicken, croutons, and Parmesan cheese.",
      //           duration: 2,
      //           imageUrl: "https://example.com/step4-salad.jpg",
      //         },
      //       ],
      //       imageUrl: "https://www.eatwell101.com/wp-content/uploads/2019/04/Blackened-Chicken-and-Avocado-Salad-recipe-1.jpg",
      //       tags: ["Salad", "Healthy", "Quick Meal"],
      //       nutritionInfo: {
      //         calories: 350,
      //         protein: 30,
      //         carbohydrates: 10,
      //         fat: 20,
      //         fiber: 3,
      //       },
      //       createdBy: "Chef Julia",
      //       createdAt: new Date("2024-02-15").toISOString(),
      //       updatedAt: new Date("2024-02-20").toISOString(),
      //     },
      //     // Additional mock recipes can be added here, up to a total of 10
      //   ],
      //   total: 2, // Adjust this to reflect the actual number of recipes in the array
      // };
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
        const index = state.favoriteRecipes.findIndex((i) => i == action.payload.recipeId);
        if (index == -1) {
          state.favoriteRecipes.push(action.payload.recipeId);
        } else {
          state.favoriteRecipes.splice(index, 1);
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