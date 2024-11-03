/**
 * HUMAN TASKS:
 * 1. Configure CloudWatch alarms for recipe matching latency > 200ms
 * 2. Set up dead letter queue monitoring for failed recipe matches
 * 3. Configure RabbitMQ prefetch settings for optimal throughput
 * 4. Set up Elasticsearch index optimization for recipe matching
 * 5. Configure Redis cache TTL for matched recipes
 */

import { RecipeService } from '../services/recipe.service';
import { QueueService } from '../services/queue.service';
import { QUEUE_CONSTANTS } from '../utils/constants';
import { logger } from '../utils/logger';

/**
 * Worker class that processes recipe matching requests from the message queue
 * Requirement: Recipe Matching - Smart recipe matching based on available ingredients
 */
export class RecipeMatchingWorker {
    private readonly recipeService: RecipeService;
    private readonly queueService: QueueService;

    /**
     * Initializes the recipe matching worker with required services
     * Requirement: Asynchronous Processing - RabbitMQ message queue for asynchronous processing
     */
    constructor(recipeService: RecipeService, queueService: QueueService) {
        this.recipeService = recipeService;
        this.queueService = queueService;

        // Validate service dependencies
        if (!recipeService || !queueService) {
            throw new Error('Required services not provided to RecipeMatchingWorker');
        }
    }

    /**
     * Starts the worker process to consume recipe matching messages
     * Requirement: Performance Optimization - API response time < 200ms requirement
     */
    public async start(): Promise<void> {
        try {
            // Initialize queue connection
            await QueueService.initializeQueue();

            logger.info('Recipe matching worker starting', {
                queue: QUEUE_CONSTANTS.RECIPE_MATCHING_QUEUE,
                timestamp: new Date().toISOString()
            });

            // Set up consumer for recipe matching queue
            await QueueService.consumeFromQueue(
                QUEUE_CONSTANTS.RECIPE_MATCHING_QUEUE,
                async (message) => {
                    await this.processMessage(message);
                }
            );

            logger.info('Recipe matching worker started successfully', {
                queue: QUEUE_CONSTANTS.RECIPE_MATCHING_QUEUE,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to start recipe matching worker', {
                error: (error as Error).message,
                queue: QUEUE_CONSTANTS.RECIPE_MATCHING_QUEUE
            });
            throw error;
        }
    }

    /**
     * Processes individual recipe matching requests with performance optimization
     * Requirement: Recipe Service Integration - Background task processing for recipe matching
     */
    private async processMessage(message: any): Promise<void> {
        const startTime = Date.now();
        const correlationId = `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        try {
            // Validate message structure
            if (!message || !Array.isArray(message.ingredientIds)) {
                throw new Error('Invalid message format for recipe matching');
            }

            const { ingredientIds } = message;

            logger.info('Processing recipe matching request', {
                correlationId,
                ingredientCount: ingredientIds.length,
                timestamp: new Date().toISOString()
            });

            // Find matching recipes with performance optimization
            const matchingRecipes = await this.recipeService.findRecipesByIngredients(ingredientIds);

            // Calculate processing duration
            const duration = Date.now() - startTime;

            // Log performance metrics
            logger.info('Recipe matching completed', {
                correlationId,
                ingredientCount: ingredientIds.length,
                matchCount: matchingRecipes.length,
                duration,
                timestamp: new Date().toISOString()
            });

            // Performance monitoring - Log if processing time exceeds threshold
            if (duration > 200) {
                logger.warn('Recipe matching exceeded performance threshold', {
                    correlationId,
                    duration,
                    threshold: 200,
                    ingredientCount: ingredientIds.length
                });
            }

            // Publish results to analytics queue
            await QueueService.publishToQueue(QUEUE_CONSTANTS.ANALYTICS_QUEUE, {
                type: 'RECIPE_MATCHING',
                correlationId,
                ingredientCount: ingredientIds.length,
                matchCount: matchingRecipes.length,
                duration,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Failed to process recipe matching request', {
                correlationId,
                error: (error as Error).message,
                duration: Date.now() - startTime,
                message
            });

            // Re-throw error for queue retry mechanism
            throw error;
        }
    }
}