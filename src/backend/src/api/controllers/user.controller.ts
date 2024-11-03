/**
 * HUMAN TASKS:
 * 1. Configure JWT secret and expiration in environment variables
 * 2. Set up CloudWatch monitoring for authentication failures
 * 3. Configure rate limiting for authentication endpoints
 * 4. Set up email verification service integration
 * 5. Configure user data backup schedule
 */

import { Request, Response, NextFunction } from 'express';
import { UserService } from '../../services/user.service';
import { User, UserPreferences, DietaryRestriction } from '../../interfaces/user.interface';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export class UserController {
    private userService: UserService;

    constructor(userService: UserService) {
        this.userService = userService;
    }

    /**
     * Handles user registration with input validation
     * Addresses requirement: User Authentication - Secure user registration
     */
    public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email, password, firstName, lastName, preferences } = req.body;

            // Validate required fields
            if (!email || !password || !firstName || !lastName) {
                throw new AppError(
                    'Missing required fields',
                    400,
                    'VALIDATION_ERROR',
                    { fields: ['email', 'password', 'firstName', 'lastName'] }
                );
            }

            const user = await this.userService.createUser({
                email,
                password,
                firstName,
                lastName,
                preferences
            });

            logger.info('User registered successfully', {
                userId: user.id,
                email: user.email
            });

            res.status(201).json({
                success: true,
                data: user
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Handles user login with credential validation
     * Addresses requirement: User Authentication - Secure login process
     */
    public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                throw new AppError(
                    'Missing credentials',
                    400,
                    'VALIDATION_ERROR',
                    { fields: ['email', 'password'] }
                );
            }

            const { token, user } = await this.userService.authenticateUser(email, password);

            logger.info('User logged in successfully', {
                userId: user.id,
                email: user.email
            });

            res.status(200).json({
                success: true,
                data: {
                    token,
                    user
                }
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Handles user profile updates with validation
     * Addresses requirement: User Profile Management - Profile updates
     */
    public updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req as any).user.id;
            const updateData: Partial<User> = req.body;

            // Prevent updating sensitive fields
            delete updateData.passwordHash;
            delete updateData.email;

            const updatedUser = await this.userService.updateUserProfile(userId, updateData);

            logger.info('User profile updated', {
                userId,
                updatedFields: Object.keys(updateData)
            });

            res.status(200).json({
                success: true,
                data: updatedUser
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Handles user preferences updates
     * Addresses requirement: User Preferences - Preference management
     */
    public updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req as any).user.id;
            const preferences: UserPreferences = req.body;

            const updatedUser = await this.userService.updateUserPreferences(userId, preferences);

            logger.info('User preferences updated', {
                userId,
                preferences
            });

            res.status(200).json({
                success: true,
                data: updatedUser
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Handles dietary restrictions updates with enum validation
     * Addresses requirement: User Preferences - Dietary restrictions
     */
    public updateDietaryRestrictions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req as any).user.id;
            const { restrictions } = req.body;

            if (!Array.isArray(restrictions)) {
                throw new AppError(
                    'Invalid restrictions format',
                    400,
                    'VALIDATION_ERROR',
                    { restrictions }
                );
            }

            const updatedUser = await this.userService.updateDietaryRestrictions(userId, restrictions);

            logger.info('User dietary restrictions updated', {
                userId,
                restrictions
            });

            res.status(200).json({
                success: true,
                data: updatedUser
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Handles user profile retrieval with authentication
     * Addresses requirement: User Profile Management - Profile retrieval
     */
    public getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req as any).user.id;

            const user = await this.userService.getUserById(userId);

            logger.info('User profile retrieved', {
                userId
            });

            res.status(200).json({
                success: true,
                data: user
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Handles user account deletion with authentication
     * Addresses requirement: User Profile Management - Account deletion
     */
    public deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req as any).user.id;

            await this.userService.deleteUser(userId);

            logger.info('User account deleted', {
                userId
            });

            res.status(200).json({
                success: true,
                message: 'Account deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    };
}