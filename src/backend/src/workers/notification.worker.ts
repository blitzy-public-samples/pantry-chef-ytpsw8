// HUMAN TASKS:
// 1. Configure RabbitMQ connection string in environment:
//    - RABBITMQ_URL=amqp://user:password@host:5672
// 2. Set up monitoring for notification processing metrics
// 3. Configure dead letter queue alerts
// 4. Set up retry policy thresholds
// 5. Configure worker scaling rules based on queue depth

import { Channel, ConsumeMessage } from 'amqplib'; // ^0.10.0
import { NotificationService } from '../services/notification.service';
import { createConnection, createChannel } from '../config/rabbitmq';
import { logger } from '../utils/logger';

// Global configuration constants
const NOTIFICATION_QUEUE = process.env.NOTIFICATION_QUEUE || 'notifications';
const WORKER_PREFETCH = parseInt(process.env.WORKER_PREFETCH) || 10;
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES) || 3;
const RETRY_DELAY = parseInt(process.env.RETRY_DELAY) || 5000;

/**
 * Initializes and starts the notification worker process
 * Requirement: Message Queue Processing - Worker initialization
 */
export async function startWorker(): Promise<void> {
    try {
        // Create RabbitMQ connection with automatic reconnection
        const connection = await createConnection();
        logger.info('Notification worker connected to RabbitMQ');

        // Create channel with prefetch configuration
        const channel = await createChannel(connection);
        await channel.prefetch(WORKER_PREFETCH);
        logger.info('Notification worker channel configured', { prefetch: WORKER_PREFETCH });

        // Initialize notification service
        const notificationService = new NotificationService(undefined);

        // Assert queue existence and configure dead letter exchange
        await channel.assertQueue(NOTIFICATION_QUEUE, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': 'notification-dlx',
                'x-message-ttl': 24 * 60 * 60 * 1000, // 24 hours TTL
                'x-max-retries': MAX_RETRIES
            }
        });

        // Start consuming messages
        await channel.consume(
            NOTIFICATION_QUEUE,
            async (message) => {
                if (message) {
                    try {
                        await processMessage(message, notificationService);
                        channel.ack(message);
                    } catch (error) {
                        await handleError(error, message, channel);
                    }
                }
            },
            { noAck: false }
        );

        // Handle connection events
        connection.on('error', (error) => {
            logger.error('RabbitMQ connection error', { error });
        });

        connection.on('close', () => {
            logger.warn('RabbitMQ connection closed, attempting to reconnect...');
            setTimeout(startWorker, RETRY_DELAY);
        });

        // Handle channel events
        channel.on('error', (error) => {
            logger.error('RabbitMQ channel error', { error });
        });

        channel.on('close', () => {
            logger.warn('RabbitMQ channel closed');
        });

        logger.info('Notification worker started successfully');
    } catch (error) {
        logger.error('Failed to start notification worker', { error });
        throw error;
    }
}

/**
 * Processes individual notification messages from the queue
 * Requirement: Push Notifications, Real-time Updates - Message processing
 */
async function processMessage(
    message: ConsumeMessage,
    notificationService: NotificationService
): Promise<void> {
    try {
        const notification = JSON.parse(message.content.toString());
        const correlationId = message.properties.correlationId;

        logger.info('Processing notification message', {
            correlationId,
            type: notification.type
        });

        // Route to appropriate notification method based on type
        switch (notification.type) {
            case 'push':
                await notificationService.sendPushNotification(
                    notification.userId,
                    notification.data
                );
                break;

            case 'email':
                await notificationService.sendEmailNotification(
                    notification.userEmail,
                    notification.data
                );
                break;

            case 'websocket':
                await notificationService.sendWebSocketNotification(
                    notification.userId,
                    notification.data
                );
                break;

            default:
                throw new Error(`Unknown notification type: ${notification.type}`);
        }

        logger.info('Notification processed successfully', {
            correlationId,
            type: notification.type
        });
    } catch (error) {
        logger.error('Failed to process notification', {
            error,
            messageId: message.properties.messageId
        });
        throw error;
    }
}

/**
 * Handles errors during notification processing with retry logic
 * Requirement: Message Queue Processing - Error handling and retries
 */
async function handleError(
    error: Error,
    message: ConsumeMessage,
    channel: Channel
): Promise<void> {
    const retryCount = (message.properties.headers?.['x-retry-count'] || 0) + 1;
    const correlationId = message.properties.correlationId;

    logger.error('Notification processing error', {
        error,
        correlationId,
        retryCount
    });

    if (retryCount <= MAX_RETRIES) {
        // Implement exponential backoff for retries
        const delay = Math.pow(2, retryCount) * RETRY_DELAY;

        // Requeue message with updated retry count
        await channel.publish(
            '',
            NOTIFICATION_QUEUE,
            message.content,
            {
                persistent: true,
                headers: {
                    'x-retry-count': retryCount,
                    'x-first-death-queue': NOTIFICATION_QUEUE,
                    'x-original-correlation-id': correlationId
                },
                expiration: delay.toString()
            }
        );

        // Acknowledge original message
        channel.ack(message);

        logger.info('Message requeued for retry', {
            correlationId,
            retryCount,
            delay
        });
    } else {
        // Move to dead letter queue after max retries
        channel.nack(message, false, false);

        logger.warn('Message moved to dead letter queue', {
            correlationId,
            retryCount: MAX_RETRIES
        });
    }
}