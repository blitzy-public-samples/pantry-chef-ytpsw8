import amqplib, { Connection, Channel } from 'amqplib'; // ^0.10.0
import dotenv from 'dotenv'; // ^16.0.0
import { QUEUE_CONSTANTS } from '../utils/constants';
import logger from '../utils/logger';

// HUMAN TASKS:
// 1. Configure RabbitMQ credentials in .env:
//    - RABBITMQ_URL=amqp://user:password@host:5672
//    - RABBITMQ_HEARTBEAT=60
//    - RABBITMQ_PREFETCH=10
//    - QUEUE_RETRY_ATTEMPTS=3
// 2. Set up RabbitMQ management console access
// 3. Configure queue monitoring and alerts
// 4. Set up dead letter exchange policies
// 5. Configure queue persistence and durability settings

// Load environment variables
dotenv.config();

// Global configuration constants
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const RABBITMQ_HEARTBEAT = process.env.RABBITMQ_HEARTBEAT || 60;
const RABBITMQ_PREFETCH = parseInt(process.env.RABBITMQ_PREFETCH) || 10;
const QUEUE_RETRY_ATTEMPTS = parseInt(process.env.QUEUE_RETRY_ATTEMPTS) || 3;

// Dead letter exchange name for failed messages
const DEAD_LETTER_EXCHANGE = 'pantry-chef-dlx';

/**
 * Creates and returns a connection to the RabbitMQ server with automatic reconnection handling
 * Requirement: Message Queue Configuration - RabbitMQ connection with retry logic
 */
export const createConnection = async (): Promise<Connection> => {
    try {
        const connection = await amqplib.connect(RABBITMQ_URL, {
            heartbeat: parseInt(RABBITMQ_HEARTBEAT.toString())
        });

        // Handle connection errors
        connection.on('error', (error) => {
            logger.error('RabbitMQ connection error', { error: error.message });
        });

        // Handle connection close
        connection.on('close', async () => {
            logger.info('RabbitMQ connection closed, attempting to reconnect...');
            // Attempt to reconnect after a delay
            setTimeout(async () => {
                try {
                    await createConnection();
                } catch (error) {
                    logger.error('RabbitMQ reconnection failed', { error });
                }
            }, 5000);
        });

        logger.info('RabbitMQ connection established successfully');
        return connection;
    } catch (error) {
        logger.error('Failed to create RabbitMQ connection', { error });
        throw error;
    }
};

/**
 * Creates a channel on an existing RabbitMQ connection with prefetch configuration
 * Requirement: Asynchronous Processing - Channel configuration with prefetch settings
 */
export const createChannel = async (connection: Connection): Promise<Channel> => {
    try {
        const channel = await connection.createChannel();
        
        // Configure channel prefetch for load balancing
        await channel.prefetch(RABBITMQ_PREFETCH);

        // Handle channel errors
        channel.on('error', (error) => {
            logger.error('RabbitMQ channel error', { error: error.message });
        });

        // Handle channel close
        channel.on('close', () => {
            logger.info('RabbitMQ channel closed');
        });

        // Initialize queues
        await setupQueues(channel);

        logger.info('RabbitMQ channel created successfully');
        return channel;
    } catch (error) {
        logger.error('Failed to create RabbitMQ channel', { error });
        throw error;
    }
};

/**
 * Initializes and configures all required message queues with dead letter exchanges
 * Requirement: System Components - Queue setup with dead letter exchanges
 */
export const setupQueues = async (channel: Channel): Promise<void> => {
    try {
        // Assert dead letter exchange
        await channel.assertExchange(DEAD_LETTER_EXCHANGE, 'direct', {
            durable: true
        });

        // Common queue options with dead letter configuration
        const queueOptions = {
            durable: true, // Queue survives broker restart
            arguments: {
                'x-dead-letter-exchange': DEAD_LETTER_EXCHANGE,
                'x-message-ttl': 1000 * 60 * 60 * 24, // 24 hour TTL
                'x-max-retries': QUEUE_RETRY_ATTEMPTS
            }
        };

        // Assert image processing queue
        // Requirement: Asynchronous Processing - Image processing queue
        await channel.assertQueue(QUEUE_CONSTANTS.IMAGE_PROCESSING_QUEUE, {
            ...queueOptions,
            arguments: {
                ...queueOptions.arguments,
                'x-max-priority': 10 // Priority queue for image processing
            }
        });

        // Assert notification queue
        // Requirement: Asynchronous Processing - Notification queue
        await channel.assertQueue(QUEUE_CONSTANTS.NOTIFICATION_QUEUE, {
            ...queueOptions,
            arguments: {
                ...queueOptions.arguments,
                'x-message-ttl': 1000 * 60 * 30 // 30 minute TTL for notifications
            }
        });

        // Assert recipe matching queue
        // Requirement: Asynchronous Processing - Recipe matching queue
        await channel.assertQueue(QUEUE_CONSTANTS.RECIPE_MATCHING_QUEUE, {
            ...queueOptions,
            arguments: {
                ...queueOptions.arguments,
                'x-max-length': 10000 // Limit queue length
            }
        });

        // Assert analytics queue
        // Requirement: System Components - Analytics queue
        await channel.assertQueue(QUEUE_CONSTANTS.ANALYTICS_QUEUE, {
            ...queueOptions,
            arguments: {
                ...queueOptions.arguments,
                'x-queue-mode': 'lazy' // Optimize for high-throughput
            }
        });

        // Assert dead letter queues for each main queue
        const queues = Object.values(QUEUE_CONSTANTS);
        for (const queue of queues) {
            const dlqName = `${queue}-dlq`;
            await channel.assertQueue(dlqName, {
                durable: true
            });
            await channel.bindQueue(dlqName, DEAD_LETTER_EXCHANGE, queue);
        }

        logger.info('RabbitMQ queues initialized successfully');
    } catch (error) {
        logger.error('Failed to setup RabbitMQ queues', { error });
        throw error;
    }
};