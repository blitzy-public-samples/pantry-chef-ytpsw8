// @version mongoose ^6.5.0

/**
 * HUMAN TASKS:
 * 1. Configure performance monitoring for recipe matching operations
 * 2. Set up alerts for recipe service response times > 200ms
 * 3. Configure Elasticsearch index settings for recipe search
 * 4. Set up Redis cache eviction policies for recipe data
 * 5. Configure RabbitMQ queues for recipe processing
 */

import { RecipeModel } from '../models/recipe.model';
import { Recipe } from '../interfaces/recipe.interface';
import { SearchService, SearchResult, SearchFilters } from './search.service';
import { CacheService } from './cache.service';
import { QueueService } from './queue.service';
import { QUEUE_CONSTANTS } from '../utils/constants';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Matches a 24-character hexadecimal MongoDB ObjectId string.
 *
 * The recipe ingredient sub-schema persists `ingredientId` as a BSON ObjectId, so any
 * value forwarded to a `$in` match query MUST be a valid ObjectId. Forwarding an
 * arbitrary string (for example an injection-style payload such as `' OR 1=1 --`)
 * triggers a Mongoose CastError that surfaces as an opaque HTTP 500. Sanitising the
 * caller-supplied identifiers against this pattern keeps the recipe-match path safe and
 * deterministic regardless of the input received from the public query string.
 */
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

// Requirement: Recipe Service - Core recipe management service with sub-200ms response times
export class RecipeService {
    constructor(
        private readonly searchService: SearchService,
        private readonly cacheService: CacheService,
        private readonly queueService: QueueService
    ) {}

    /**
     * Creates a new recipe with validation and indexing
     * Requirement: Recipe Management - Smart recipe matching based on available ingredients
     */
    public async createRecipe(recipeData: Recipe): Promise<Recipe> {
        try {
            const startTime = Date.now();

            // Create recipe in MongoDB
            const recipe = await RecipeModel.create(recipeData);

            // Queue recipe indexing for Elasticsearch
            await QueueService.publishToQueue('recipe.index', {
                action: 'CREATE',
                recipeId: recipe.id,
                recipe: recipe.toJSON()
            });

            // Cache the new recipe
            await this.cacheService.setRecipe(recipe.id, recipe);

            // Log performance metrics
            const duration = Date.now() - startTime;
            logger.info('Recipe created successfully', {
                recipeId: recipe.id,
                duration,
                timestamp: new Date().toISOString()
            });

            return recipe;
        } catch (error) {
            logger.error('Failed to create recipe', {
                error: (error as Error).message,
                recipe: recipeData
            });
            throw new AppError(
                'Failed to create recipe',
                500,
                'RECIPE_CREATE_ERROR',
                { error: (error as Error).message }
            );
        }
    }

    /**
     * Retrieves a recipe by ID with caching
     * Requirement: Performance Optimization - API response time < 200ms requirement
     */
    public async getRecipeById(recipeId: string): Promise<Recipe | null> {
        try {
            const startTime = Date.now();

            // Check cache first
            const cachedRecipe = await this.cacheService.getRecipe(recipeId);
            if (cachedRecipe) {
                logger.info('Recipe retrieved from cache', {
                    recipeId,
                    duration: Date.now() - startTime
                });
                return cachedRecipe;
            }

            // Fetch from database if not in cache
            const recipe = await RecipeModel.findById(recipeId);
            if (!recipe) {
                return null;
            }

            // Cache the recipe for future requests
            await this.cacheService.setRecipe(recipeId, recipe);

            // Log performance metrics
            const duration = Date.now() - startTime;
            logger.info('Recipe retrieved from database', {
                recipeId,
                duration,
                timestamp: new Date().toISOString()
            });

            return recipe;
        } catch (error) {
            logger.error('Failed to get recipe', {
                recipeId,
                error: (error as Error).message
            });
            throw new AppError(
                'Failed to get recipe',
                500,
                'RECIPE_GET_ERROR',
                { recipeId, error: (error as Error).message }
            );
        }
    }

