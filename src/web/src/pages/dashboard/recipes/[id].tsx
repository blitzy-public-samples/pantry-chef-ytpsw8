/**
 * HUMAN TASKS:
 * 1. Configure recipe image CDN URLs in environment variables
 * 2. Set up error tracking for recipe operations
 * 3. Verify nutritional information display units with content team
 * 4. Configure recipe sharing functionality with social media APIs
 */

// External dependencies
import React, { useEffect, useState, useCallback } from 'react'; // ^18.0.0
import classnames from 'classnames'; // ^2.3.0
import { Recipe, RecipeIngredient, RecipeStep } from '../../../interfaces/recipe.interface';
import useRecipes from '../../../hooks/useRecipes';
import Button from '../../../components/common/Button';
import { useRouter } from 'next/router';

// Internal dependencies
// import { Recipe, RecipeIngredient, RecipeStep, NutritionInfo } from '../../interfaces/recipe.interface';
// import { Button } from '../common/Button';
// import { useRecipes } from '../../hooks/useRecipes';

// Component props interface from JSON specification
interface RecipeDetailProps {
    recipeId: string;
    onClose: () => void;
}

/**
 * Formats cooking and preparation time into human-readable format
 * @param minutes - Time in minutes
 * @returns Formatted time string
 */
const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
        return `${hours}h ${remainingMinutes > 0 ? `${remainingMinutes}m` : ''}`;
    }
    return `${remainingMinutes}m`;
};

/**
 * RecipeDetail component displays comprehensive recipe information
 * Implements requirements:
 * - Recipe Management (1.2 Scope/Core Capabilities)
 * - Recipe Discovery (8.1 User Interface Design/Screen Components)
 * - Basic Nutritional Information (1.2 Scope/System Boundaries)
 */
export const RecipeDetail: React.FC<RecipeDetailProps> = () => {
    // Hooks
    const { recipes, loading, error, fetchRecipeDetails } = useRecipes();
    const [currentServings, setCurrentServings] = useState<number>(0);
    const [activeStep, setActiveStep] = useState<number>(0);
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const router = useRouter();
    const recipeId = router.query.id as string;

    // Fetch recipe data on component mount
    // useEffect(() => {
    //     fetchRecipeDetails(recipeId);
    // }, [recipeId, fetchRecipeDetails]);

    // Update recipe and default servings when data is loaded
    useEffect(() => {
        const currentRecipe = recipes.find(r => r.id === recipeId);
        if (currentRecipe) {
            setRecipe(currentRecipe);
            setCurrentServings(currentRecipe.servings);
        }
    }, [recipes, recipeId]);

    const onClose = () => {
        router.back();
    }

    /**
     * Updates ingredient quantities based on serving size changes
     * @param newServings - New number of servings
     */
    const handleServingChange = useCallback((newServings: number) => {
        if (!recipe || newServings < 1) return;

        const ratio = newServings / recipe.servings;
        setCurrentServings(newServings);
    }, [recipe]);

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
            </div>
        );
    }

    // Error state
    if (error || !recipe) {
        return (
            <div className="p-4 bg-red-50 text-red-700 rounded-md">
                <h3 className="font-semibold mb-2">Error Loading Recipe</h3>
                <p>{error || 'Recipe not found'}</p>
                <Button
                    variant="secondary"
                    size="small"
                    onClick={onClose}
                    className="mt-4"
                >
                    Close
                </Button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
            {/* Recipe Header */}
            <div className="relative h-64 rounded-t-lg overflow-hidden">
                <img
                    src={recipe.imageUrl}
                    alt={recipe.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6 text-white">
                    <h1 className="text-3xl font-bold mb-2">{recipe.name}</h1>
                    <div className="flex items-center gap-4 text-sm">
                        <span>Difficulty: {recipe.difficulty}</span>
                        <span>Prep: {formatTime(recipe.prepTime)}</span>
                        <span>Cook: {formatTime(recipe.cookTime)}</span>
                    </div>
                </div>
                <Button
                    variant="text"
                    size="small"
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white"
                >
                    ✕
                </Button>
            </div>

            <div className="p-6">
                {/* Description */}
                <p className="text-gray-600 mb-6">{recipe.description}</p>

                {/* Ingredients Section */}
                <section className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Ingredients</h2>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="small"
                                onClick={() => handleServingChange(currentServings - 1)}
                                disabled={currentServings <= 1}
                            >
                                -
                            </Button>
                            <span className="px-4">{currentServings} servings</span>
                            <Button
                                variant="outline"
                                size="small"
                                onClick={() => handleServingChange(currentServings + 1)}
                            >
                                +
                            </Button>
                        </div>
                    </div>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {recipe.ingredients.map((ingredient: RecipeIngredient) => (
                            <li
                                key={ingredient.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                            >
                                <span className="font-medium">{ingredient.name}</span>
                                <span className="text-gray-600">
                                    {(ingredient.quantity * (currentServings / recipe.servings)).toFixed(1)} {ingredient.unit}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Cooking Steps Section */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Instructions</h2>
                    <div className="space-y-6">
                        {recipe.steps.map((step: RecipeStep, index: number) => (
                            <div
                                key={step.stepNumber}
                                className={classnames(
                                    'p-4 rounded-lg border-2 transition-colors',
                                    activeStep === index
                                        ? 'border-primary-600 bg-primary-50'
                                        : 'border-gray-200'
                                )}
                            >
                                <div className="flex items-start gap-4">
                                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center">
                                        {step.stepNumber}
                                    </span>
                                    <div className="flex-grow">
                                        <p className="text-gray-800">{step.instruction}</p>
                                        {step.duration > 0 && (
                                            <span className="text-sm text-gray-500 mt-2 block">
                                                ⏱️ {formatTime(step.duration)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {step.imageUrl && (
                                    <img
                                        src={step.imageUrl}
                                        alt={`Step ${step.stepNumber}`}
                                        className="mt-4 rounded-md w-full h-48 object-cover"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Nutritional Information Section */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Nutrition Facts</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {Object.entries(recipe.nutritionInfo).map(([key, value]) => (
                            <div
                                key={key}
                                className="bg-gray-50 p-4 rounded-lg text-center"
                            >
                                <span className="block text-lg font-semibold">
                                    {value}
                                    {key === 'calories' ? 'kcal' : 'g'}
                                </span>
                                <span className="text-sm text-gray-600 capitalize">
                                    {key}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Tags Section */}
                {recipe.tags.length > 0 && (
                    <section>
                        <h2 className="text-xl font-semibold mb-4">Tags</h2>
                        <div className="flex flex-wrap gap-2">
                            {recipe.tags.map((tag: string) => (
                                <span
                                    key={tag}
                                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default RecipeDetail;