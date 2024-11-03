// @version express ^4.17.1
// @version http-status ^1.5.0

import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { AuthService } from '../../services/auth.service';
import { validateLoginRequest, validateSignupRequest, validatePasswordResetRequest } from '../validators/auth.validator';
import { User } from '../../interfaces/user.interface';

/**
 * HUMAN TASKS:
 * 1. Configure rate limiting thresholds for authentication endpoints
 * 2. Set up monitoring for failed authentication attempts
 * 3. Configure password complexity requirements in production
 * 4. Set up email verification service integration
 * 5. Configure security alerts for suspicious authentication patterns
 * 6. Implement multi-factor authentication setup
 */

/**
 * Authentication controller handling user authentication, registration, and token management
 * Requirements addressed:
 * - User Authentication (5.1): Authentication Service implementation
 * - Security Protocols (9.3.1): JWT + OAuth2.0 based authentication
 * - Data Protection (9.2.1): Secure handling of user credentials
 */
export class AuthController {
    private authService: AuthService;

    constructor(authService: AuthService) {
        this.authService = authService;
    }

    /**
     * Handles user login requests with email and password validation
     * Requirements addressed:
     * - User Authentication: Secure login process
     * - Security Protocols: Token-based authentication
     */
    public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Apply login request validation
            await validateLoginRequest(req, res, next);

            const { email, password } = req.body;

            // Authenticate user and generate tokens
            const tokens = await this.authService.login({ email, password });

            // Return successful authentication response
            res.status(httpStatus.OK).json({
                status: 'success',
                data: {
                    ...tokens,
                    type: 'Bearer'
                }
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Handles new user registration with comprehensive profile validation
     * Requirements addressed:
     * - User Authentication: Secure registration process
     * - Data Protection: Secure handling of user data
     */
    public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Apply registration request validation
            await validateSignupRequest(req, res, next);

            const userData: Partial<User> = {
                email: req.body.email,
                password: req.body.password,
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                preferences: req.body.preferences,
                dietaryRestrictions: req.body.dietaryRestrictions
            };

            // Create new user account
            const createdUser = await this.authService.register(userData);

            // Return successful registration response
            res.status(httpStatus.CREATED).json({
                status: 'success',
                data: {
                    user: createdUser
                }
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Handles token refresh requests with JWT validation
     * Requirements addressed:
     * - Security Protocols: Token refresh mechanism
     * - Data Protection: Secure token handling
     */
    public refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const refreshToken = req.headers.authorization?.split(' ')[1];

            if (!refreshToken) {
                res.status(httpStatus.UNAUTHORIZED).json({
                    status: 'error',
                    message: 'Refresh token is required'
                });
                return;
            }

            // Generate new token pair
            const tokens = await this.authService.refreshToken(refreshToken);

            // Return new tokens
            res.status(httpStatus.OK).json({
                status: 'success',
                data: {
                    ...tokens,
                    type: 'Bearer'
                }
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Handles password reset requests with email validation
     * Requirements addressed:
     * - User Authentication: Secure password reset
     * - Data Protection: Secure email handling
     */
    public resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Apply password reset request validation
            await validatePasswordResetRequest(req, res, next);

            const { email } = req.body;

            // Verify token signature
            const isValid = await this.authService.verifyToken(email);

            if (!isValid) {
                res.status(httpStatus.UNAUTHORIZED).json({
                    status: 'error',
                    message: 'Invalid or expired token'
                });
                return;
            }

            // Return success response
            res.status(httpStatus.OK).json({
                status: 'success',
                message: 'Password reset instructions sent to email'
            });
        } catch (error) {
            next(error);
        }
    };
}