    /**
     * Updates an existing recipe with cache invalidation
     * Requirement: Recipe Management - Recipe data management
     */
    public async updateRecipe(recipeId: string, updateData: Partial<Recipe>): Promise<Recipe> {
        try {
            const startTime = Date.now();

            // Update recipe in MongoDB
            const updatedRecipe = await RecipeModel.findByIdAndUpdate(
                recipeId,
                updateData,
                { new: true, runValidators: true }
            );

            if (!updatedRecipe) {
                throw new AppError('Recipe not found', 404, 'RECIPE_NOT_FOUND', { recipeId });
            }

            // Queue recipe update for Elasticsearch
            await QueueService.publishToQueue('recipe.index', {
                action: 'UPDATE',
                recipeId,
                recipe: updatedRecipe.toJSON()
            });

            // Update cache
            await this.cacheService.setRecipe(recipeId, updatedRecipe);

            // Log performance metrics
            const duration = Date.now() - startTime;
            logger.info('Recipe updated successfully', {
                recipeId,
                duration,
                timestamp: new Date().toISOString()
            });

            return updatedRecipe;
        } catch (error) {
            logger.error('Failed to update recipe', {
                recipeId,
                error: (error as Error).message,
                updateData
            });
            throw new AppError(
                'Failed to update recipe',
                500,
                'RECIPE_UPDATE_ERROR',
                { recipeId, error: (error as Error).message }
            );
        }
    }

    /**
     * Deletes a recipe with cleanup
     * Requirement: Recipe Management - Recipe data management
     */
    public async deleteRecipe(recipeId: string): Promise<void> {
        try {
            const startTime = Date.now();

            // Delete from MongoDB
            const deletedRecipe = await RecipeModel.findByIdAndDelete(recipeId);
            if (!deletedRecipe) {
                throw new AppError('Recipe not found', 404, 'RECIPE_NOT_FOUND', { recipeId });
            }

            // Queue recipe deletion from Elasticsearch
            await QueueService.publishToQueue('recipe.index', {
                action: 'DELETE',
                recipeId
            });

            // Remove from cache
            await this.cacheService.delete(`recipe:${recipeId}`);

            // Log performance metrics
            const duration = Date.now() - startTime;
            logger.info('Recipe deleted successfully', {
                recipeId,
                duration,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to delete recipe', {
                recipeId,
                error: (error as Error).message
            });
            throw new AppError(
                'Failed to delete recipe',
                500,
                'RECIPE_DELETE_ERROR',
                { recipeId, error: (error as Error).message }
            );
        }
    }

