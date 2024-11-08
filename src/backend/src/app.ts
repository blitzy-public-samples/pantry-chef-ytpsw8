// @version express ^4.18.0
// @version dotenv ^16.0.0
// @version compression ^1.7.4
// @version helmet ^4.6.0

import 'reflect-metadata';
import express, { Application } from 'express';
import dotenv from 'dotenv';
import compression from 'compression';
import helmet from 'helmet';
import http from 'http';
import { connectDatabase } from './config/database';
import { createRedisClient } from './config/redis';
import { configureRoutes } from './api/routes';
import WebSocketServer from './websocket/socket';
import mongoose from 'mongoose';
import { rateLimiterMiddleware } from './api/middlewares/rateLimiter.middleware';

// HUMAN TASKS:
// 1. Set up SSL certificates for HTTPS in production
// 2. Configure environment variables in AWS Parameter Store
// 3. Set up CloudWatch alarms for application metrics
// 4. Configure auto-scaling policies in AWS
// 5. Set up application logging and monitoring
// 6. Configure backup and disaster recovery procedures
// 7. Set up security scanning and vulnerability monitoring
// 8. Configure CI/CD pipeline with proper deployment stages

// Load environment variables
dotenv.config();

// Global constants from environment
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const API_VERSION = 'v1';

/**
 * Initializes the Express application with all middleware and configurations
 * Requirements addressed:
 * - System Architecture (1.1): Node.js/Express backend services
 * - Core Infrastructure (5.1): Integration of API Gateway and Application Services
 */
export const initializeApp = async (): Promise<Application> => {
  try {
    // Create Express application instance
    const app: Application = express();

    // Configure basic security middleware
    app.use(
      helmet({
        contentSecurityPolicy: true,
        crossOriginEmbedderPolicy: true,
        crossOriginOpenerPolicy: true,
        crossOriginResourcePolicy: true,
        dnsPrefetchControl: true,
        frameguard: true,
        hidePoweredBy: true,
        hsts: true,
        ieNoOpen: true,
        noSniff: true,
        originAgentCluster: true,
        permittedCrossDomainPolicies: true,
        referrerPolicy: true,
        xssFilter: true,
      })
    );

    // Configure compression middleware
    app.use(
      compression({
        filter: (req, res) => {
          if (req.headers['x-no-compression']) {
            return false;
          }
          return compression.filter(req, res);
        },
        level: 6,
      })
    );

    // Configure request parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Initialize database connection with high availability
    await connectDatabase();

    // Initialize Redis cache with cluster mode
    const redisClient = createRedisClient();

    // Attach Redis client to app for global access
    app.locals.redis = redisClient;

    // Configure API routes with versioning
    configureRoutes(app);

    // Add basic security headers
    app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    });

    return app;
  } catch (error: any) {
    console.error('Failed to initialize application:', error);
    throw error;
  }
};

/**
 * Starts the HTTP server and initializes WebSocket support
 * Requirements addressed:
 * - High Availability (5.5): Multi-AZ deployment with auto-scaling
 * - Real-time Communications: WebSocket server with sub-200ms response times
 */
export const startServer = async (app: Application): Promise<void> => {
  try {
    // Create HTTP server instance
    const server = http.createServer(app);

    // Initialize WebSocket server
    const wsServer = new WebSocketServer(server);
    wsServer.start();

    // Configure graceful shutdown
    const gracefulShutdown = async () => {
      await handleShutdown();
      process.exit(0);
    };

    // Set up signal handlers
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    // Start HTTP server
    server.listen(PORT, () => {
      console.info(`Server running in ${NODE_ENV} mode on port ${PORT}`);
      console.info(`API Version: ${API_VERSION}`);
      console.info(`WebSocket server initialized`);
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        version: process.env.APP_VERSION || '1.0.0',
      });
    });
  } catch (error: any) {
    console.error('Failed to start server:', error);
    throw error;
  }
};

/**
 * Handles graceful application shutdown
 * Requirements addressed:
 * - High Availability (5.5): Proper resource cleanup and connection handling
 */
export const handleShutdown = async (): Promise<void> => {
  try {
    console.info('Initiating graceful shutdown...');

    // Close database connections
    if (process.env.NODE_ENV !== 'test') {
      await mongoose.connection.close();
      console.info('Database connections closed');
    }

    // Close Redis connections
    if (app.locals.redis) {
      await app.locals.redis.quit();
      console.info('Redis connections closed');
    }

    // Close WebSocket connections
    if (app.locals.wsServer) {
      await new Promise<void>((resolve) => {
        app.locals.wsServer.close(() => {
          console.info('WebSocket server closed');
          resolve();
        });
      });
    }

    console.info('Graceful shutdown completed');
  } catch (error: any) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Export application instance for testing
export const app = express();

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  (async () => {
    try {
      const app = await initializeApp();
      await startServer(app);
    } catch (error: any) {
      console.error('Failed to start application:', error);
      process.exit(1);
    }
  })();
}
