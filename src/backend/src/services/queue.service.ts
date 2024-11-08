import { Connection, Channel } from 'amqplib';
import { createConnection, createChannel, setupQueues } from '../config/rabbitmq';
import { QUEUE_CONSTANTS } from '../utils/constants';
import { logger } from '../utils/logger';

// HUMAN TASKS:
// 1. Configure RabbitMQ credentials in .env:
//    - RABBITMQ_URL=amqp://user:password@host:5672
//    - RABBITMQ_HEARTBEAT=60
//    - RABBITMQ_PREFETCH=10
//    - QUEUE_RETRY_ATTEMPTS=3
// 2. Set up RabbitMQ monitoring and alerts in production
// 3. Configure dead letter exchange policies
// 4. Set up queue persistence and durability settings
// 5. Configure CloudWatch metrics for queue monitoring

// Global connection and channel instances
let connection: Connection | null = null;
let channel: Channel | null = null;

/**
 * Core queue service class for managing RabbitMQ operations
 * Requirement: Message Queue Integration - RabbitMQ message queue for asynchronous processing
 */
export class QueueService {
  /**
   * Initializes the RabbitMQ connection and channel with required queues
   * Requirement: Message Queue Integration - Queue initialization with dead letter exchanges
   */
  public static async initializeQueue(): Promise<void> {
    try {
      // Create RabbitMQ connection with automatic reconnection
      connection = await createConnection();

      // Create channel with prefetch configuration
      channel = await createChannel(connection);

      // Set up required queues with dead letter exchanges
      await setupQueues(channel);

      logger.info('Queue service initialized successfully', {
        queues: Object.values(QUEUE_CONSTANTS),
      });
    } catch (error: any) {
      logger.error('Failed to initialize queue service', { error });
      throw error;
    }
  }

  /**
   * Publishes a message to the specified queue
   * Requirement: Asynchronous Processing - Background task processing for various operations
   */
  public static async publishToQueue(queueName: string, data: object): Promise<boolean> {
    try {
      // Validate queue name
      if (!Object.values(QUEUE_CONSTANTS).includes(queueName)) {
        throw new Error(`Invalid queue name: ${queueName}`);
      }

      // Ensure channel is available
      if (!channel) {
        throw new Error('Queue channel not initialized');
      }

      // Convert message to buffer
      const message = Buffer.from(JSON.stringify(data));

      // Publish with persistence options
      const published = channel.publish('', queueName, message, {
        persistent: true, // Message survives broker restart
        contentType: 'application/json',
        contentEncoding: 'utf-8',
        timestamp: Date.now(),
        messageId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });

      if (published) {
        logger.info('Message published successfully', {
          queue: queueName,
          messageId: message.toString(),
          timestamp: new Date().toISOString(),
        });
      }

      return published;
    } catch (error: any) {
      logger.error('Failed to publish message to queue', {
        queue: queueName,
        error,
        data,
      });
      throw error;
    }
  }

  /**
   * Sets up a consumer for the specified queue
   * Requirement: System Integration - Queue management for data processing
   */
  public static async consumeFromQueue(
    queueName: string,
    callback: (data: any) => Promise<void>
  ): Promise<void> {
    try {
      // Validate queue name
      if (!Object.values(QUEUE_CONSTANTS).includes(queueName)) {
        throw new Error(`Invalid queue name: ${queueName}`);
      }

      // Ensure channel is available
      if (!channel) {
        throw new Error('Queue channel not initialized');
      }

      // Set up consumer with acknowledgment handling
      await channel.consume(
        queueName,
        async (msg) => {
          if (!msg) return;

          try {
            // Parse message content
            const content = JSON.parse(msg.content.toString());

            // Process message with provided callback
            await callback(content);

            // Acknowledge successful processing
            channel?.ack(msg);

            logger.info('Message processed successfully', {
              queue: queueName,
              messageId: msg.properties.messageId,
              timestamp: new Date().toISOString(),
            });
          } catch (error: any) {
            logger.error('Failed to process message', {
              queue: queueName,
              error,
              message: msg.content.toString(),
            });

            // Check retry count from message headers
            const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) + 1;
            const maxRetries = 3;

            if (retryCount <= maxRetries) {
              // Retry with exponential backoff
              const delay = Math.pow(2, retryCount) * 1000;

              // Republish with updated retry count
              channel?.publish('', queueName, msg.content, {
                ...msg.properties,
                headers: {
                  ...msg.properties.headers,
                  'x-retry-count': retryCount,
                  'x-first-death-queue': queueName,
                },
                expiration: delay.toString(),
              });

              // Acknowledge original message
              channel?.ack(msg);
            } else {
              // Send to dead letter queue after max retries
              channel?.reject(msg, false);
            }
          }
        },
        {
          noAck: false, // Enable manual acknowledgment
        }
      );

      logger.info('Consumer setup completed', {
        queue: queueName,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to set up queue consumer', {
        queue: queueName,
        error,
      });
      throw error;
    }
  }

  /**
   * Gracefully closes the RabbitMQ connection and channel
   * Requirement: Message Queue Integration - Clean connection handling
   */
  public static async closeConnection(): Promise<void> {
    try {
      // Close channel if open
      if (channel) {
        await channel.close();
        channel = null;
        logger.info('RabbitMQ channel closed');
      }

      // Close connection if open
      if (connection) {
        await connection.close();
        connection = null;
        logger.info('RabbitMQ connection closed');
      }
    } catch (error: any) {
      logger.error('Failed to close queue connections', { error });
      throw error;
    }
  }
}
