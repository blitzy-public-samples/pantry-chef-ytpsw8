// @version socket.io ^4.5.0

/**
 * HUMAN TASKS:
 * 1. Configure WebSocket event monitoring in CloudWatch
 * 2. Set up alerts for WebSocket response times > 200ms
 * 3. Configure WebSocket connection limits per user
 * 4. Set up WebSocket room cleanup intervals
 */

import { Socket } from 'socket.io';
import { Recipe } from '../../interfaces/recipe.interface';
import { RecipeService } from '../../services/recipe.service';
import { logger } from '../../utils/logger';

/**
 * WebSocket handler class for managing real-time recipe operations
 * Addresses requirements:
 * - Real-time WebSocket Connections (1.1 System Overview)
 * - Recipe Matching (1.2 Scope/Core Capabilities)
 * - Recipe Service (5.1 High-Level Architecture Overview)
 * - Performance Optimization (APPENDICES/C. SYSTEM METRICS)
 */
export class RecipeHandler {
    constructor(private readonly recipeService: RecipeService) {
        if (!recipeService) {
            throw new Error('RecipeService is required for RecipeHandler');
        }
    }

    /**
     * Handles real-time recipe matching based on available ingredients
     * Requirement: Recipe Matching - Smart recipe matching based on available ingredients
     * Requirement: Performance Optimization - API response time < 200ms
     */
    public async handleRecipeMatch(socket: Socket, ingredientIds: string[]): Promise<void> {
        const startTime = Date.now();
        const correlationId = socket.id;

        try {
            logger.info('Recipe match request received', {
                correlationId,
                ingredientCount: ingredientIds.length,
                socketId: socket.id
            });

            // Validate ingredient IDs array
            if (!Array.isArray(ingredientIds) || ingredientIds.length === 0) {
                throw new Error('Invalid ingredient IDs provided');
            }

            // Find matching recipes with caching
            const matchingRecipes = await this.recipeService.findRecipesByIngredients(ingredientIds);

            // Calculate response time
            const responseTime = Date.now() - startTime;

            // Log performance metrics
            logger.info('Recipe matches found', {
                correlationId,
                matchCount: matchingRecipes.length,
                responseTime,
                socketId: socket.id
            });

            // Emit matches to client with performance tracking
            socket.emit('recipe:matches', {
                success: true,
                data: matchingRecipes,
                responseTime
            });

            // Log if response time exceeds threshold
            if (responseTime > 200) {
                logger.warn('Recipe match response time exceeded threshold', {
                    correlationId,
                    responseTime,
                    socketId: socket.id
                });
            }
        } catch (error) {
            logger.error('Recipe match error', {
                correlationId,
                error: (error as Error).message,
                stackTrace: (error as Error).stack,
                socketId: socket.id
            });

            socket.emit('recipe:error', {
                success: false,
                error: 'Failed to find matching recipes',
                code: 'RECIPE_MATCH_ERROR'
            });
        }
    }

    /**
     * Handles real-time recipe recommendations with search optimization
     * Requirement: Recipe Service - Recipe recommendations with sub-200ms response time
     */
    public async handleRecommendations(socket: Socket, options: {
        query?: string;
        filters?: {
            cuisine?: string[];
            difficulty?: string[];
            maxPrepTime?: number;
        };
    }): Promise<void> {
        const startTime = Date.now();
        const correlationId = socket.id;

        try {
            logger.info('Recipe recommendations request received', {
                correlationId,
                options,
                socketId: socket.id
            });

            // Search recipes with optimization
            const searchResults = await this.recipeService.searchRecipes(
                options.query || '',
                options.filters || {}
            );

            const responseTime = Date.now() - startTime;

            // Log performance metrics
            logger.info('Recipe recommendations found', {
                correlationId,
                resultCount: searchResults.total,
                responseTime,
                socketId: socket.id
            });

            // Emit recommendations to client
            socket.emit('recipe:recommendations', {
                success: true,
                data: searchResults.hits,
                total: searchResults.total,
                responseTime
            });

            // Monitor performance threshold
            if (responseTime > 200) {
                logger.warn('Recipe recommendations response time exceeded threshold', {
                    correlationId,
                    responseTime,
                    socketId: socket.id
                });
            }
        } catch (error) {
            logger.error('Recipe recommendations error', {
                correlationId,
                error: (error as Error).message,
                stackTrace: (error as Error).stack,
                socketId: socket.id
            });

            socket.emit('recipe:error', {
                success: false,
                error: 'Failed to get recipe recommendations',
                code: 'RECIPE_RECOMMENDATIONS_ERROR'
            });
        }
    }

    /**
     * Handles real-time recipe updates and broadcasts to relevant clients
     * Requirement: Real-time WebSocket Connections - Live updates
     */
    public async handleRecipeUpdate(
        socket: Socket,
        recipeId: string,
        updateData: Partial<Recipe>
    ): Promise<void> {
        const startTime = Date.now();
        const correlationId = socket.id;

        try {
            logger.info('Recipe update request received', {
                correlationId,
                recipeId,
                socketId: socket.id
            });

            // Validate recipe ID and update data
            if (!recipeId || Object.keys(updateData).length === 0) {
                throw new Error('Invalid recipe update data');
            }

            // Update recipe with cache invalidation
            const updatedRecipe = await this.recipeService.updateRecipe(recipeId, updateData);

            const responseTime = Date.now() - startTime;

            // Log performance metrics
            logger.info('Recipe updated successfully', {
                correlationId,
                recipeId,
                responseTime,
                socketId: socket.id
            });

            // Broadcast update to all clients in recipe room
            socket.to(`recipe:${recipeId}`).emit('recipe:updated', {
                success: true,
                data: updatedRecipe,
                responseTime
            });

            // Emit confirmation to sender
            socket.emit('recipe:updateConfirmed', {
                success: true,
                data: updatedRecipe,
                responseTime
            });

            // Monitor performance threshold
            if (responseTime > 200) {
                logger.warn('Recipe update response time exceeded threshold', {
                    correlationId,
                    responseTime,
                    socketId: socket.id
                });
            }
        } catch (error) {
            logger.error('Recipe update error', {
                correlationId,
                recipeId,
                error: (error as Error).message,
                stackTrace: (error as Error).stack,
                socketId: socket.id
            });

            socket.emit('recipe:error', {
                success: false,
                error: 'Failed to update recipe',
                code: 'RECIPE_UPDATE_ERROR'
            });
        }
    }
}