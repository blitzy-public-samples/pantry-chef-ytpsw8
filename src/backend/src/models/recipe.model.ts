// @version mongoose ^6.5.0

/**
 * HUMAN TASKS:
 * 1. Configure MongoDB indexes for optimal query performance
 * 2. Set up monitoring for recipe matching performance
 * 3. Review and adjust ingredient matching thresholds
 * 4. Configure backup strategy for recipe data
 * 5. Set up alerts for high-volume recipe operations
 */

import mongoose from 'mongoose';
import { Recipe, RecipeIngredient, CookingStep, RecipeDifficulty, RecipeNutritionalInfo, RecipeRating } from '../interfaces/recipe.interface';
import { validateRecipe } from '../utils/validators';

// Requirement: Recipe Management - Smart recipe matching based on available ingredients
const recipeIngredientSchema = new mongoose.Schema<RecipeIngredient>({
    ingredientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ingredient',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    unit: {
        type: String,
        required: true
    },
    notes: String
});

// Requirement: Recipe Management - Comprehensive recipe instructions
const cookingStepSchema = new mongoose.Schema<CookingStep>({
    stepNumber: {
        type: Number,
        required: true,
        min: 1
    },
    instruction: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
        min: 0
    },
    imageUrl: String
});

// Requirement: Basic Nutritional Information - Nutritional tracking per recipe
const nutritionalInfoSchema = new mongoose.Schema<RecipeNutritionalInfo>({
    servingSize: {
        type: String,
        required: true
    },
    calories: {
        type: Number,
        required: true,
        min: 0
    },
    protein: {
        type: Number,
        required: true,
        min: 0
    },
    carbohydrates: {
        type: Number,
        required: true,
        min: 0
    },
    fat: {
        type: Number,
        required: true,
        min: 0
    }
});

// Requirement: Recipe Sharing - Social recipe sharing and community features
const recipeRatingSchema = new mongoose.Schema<RecipeRating>({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Requirement: Recipe Service - Core recipe data structure
const recipeSchema = new mongoose.Schema<Recipe>({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    description: {
        type: String,
        required: true
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ingredients: [recipeIngredientSchema],
    instructions: [cookingStepSchema],
    prepTime: {
        type: Number,
        required: true,
        min: 0
    },
    cookTime: {
        type: Number,
        required: true,
        min: 0
    },
    servings: {
        type: Number,
        required: true,
        min: 1
    },
    difficulty: {
        type: String,
        enum: Object.values(RecipeDifficulty),
        required: true
    },
    cuisine: {
        type: String,
        index: true
    },
    tags: [{
        type: String,
        index: true
    }],
    imageUrl: String,
    nutritionalInfo: nutritionalInfoSchema,
    ratings: [recipeRatingSchema],
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Requirement: Recipe Management - Data validation and sanitization
recipeSchema.pre('save', async function(next) {
    // Validate complete recipe data
    const validationResult = validateRecipe(this);
    if (!validationResult.isValid) {
        throw new Error(`Recipe validation failed: ${validationResult.errors.join(', ')}`);
    }

    // Calculate average rating
    if (this.ratings && this.ratings.length > 0) {
        const totalRating = this.ratings.reduce((sum, rating) => sum + rating.rating, 0);
        this.averageRating = Number((totalRating / this.ratings.length).toFixed(1));
    }

    // Update timestamps
    this.updatedAt = new Date();

    // Normalize ingredient units
    this.ingredients.forEach(ingredient => {
        ingredient.unit = ingredient.unit.toLowerCase().trim();
    });

    next();
});

// Requirement: Recipe Management - Smart recipe matching based on available ingredients
recipeSchema.statics.findByIngredients = async function(
    ingredientIds: string[]
): Promise<Recipe[]> {
    const MINIMUM_MATCH_THRESHOLD = 0.5; // 50% ingredient match required

    // Find recipes containing any of the given ingredients
    const recipes = await this.find({
        'ingredients.ingredientId': { $in: ingredientIds }
    }).populate('ingredients.ingredientId');

    // Calculate match percentage for each recipe
    const recipesWithScore = recipes.map(recipe => {
        const matchedIngredients = recipe.ingredients.filter(
            ingredient => ingredientIds.includes(ingredient.ingredientId.toString())
        );
        const matchPercentage = matchedIngredients.length / recipe.ingredients.length;
        return { recipe, matchPercentage };
    });

    // Filter recipes meeting minimum threshold and sort by match percentage
    return recipesWithScore
        .filter(({ matchPercentage }) => matchPercentage >= MINIMUM_MATCH_THRESHOLD)
        .sort((a, b) => b.matchPercentage - a.matchPercentage)
        .map(({ recipe }) => recipe);
};

// Create compound indexes for efficient querying
recipeSchema.index({ cuisine: 1, averageRating: -1 });
recipeSchema.index({ tags: 1, averageRating: -1 });
recipeSchema.index({ 'ingredients.ingredientId': 1 });
recipeSchema.index({ authorId: 1, createdAt: -1 });

// Create text index for search functionality
recipeSchema.index({
    name: 'text',
    description: 'text',
    cuisine: 'text',
    tags: 'text'
});

// Export the Recipe model
export const RecipeModel = mongoose.model<Recipe, mongoose.Model<Recipe> & {
    findByIngredients(ingredientIds: string[]): Promise<Recipe[]>;
}>('Recipe', recipeSchema);