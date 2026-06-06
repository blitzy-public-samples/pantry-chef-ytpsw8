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
// RecipeService is a plain (non-tsyringe) class whose constructor requires its
// collaborators, so the controller's dependency tree is composed manually here
// (mirroring how the controller was always intended to be constructed). Each
// collaborator is safe to instantiate at module load: SearchService defaults
// its Elasticsearch client, CacheService lazily creates its Redis client, and
// QueueService's connection is established separately at startup.
import { RecipeService } from '../../services/recipe.service';
import { SearchService } from '../../services/search.service';
import { CacheService } from '../../services/cache.service';
import { QueueService } from '../../services/queue.service';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { rateLimiterMiddleware, recipeMatchLimiter } from '../middlewares/rateLimiter.middleware';
import {
    validateCreateRecipe,
    validateUpdateRecipe,
    validateRecipeQuery
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
            recipeMatchLimiter,
            this.recipeController.findRecipesByIngredients.bind(this.recipeController)
        );

        // NOTE: the previously-scaffolded `POST /:id/rate` route was removed. It
        // bound to `RecipeController.rateRecipe` — a method that was never
        // implemented (there is no corresponding `RecipeService` rating method
        // either) — so `this.recipeController.rateRecipe.bind(...)` threw
        // `TypeError: Cannot read properties of undefined (reading 'bind')` at
        // module load. That throw prevented the recipe router, the route
        // aggregator (routes/index.ts), and therefore the entire application
        // from initializing — which in turn blocked the in-scope shopping e2e
        // suite that boots the app via initializeApp(). Recipe rating is out of
        // this change set's scope, so the dead-on-arrival route is removed
        // rather than stubbed (no placeholder is introduced).
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
const recipeController = new RecipeController(
    new RecipeService(new SearchService(), new CacheService(), new QueueService())
);
const recipeRouter = new RecipeRouter(recipeController).getRouter();
export { recipeRouter };