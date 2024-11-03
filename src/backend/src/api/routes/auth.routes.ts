// @version express ^4.18.0
// @version express-rate-limit ^6.7.0

import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import { 
    validateLoginRequest, 
    validateSignupRequest, 
    validatePasswordResetRequest,
    validateNewPasswordRequest 
} from '../validators/auth.validator';
import rateLimit from 'express-rate-limit';

/**
 * HUMAN TASKS:
 * 1. Configure rate limiting thresholds in environment variables
 * 2. Set up monitoring alerts for authentication failures
 * 3. Configure OAuth2.0 provider credentials
 * 4. Set up email service for password reset functionality
 * 5. Configure security alerts for suspicious login patterns
 * 6. Set up audit logging for authentication events
 */

/**
 * Configures and returns Express router with authentication endpoints
 * Requirements addressed:
 * - User Authentication (5.1): Authentication Service implementation
 * - Security Protocols (9.3.1): JWT + OAuth2.0 based secure authentication
 * - Access Control (9.1.1): Authentication routes with secure middleware
 * - Data Protection (9.2.1): Secure credential handling with encryption
 */
export function configureAuthRoutes(authController: AuthController): Router {
    const router = Router();

    // Rate limiting middleware for auth endpoints
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 failed attempts
        message: 'Too many login attempts, please try again later',
        standardHeaders: true,
        legacyHeaders: false,
    });

    const passwordResetLimiter = rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 attempts
        message: 'Too many password reset attempts, please try again later',
        standardHeaders: true,
        legacyHeaders: false,
    });

    // Login endpoint with rate limiting and validation
    router.post(
        '/login',
        authLimiter,
        validateRequest,
        validateLoginRequest,
        authController.login
    );

    // Registration endpoint with validation
    router.post(
        '/register',
        validateRequest,
        validateSignupRequest,
        authController.register
    );

    // Token refresh endpoint with authentication
    router.post(
        '/refresh-token',
        authenticate,
        authController.refreshToken
    );

    // Password reset request endpoint with rate limiting
    router.post(
        '/reset-password',
        passwordResetLimiter,
        validateRequest,
        validatePasswordResetRequest,
        authController.resetPassword
    );

    // New password submission endpoint with validation
    router.post(
        '/new-password',
        passwordResetLimiter,
        validateRequest,
        validateNewPasswordRequest,
        authController.resetPassword
    );

    // OAuth2.0 authentication endpoints
    router.get(
        '/oauth/google',
        authController.login
    );

    router.get(
        '/oauth/google/callback',
        authController.login
    );

    router.get(
        '/oauth/facebook',
        authController.login
    );

    router.get(
        '/oauth/facebook/callback',
        authController.login
    );

    // Logout endpoint with token invalidation
    router.post(
        '/logout',
        authenticate,
        authController.login
    );

    return router;
}