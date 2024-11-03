// @version express ^4.18.0

/**
 * HUMAN TASKS:
 * 1. Configure rate limiting thresholds for recipe endpoints in production
 * 2. Set up monitoring alerts for high error rates in recipe operations
 * 3. Configure caching policies for recipe search results
 * 4. Set up performance monitoring dashboards for recipe endpoints
 * 5. Configure role-based access control matrix for recipe operations
 */

import { Router } from 'express';
import { RecipeController } from '../controllers/recipe.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { rateLimiterMiddleware } from '../middlewares/rateLimiter.middleware';
import {
    validateCreateRecipe,
    validateUpdateRecipe,
    validateRecipeQuery,
    validateRecipeRating
} from '../validators/recipe.validator';

/**
 * Express router configuration for recipe-related endpoints
 * Implements requirements:
 * - Recipe Management (1.2 Scope/Core Capabilities)
 * - Recipe Discovery (6.1.1 Core System Components/Search Cluster)
 * - Recipe Sharing (1.2 Scope/Core Capabilities)
 * - Security Architecture (5.6 Security Architecture/Application)
 */
export class RecipeRouter {
    private router: Router;
    private recipeController: RecipeController;

    constructor(recipeController: RecipeController) {
        this.router = Router();
        this.recipeController = recipeController;
        this.configureRoutes();
    }

    /**
     * Configures all recipe-related routes with appropriate middleware chains
     * Implements comprehensive security measures including authentication,
     * authorization, rate limiting, and input validation
     */
    private configureRoutes(): void {
        // Create new recipe (protected, requires user/admin role)
        this.router.post(
            '/',
            authenticate,
            authorize(['user', 'admin']),
            validateCreateRecipe(),
            rateLimiterMiddleware({
                points: 10,
                duration: 3600,
                keyPrefix: 'recipe:create'
            }),
            this.recipeController.createRecipe.bind(this.recipeController)
        );

        // Get recipe by ID (public, rate limited)
        this.router.get(
            '/:id',
            rateLimiterMiddleware({
                points: 100,
                duration: 3600,
                keyPrefix: 'recipe:get'
            }),
            this.recipeController.getRecipe.bind(this.recipeController)
        );

        // Update recipe (protected, requires user/admin role)
        this.router.put(
            '/:id',
            authenticate,
            authorize(['user', 'admin']),
            validateUpdateRecipe(),
            rateLimiterMiddleware({
                points: 20,
                duration: 3600,
                keyPrefix: 'recipe:update'
            }),
            this.recipeController.updateRecipe.bind(this.recipeController)
        );

        // Delete recipe (protected, requires user/admin role)
        this.router.delete(
            '/:id',
            authenticate,
            authorize(['user', 'admin']),
            rateLimiterMiddleware({
                points: 10,
                duration: 3600,
                keyPrefix: 'recipe:delete'
            }),
            this.recipeController.deleteRecipe.bind(this.recipeController)
        );

        // Search recipes (public, rate limited)
        this.router.get(
            '/search',
            validateRecipeQuery(),
            rateLimiterMiddleware({
                points: 50,
                duration: 3600,
                keyPrefix: 'recipe:search'
            }),
            this.recipeController.searchRecipes.bind(this.recipeController)
        );

        // Find recipes by ingredients (protected, rate limited)
        this.router.post(
            '/match',
            authenticate,
            rateLimiterMiddleware({
                points: 30,
                duration: 3600,
                keyPrefix: 'recipe:match'
            }),
            this.recipeController.findRecipesByIngredients.bind(this.recipeController)
        );

        // Rate recipe (protected, requires user role)
        this.router.post(
            '/:id/rate',
            authenticate,
            authorize(['user']),
            validateRecipeRating(),
            rateLimiterMiddleware({
                points: 10,
                duration: 3600,
                keyPrefix: 'recipe:rate'
            }),
            this.recipeController.rateRecipe.bind(this.recipeController)
        );
    }

    /**
     * Returns the configured Express router instance
     * @returns {Router} Express router with configured recipe endpoints
     */
    public getRouter(): Router {
        return this.router;
    }
}

// Export configured router instance
const recipeController = new RecipeController();
const recipeRouter = new RecipeRouter(recipeController).getRouter();
export { recipeRouter };