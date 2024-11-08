// @version express ^4.18.0
// @version cors ^2.8.5
// @version helmet ^4.6.0
// @version compression ^1.7.4

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import * as analyticsRouter from './analytics.routes';
import { configureAuthRoutes } from './auth.routes';
import * as recipeRouter from './recipe.routes';
import * as pantryRouter from './pantry.routes';
import userRouter from './user.routes';
import { errorHandler } from '../middlewares/error.middleware';

/*
HUMAN TASKS:
1. Configure CORS allowed origins in environment variables
2. Set up monitoring for rate limiting and security violations
3. Configure SSL certificates for HTTPS
4. Set up AWS API Gateway integration parameters
5. Configure CloudWatch logging for API access
6. Set up security alert notifications
*/

/**
 * Configures all application routes with security middleware and proper versioning
 * Requirements addressed:
 * - API Gateway (5.1): Central routing configuration
 * - Microservices Integration (1.1): Service route aggregation
 * - Security Architecture (5.6): Security middleware implementation
 *
 * @param app Express application instance
 */
export const configureRoutes = (app: Application): void => {
  // Configure security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", process.env.API_URL as string],
        },
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      frameguard: { action: 'deny' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  // Configure CORS with proper origin validation
  app.use(
    cors({
      origin: (origin, callback) => {
        const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS not allowed'));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400, // 24 hours
    })
  );

  // Enable response compression
  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      threshold: 0,
      level: 6, // Balanced compression level
    })
  );

  // Parse JSON and URL-encoded bodies
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API version prefix
  const API_VERSION = '/api/v1';

  // Mount analytics routes with admin-only access
  app.use(`${API_VERSION}/analytics`, analyticsRouter.router);

  // Mount recipe routes with search and matching capabilities
  app.use(`${API_VERSION}/recipes`, recipeRouter.router);

  // Mount pantry routes with inventory management
  app.use(`${API_VERSION}/pantry`, pantryRouter.router);

  // Mount user routes with profile handling
  app.use(`${API_VERSION}/users`, userRouter);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
    });
  });

  // API documentation redirect
  app.get('/docs', (req, res) => {
    res.redirect(process.env.API_DOCS_URL || '/api-docs');
  });

  // Global error handler with CloudWatch integration
  app.use(errorHandler);

  // 404 handler for undefined routes
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'The requested endpoint does not exist',
      },
    });
  });
};

export default configureRoutes;
