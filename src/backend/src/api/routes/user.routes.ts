/**
 * HUMAN TASKS:
 * 1. Configure JWT secret and expiration in environment variables
 * 2. Set up rate limiting for authentication endpoints
 * 3. Configure email verification service
 * 4. Set up monitoring for authentication failures
 * 5. Configure user data backup schedule
 */

import { Router } from 'express'; // ^4.18.0
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import {
    validateRegistration,
    validateLogin,
    validateProfileUpdate,
    validatePreferencesUpdate
} from '../validators/user.validator';

/**
 * Initializes user routes with authentication and validation middleware
 * Addresses requirements:
 * - User Authentication - Secure routes with JWT authentication
 * - User Profile Management - Protected profile endpoints
 * - User Preferences - Preference management endpoints
 */
export const userRouter = Router();

// Initialize UserController
const userController = new UserController(/* userService will be injected */);

// Public routes
/**
 * POST /api/users/register
 * Requirement: User Authentication - Secure user registration with validation
 */
userRouter.post(
    '/register',
    validateRegistration(),
    validateRequest,
    userController.register
);

/**
 * POST /api/users/login
 * Requirement: User Authentication - Secure login with credential validation
 */
userRouter.post(
    '/login',
    validateLogin(),
    validateRequest,
    userController.login
);

// Protected routes requiring authentication
/**
 * GET /api/users/profile
 * Requirement: User Profile Management - Secure profile retrieval
 */
userRouter.get(
    '/profile',
    authenticate,
    userController.getProfile
);

/**
 * PUT /api/users/profile
 * Requirement: User Profile Management - Profile updates with validation
 */
userRouter.put(
    '/profile',
    authenticate,
    validateProfileUpdate(),
    validateRequest,
    userController.updateProfile
);

/**
 * PUT /api/users/preferences
 * Requirement: User Preferences - Preference management with validation
 */
userRouter.put(
    '/preferences',
    authenticate,
    validatePreferencesUpdate(),
    validateRequest,
    userController.updatePreferences
);

/**
 * PUT /api/users/dietary-restrictions
 * Requirement: User Preferences - Dietary restrictions management
 */
userRouter.put(
    '/dietary-restrictions',
    authenticate,
    validateRequest,
    userController.updateDietaryRestrictions
);

/**
 * DELETE /api/users/account
 * Requirement: User Profile Management - Secure account deletion
 */
userRouter.delete(
    '/account',
    authenticate,
    userController.deleteAccount
);

export default userRouter;