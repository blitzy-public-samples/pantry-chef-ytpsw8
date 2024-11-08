/**
 * HUMAN TASKS:
 * 1. Configure rate limiting thresholds in environment variables
 * 2. Set up monitoring for image processing endpoints
 * 3. Configure CloudWatch alarms for error rates
 * 4. Set up S3 bucket lifecycle policies for uploaded images
 * 5. Configure CDN caching policies for processed images
 */

import express, { Router } from 'express'; // ^4.18.0
import rateLimit from 'express-rate-limit'; // ^6.7.0
import { ImageController } from '../controllers/image.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { uploadMiddleware } from '../middlewares/upload.middleware';
import { validateImageUpload } from '../validators/image.validator';
import { logger } from '../../utils/logger';

/**
 * Configures and returns the Express router with secure image processing endpoints
 * Addresses requirements:
 * - Photographic ingredient recognition through secure endpoints
 * - Image processing pipeline with validation
 * - Protected routes with authentication
 */
const configureImageRoutes = (imageController: ImageController): Router => {
  const router = express.Router();

  // Configure rate limiting for image upload endpoints
  const uploadRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: 'Too many image uploads from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Configure rate limiting for recognition results endpoint
  const recognitionRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 30, // Limit each IP to 30 requests per windowMs
    message: 'Too many recognition requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Add timestamp to track request processing time
  router.use((req, res, next) => {
    req.timestamp = new Date().getTime();
    next();
  });

  /**
   * POST /upload
   * Secure endpoint for uploading and processing ingredient images
   * Addresses requirements:
   * - Photographic ingredient recognition
   * - Secure image upload with validation
   * - Authentication and rate limiting
   */
  router.post(
    '/upload',
    authenticate,
    uploadRateLimiter,
    validateImageUpload,
    uploadMiddleware,
    async (req, res, next) => {
      try {
        logger.info('Processing image upload request', {
          userId: req.user?.id,
          contentType: req.headers['content-type'],
        });
        await imageController.uploadImage(req, res, next);
      } catch (error: any) {
        logger.error('Image upload route error', {
          error: error.message,
          stack: error.stack,
          userId: req.user?.id,
        });
        next(error);
      }
    }
  );

  /**
   * GET /recognition/:imageId
   * Protected endpoint for retrieving ingredient recognition results
   * Addresses requirements:
   * - Secure access to recognition results
   * - Authenticated results retrieval
   * - Rate limiting for API protection
   */
  router.get(
    '/recognition/:imageId',
    authenticate,
    recognitionRateLimiter,
    async (req, res, next) => {
      try {
        logger.info('Processing recognition results request', {
          imageId: req.params.imageId,
          userId: req.user?.id,
        });
        await imageController.getRecognitionResults(req, res, next);
      } catch (error: any) {
        logger.error('Recognition results route error', {
          error: error.message,
          stack: error.stack,
          imageId: req.params.imageId,
          userId: req.user?.id,
        });
        next(error);
      }
    }
  );

  // Add security headers
  router.use((req, res, next) => {
    res.set({
      'Content-Security-Policy': "default-src 'self'",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    });
    next();
  });

  return router;
};

// Export configured router
export default configureImageRoutes;

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      timestamp: number;
      user?: {
        id: string;
        [key: string]: any;
      };
      fileKey?: string;
      imageMetadata?: any;
    }
  }
}
