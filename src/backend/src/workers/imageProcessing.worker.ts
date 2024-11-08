// HUMAN TASKS:
// 1. Configure RabbitMQ connection settings in .env:
//    - RABBITMQ_URL=amqp://user:password@host:5672
//    - RABBITMQ_HEARTBEAT=60
// 2. Set up TensorFlow model in production:
//    - Configure model path in environment variables
//    - Set up model versioning and updates
// 3. Configure CloudWatch metrics for worker monitoring
// 4. Set up dead letter queues for failed messages
// 5. Configure worker scaling policies in production

import { QueueService } from '../services/queue.service';
// import { ImageService } from '../services/image.service';
import { logger } from '../utils/logger';
import { QUEUE_CONSTANTS } from '../utils/constants';

// Global service instances
let queueService: QueueService;
// let imageService: ImageService;

/**
 * Initializes the image processing worker with required services
 * Requirement: Image Recognition Service - Worker initialization and queue setup
 */
export async function initializeWorker(): Promise<void> {
  try {
    logger.info('Initializing image processing worker');

    // Initialize queue service
    await QueueService.initializeQueue();
    queueService = new QueueService();

    // Initialize image service
    // imageService = new ImageService();

    // Set up consumer for image processing queue
    await QueueService.consumeFromQueue(
      QUEUE_CONSTANTS.IMAGE_PROCESSING_QUEUE,
      processImageMessage
    );

    logger.info('Image processing worker initialized successfully', {
      queue: QUEUE_CONSTANTS.IMAGE_PROCESSING_QUEUE,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to initialize image processing worker', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Processes incoming image messages from the queue
 * Requirements:
 * - Image Processing Pipeline - Multi-step image processing
 * - Asynchronous Processing - Background task processing through RabbitMQ
 */
async function processImageMessage(message: any): Promise<void> {
  try {
    logger.info('Processing image message', {
      messageId: message.id,
      timestamp: new Date().toISOString(),
    });

    // Validate message structure
    if (!message.imageBuffer || !message.fileName) {
      throw new Error('Invalid message format: missing required fields');
    }

    // Convert base64 image to buffer if needed
    const imageBuffer = Buffer.isBuffer(message.imageBuffer)
      ? message.imageBuffer
      : Buffer.from(message.imageBuffer, 'base64');

    // Process image through recognition pipeline
    // const recognitionResult = await imageService.processImage(imageBuffer, message.fileName);

    // Publish results to recipe matching queue
    await QueueService.publishToQueue(QUEUE_CONSTANTS.RECIPE_MATCHING_QUEUE, {
      userId: message.userId,
      imageId: message.id,
      // recognitionResults: recognitionResult,
      timestamp: new Date().toISOString(),
    });

    // logger.info('Image processing completed successfully', {
    //   messageId: message.id,
    //   ingredients: recognitionResult.ingredients.length,
    //   imageUrl: recognitionResult.imageUrl,
    // });
  } catch (error: any) {
    logger.error('Failed to process image message', {
      error: error.message,
      stack: error.stack,
      messageId: message?.id,
    });
    throw error; // Allow queue service to handle retries
  }
}

/**
 * Handles graceful shutdown of the worker
 * Requirement: System Integration - Clean shutdown handling
 */
async function handleShutdown(): Promise<void> {
  try {
    logger.info('Initiating worker shutdown');

    // Close queue connections
    await QueueService.closeConnection();

    logger.info('Worker shutdown completed successfully');
    process.exit(0);
  } catch (error: any) {
    logger.error('Error during worker shutdown', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Set up shutdown handlers
process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);

// Initialize worker if this is the main module
if (require.main === module) {
  initializeWorker().catch((error) => {
    logger.error('Worker initialization failed', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });
}