    /**
     * Finds recipes matching available ingredients
     * Requirement: Recipe Discovery - Smart recipe matching based on available ingredients
     */
    public async findRecipesByIngredients(ingredientIds: string[]): Promise<Recipe[]> {
        try {
            const startTime = Date.now();

            // Sanitize caller-supplied identifiers before they reach the persistence layer.
            // `ingredientId` is stored as a BSON ObjectId, so forwarding a non-ObjectId
            // string (e.g. an injection-style query such as `' OR 1=1 --`) to the `$in`
            // match query raises a Mongoose CastError that would otherwise surface as an
            // opaque HTTP 500. Filtering to well-formed ObjectId strings keeps the match
            // path safe and predictable for arbitrary public input.
            const sanitizedIngredientIds = ingredientIds.filter(
                (id): id is string => typeof id === 'string' && OBJECT_ID_PATTERN.test(id.trim())
            ).map((id) => id.trim());

            // When no valid ingredient identifiers remain there is nothing to match against;
            // return an empty result set rather than executing a query that cannot match.
            if (sanitizedIngredientIds.length === 0) {
                logger.info('Recipe matching skipped — no valid ingredient identifiers provided', {
                    providedCount: ingredientIds.length,
                    duration: Date.now() - startTime
                });
                return [];
            }

            // Check cache for ingredient-based matches (keyed on the sanitized identifiers)
            const cacheKey = `ingredients:${[...sanitizedIngredientIds].sort().join(',')}`;
            const cachedResults = await this.cacheService.get<Recipe[]>(cacheKey);
            
            if (cachedResults) {
                logger.info('Recipe matches retrieved from cache', {
                    ingredientCount: sanitizedIngredientIds.length,
                    duration: Date.now() - startTime
                });
                return cachedResults;
            }

            // Queue ingredient matching job for analytics. This is a best-effort, non-blocking
            // side effect: the analytics queue is consumed by the dedicated recipe-matching
            // worker process, which is the only process that initializes the RabbitMQ channel.
            // The API process does not initialize the queue channel, so a publish attempt here
            // would otherwise throw ("Queue channel not initialized") and fail an otherwise
            // successful match. A queue/transport failure must never break recipe matching, so
            // any error is logged and swallowed. The canonical queue name from QUEUE_CONSTANTS
            // is used so the producer aligns with the recipe-matching worker's consumer.
            try {
                await QueueService.publishToQueue(QUEUE_CONSTANTS.RECIPE_MATCHING_QUEUE, {
                    ingredientIds: sanitizedIngredientIds,
                    timestamp: new Date().toISOString()
                });
            } catch (queueError) {
                logger.warn('Recipe matching analytics publish skipped (queue unavailable)', {
                    ingredientCount: sanitizedIngredientIds.length,
                    error: (queueError as Error).message
                });
            }

            // Find matching recipes using MongoDB aggregation
            const matchingRecipes = await RecipeModel.findByIngredients(sanitizedIngredientIds);

            // Cache results for future requests
            await this.cacheService.set(cacheKey, matchingRecipes, 3600); // 1 hour TTL

            // Log performance metrics
            const duration = Date.now() - startTime;
            logger.info('Recipe matches found', {
                ingredientCount: sanitizedIngredientIds.length,
                matchCount: matchingRecipes.length,
                duration,
                timestamp: new Date().toISOString()
            });

            return matchingRecipes;
        } catch (error) {
            logger.error('Failed to find matching recipes', {
                ingredientIds,
                error: (error as Error).message
            });
            throw new AppError(
                'Failed to find matching recipes',
                500,
                'RECIPE_MATCH_ERROR',
                { ingredientIds, error: (error as Error).message }
            );
        }
    }

    /**
     * Searches recipes by query and filters with sub-200ms response time
     * Requirement: Recipe Discovery - Recipe and ingredient search functionality
     */
    public async searchRecipes(
        query: string,
        filters: SearchFilters
    ): Promise<SearchResult<Recipe>> {
        try {
            const startTime = Date.now();

            // Generate cache key based on search parameters
            const cacheKey = `search:${query}:${JSON.stringify(filters)}`;
            const cachedResults = await this.cacheService.get<SearchResult<Recipe>>(cacheKey);

            if (cachedResults) {
                logger.info('Search results retrieved from cache', {
                    query,
                    duration: Date.now() - startTime
                });
                return cachedResults;
            }

            // Perform search using Elasticsearch
            const searchResults = await this.searchService.searchRecipes(
                query,
                [],  // ingredients filter
                [],  // tags filter
                filters
            );

            // Cache search results
            await this.cacheService.set(cacheKey, searchResults, 1800); // 30 minutes TTL

            // Queue search analytics
            await QueueService.publishToQueue('recipe.search', {
                query,
                filters,
                resultCount: searchResults.total,
                timestamp: new Date().toISOString()
            });

            // Log performance metrics
            const duration = Date.now() - startTime;
            logger.info('Recipe search completed', {
                query,
                resultCount: searchResults.total,
                duration,
                timestamp: new Date().toISOString()
            });

            return searchResults;
        } catch (error) {
            logger.error('Failed to search recipes', {
                query,
                filters,
                error: (error as Error).message
            });
            throw new AppError(
                'Failed to search recipes',
                500,
                'RECIPE_SEARCH_ERROR',
                { query, filters, error: (error as Error).message }
            );
        }
    }
}