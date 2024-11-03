// @version amqplib ^0.10.0
// @version moment ^2.29.0

import { AnalyticsService } from '../services/analytics.service';
import { QueueService } from '../services/queue.service';
import { logger } from '../utils/logger';
import { 
    UserActivityMetrics, 
    SystemPerformanceMetrics, 
    RecipeAnalytics, 
    IngredientRecognitionMetrics 
} from '../interfaces/analytics.interface';

/**
 * HUMAN TASKS:
 * 1. Configure RabbitMQ connection settings in .env:
 *    - ANALYTICS_QUEUE=analytics_queue
 *    - RABBITMQ_URL=amqp://user:password@host:5672
 * 2. Set up CloudWatch alarms for analytics processing metrics
 * 3. Configure dead letter queue for failed analytics messages
 * 4. Set up monitoring for analytics worker health
 */

// Queue name constant from environment variable
const ANALYTICS_QUEUE = process.env.ANALYTICS_QUEUE || 'analytics_queue';

/**
 * Processes user activity analytics messages from the queue
 * Addresses requirement: Analytics and Reporting - Tracking user behavior
 */
async function processUserActivity(message: any): Promise<void> {
    try {
        const { userId, metrics } = message;
        
        // Validate message data
        if (!userId || !metrics) {
            throw new Error('Invalid user activity message format');
        }

        // Track user activity with correlation ID for tracing
        await analyticsService.trackUserActivity(userId, metrics as UserActivityMetrics);

        logger.info('User activity processed successfully', {
            userId,
            correlationId: message.correlationId,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to process user activity', {
            error: (error as Error).message,
            message,
            timestamp: new Date().toISOString()
        });
        throw error;
    }
}

/**
 * Processes system performance metrics messages from the queue
 * Addresses requirement: System Metrics - Performance and resource metrics tracking
 */
async function processSystemMetrics(message: any): Promise<void> {
    try {
        const metrics = message as SystemPerformanceMetrics;

        // Check critical thresholds
        if (metrics.cpuUsage > 70 || metrics.memoryUsage > 80) {
            logger.warn('System metrics exceeded thresholds', {
                cpuUsage: metrics.cpuUsage,
                memoryUsage: metrics.memoryUsage,
                timestamp: new Date().toISOString()
            });
        }

        // Record system metrics
        await analyticsService.recordSystemMetrics(metrics);

        logger.info('System metrics processed successfully', {
            correlationId: message.correlationId,
            metrics,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to process system metrics', {
            error: (error as Error).message,
            message,
            timestamp: new Date().toISOString()
        });
        throw error;
    }
}

/**
 * Processes recipe analytics messages from the queue
 * Addresses requirement: Analytics and Reporting - Recipe usage tracking
 */
async function processRecipeAnalytics(message: any): Promise<void> {
    try {
        const { recipeId, analytics } = message;

        // Validate recipe analytics data
        if (!recipeId || !analytics) {
            throw new Error('Invalid recipe analytics message format');
        }

        // Update recipe analytics
        await analyticsService.updateRecipeAnalytics(recipeId, analytics as RecipeAnalytics);

        logger.info('Recipe analytics processed successfully', {
            recipeId,
            correlationId: message.correlationId,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to process recipe analytics', {
            error: (error as Error).message,
            message,
            timestamp: new Date().toISOString()
        });
        throw error;
    }
}

/**
 * Processes ingredient recognition metrics messages from the queue
 * Addresses requirement: System Metrics - Image processing performance tracking
 */
async function processIngredientRecognition(message: any): Promise<void> {
    try {
        const metrics = message as IngredientRecognitionMetrics;

        // Track processing time against 3s threshold requirement
        if (metrics.processingTime > 3000) {
            logger.warn('Ingredient recognition processing time exceeded threshold', {
                processingTime: metrics.processingTime,
                timestamp: new Date().toISOString()
            });
        }

        // Track recognition metrics
        await analyticsService.trackIngredientRecognition(metrics);

        logger.info('Ingredient recognition metrics processed successfully', {
            correlationId: message.correlationId,
            metrics,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to process ingredient recognition metrics', {
            error: (error as Error).message,
            message,
            timestamp: new Date().toISOString()
        });
        throw error;
    }
}

/**
 * Main worker function that initializes the analytics worker and starts consuming from the queue
 * Addresses requirement: Asynchronous Processing - Background task processing for analytics
 */
export async function startWorker(): Promise<void> {
    try {
        logger.info('Starting analytics worker...', {
            queue: ANALYTICS_QUEUE,
            timestamp: new Date().toISOString()
        });

        // Initialize queue service
        await QueueService.initializeQueue();

        // Set up message consumer with message type routing
        await QueueService.consumeFromQueue(ANALYTICS_QUEUE, async (message) => {
            const { type, payload, correlationId } = message;

            logger.info('Received analytics message', {
                type,
                correlationId,
                timestamp: new Date().toISOString()
            });

            // Route message to appropriate handler based on type
            switch (type) {
                case 'USER_ACTIVITY':
                    await processUserActivity(payload);
                    break;
                case 'SYSTEM_METRICS':
                    await processSystemMetrics(payload);
                    break;
                case 'RECIPE_ANALYTICS':
                    await processRecipeAnalytics(payload);
                    break;
                case 'INGREDIENT_RECOGNITION':
                    await processIngredientRecognition(payload);
                    break;
                default:
                    throw new Error(`Unknown analytics message type: ${type}`);
            }
        });

        logger.info('Analytics worker started successfully', {
            queue: ANALYTICS_QUEUE,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to start analytics worker', {
            error: (error as Error).message,
            queue: ANALYTICS_QUEUE,
            timestamp: new Date().toISOString()
        });
        throw error;
    }

    // Set up graceful shutdown
    process.on('SIGTERM', async () => {
        logger.info('Shutting down analytics worker...', {
            timestamp: new Date().toISOString()
        });
        await QueueService.closeConnection();
        process.exit(0);
    });
}