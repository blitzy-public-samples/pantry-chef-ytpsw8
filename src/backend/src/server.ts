// @version cluster ^1.0.0
// @version os ^1.0.0
// @version dotenv ^16.0.0

import cluster from 'cluster';
import os from 'os';
import dotenv from 'dotenv';
import app from './app';
import { logger } from './config/logger';

// HUMAN TASKS:
// 1. Configure environment variables in production:
//    - PORT: Application port (default: 3000)
//    - NODE_ENV: Environment name (default: development)
//    - WORKER_COUNT: Number of worker processes (default: CPU cores)
//    - SHUTDOWN_TIMEOUT: Graceful shutdown timeout in ms (default: 10000)
// 2. Set up monitoring alerts for worker process health
// 3. Configure container orchestration health checks
// 4. Set up log aggregation for multiple worker processes
// 5. Configure auto-scaling policies based on load metrics

// Load environment variables
dotenv.config();

// Global constants
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const WORKER_COUNT = Number(process.env.WORKER_COUNT) || os.cpus().length;
const SHUTDOWN_TIMEOUT = Number(process.env.SHUTDOWN_TIMEOUT) || 10000;

/**
 * Initializes and starts a worker process with the Express application
 * Requirements addressed:
 * - System Architecture (1.1): Node.js/Express backend services
 * - Infrastructure Monitoring (10.5.3): Health checks and process monitoring
 */
async function startWorker(): Promise<void> {
    try {
        // Create HTTP server and start listening
        const server = app.listen(PORT, () => {
            logger.info(`Worker ${process.pid} started and listening on port ${PORT}`);
        });

        // Initialize health check endpoint for container orchestration
        app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'healthy',
                pid: process.pid,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString()
            });
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception in worker process', {
                error: error.message,
                stack: error.stack,
                pid: process.pid
            });
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled rejection in worker process', {
                reason,
                pid: process.pid
            });
        });

        // Graceful shutdown handler
        const shutdown = async () => {
            logger.info(`Worker ${process.pid} starting graceful shutdown`);

            // Stop accepting new connections
            server.close(() => {
                logger.info(`Worker ${process.pid} closed all connections`);
                process.exit(0);
            });

            // Force shutdown after timeout
            setTimeout(() => {
                logger.error(`Worker ${process.pid} shutdown timed out, forcing exit`);
                process.exit(1);
            }, SHUTDOWN_TIMEOUT);
        };

        // Register shutdown handlers
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        logger.error('Failed to start worker process', {
            error: error.message,
            stack: error.stack,
            pid: process.pid
        });
        process.exit(1);
    }
}

/**
 * Initializes the master process and manages worker processes
 * Requirements addressed:
 * - High Availability (5.2.2): Multi-process deployment with clustering
 * - Deployment Architecture (5.5): Auto-scaling group deployment
 */
async function startMaster(): Promise<void> {
    try {
        logger.info('Starting master process', {
            pid: process.pid,
            workers: WORKER_COUNT,
            environment: NODE_ENV
        });

        // Fork worker processes
        for (let i = 0; i < WORKER_COUNT; i++) {
            cluster.fork();
        }

        // Handle worker exits and restart them
        cluster.on('exit', (worker, code, signal) => {
            logger.error('Worker died', {
                workerId: worker.id,
                pid: worker.process.pid,
                code,
                signal
            });

            // Restart worker unless shutting down
            if (!worker.exitedAfterDisconnect) {
                logger.info('Restarting worker process');
                cluster.fork();
            }
        });

        // Log when workers come online
        cluster.on('online', (worker) => {
            logger.info('Worker started', {
                workerId: worker.id,
                pid: worker.process.pid
            });
        });

        // Handle master process signals for graceful shutdown
        const shutdown = async () => {
            logger.info('Master starting graceful shutdown');

            // Disconnect all workers
            for (const id in cluster.workers) {
                cluster.workers[id]?.disconnect();
            }

            // Force exit after timeout
            setTimeout(() => {
                logger.error('Master shutdown timed out, forcing exit');
                process.exit(1);
            }, SHUTDOWN_TIMEOUT);
        };

        // Register shutdown handlers
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        logger.error('Failed to start master process', {
            error: error.message,
            stack: error.stack,
            pid: process.pid
        });
        process.exit(1);
    }
}

/**
 * Sets up signal handlers for graceful process shutdown
 * Requirements addressed:
 * - High Availability (5.2.2): Zero-downtime updates
 */
function handleProcessSignals(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception', {
            error: error.message,
            stack: error.stack,
            pid: process.pid
        });
        process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled rejection', {
            reason,
            pid: process.pid
        });
    });
}

// Start the application based on process type
if (cluster.isMaster) {
    // Start master process
    startMaster().catch((error) => {
        logger.error('Failed to start master process', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    });
} else {
    // Start worker process
    handleProcessSignals();
    startWorker().catch((error) => {
        logger.error('Failed to start worker process', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    });
}