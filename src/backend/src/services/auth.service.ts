// @version jsonwebtoken ^9.0.0
// @version bcrypt ^5.0.1

import { User, UserPreferences } from '../interfaces/user.interface';
import UserModel from '../models/user.model';
import { jwtConfig } from '../config/jwt';
import { AppError, CommonErrors } from '../utils/errors';
import jwt from 'jsonwebtoken';

/**
 * HUMAN TASKS:
 * 1. Configure JWT secret rotation policy in production environment
 * 2. Set up monitoring for failed authentication attempts
 * 3. Configure rate limiting for authentication endpoints
 * 4. Set up email verification service for new user registrations
 * 5. Implement multi-factor authentication setup
 * 6. Configure password strength requirements
 */

/**
 * Interface for user login credentials
 * Requirement: User Authentication - Secure login data structure
 */
interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Interface for new user registration data
 * Requirement: User Authentication - Comprehensive registration data
 */
interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  preferences: UserPreferences;
}

/**
 * Interface for authentication tokens
 * Requirement: Security Protocols - JWT token structure
 */
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Authentication service class handling user authentication and token management
 * Requirements addressed:
 * - User Authentication (5.1): Authentication Service implementation
 * - Security Protocols (9.3.1): JWT + OAuth2.0 based authentication
 * - Data Security (9.2.1): Secure credential handling
 */
export class AuthService {
  private readonly userModel: typeof UserModel;
  private readonly jwtConfig: typeof jwtConfig;

  constructor() {
    this.userModel = UserModel;
    this.jwtConfig = jwtConfig;
  }

  /**
   * Authenticates user credentials and generates JWT tokens
   * Requirements addressed:
   * - User Authentication: Secure login process
   * - Security Protocols: Token-based authentication
   */
  public async login(credentials: LoginCredentials): Promise<AuthTokens> {
    try {
      // Validate credentials format
      if (!credentials.email || !credentials.password) {
        throw CommonErrors.BadRequest('Email and password are required');
      }

      // Find user by email
      const user = await this.userModel.findOne({ email: credentials.email });
      if (!user) {
        throw CommonErrors.Unauthorized({ context: 'Invalid credentials' });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(credentials.password);
      if (!isPasswordValid) {
        throw CommonErrors.Unauthorized({ context: 'Invalid credentials' });
      }

      // Generate tokens
      const tokens = await this.generateAuthTokens(user.id);

      // Update last login timestamp
      await this.userModel.findByIdAndUpdate(user.id, {
        lastLogin: new Date()
      });

      return tokens;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw CommonErrors.InternalServerError({
        context: 'Login failed',
        error: error.message
      });
    }
  }

  /**
   * Creates new user account with secure password hashing
   * Requirements addressed:
   * - User Authentication: Secure registration process
   * - Data Security: Password encryption
   */
  public async register(userData: RegisterData): Promise<User> {
    try {
      // Validate registration data
      if (!userData.email || !userData.password) {
        throw CommonErrors.BadRequest('Email and password are required');
      }

      // Check if email already exists
      const existingUser = await this.userModel.findOne({ email: userData.email });
      if (existingUser) {
        throw CommonErrors.BadRequest('Email already registered');
      }

      // Create new user with hashed password
      const user = new this.userModel({
        email: userData.email,
        passwordHash: userData.password, // Will be hashed by mongoose middleware
        firstName: userData.firstName,
        lastName: userData.lastName,
        preferences: userData.preferences
      });

      // Save user to database
      await user.save();

      // Return user without sensitive data
      const { passwordHash, ...userWithoutPassword } = user.toObject();
      return userWithoutPassword as User;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw CommonErrors.InternalServerError({
        context: 'Registration failed',
        error: error.message
      });
    }
  }

  /**
   * Generates new access token using valid refresh token
   * Requirements addressed:
   * - Security Protocols: Token refresh mechanism
   * - Data Security: Secure token handling
   */
  public async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.jwtConfig.secret) as { userId: string };
      if (!decoded.userId) {
        throw CommonErrors.Unauthorized({ context: 'Invalid refresh token' });
      }

      // Verify user exists
      const user = await this.userModel.findById(decoded.userId);
      if (!user) {
        throw CommonErrors.Unauthorized({ context: 'User not found' });
      }

      // Generate new token pair
      return await this.generateAuthTokens(user.id);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw CommonErrors.Unauthorized({ context: 'Refresh token expired' });
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw CommonErrors.Unauthorized({ context: 'Invalid refresh token' });
      }
      if (error instanceof AppError) throw error;
      throw CommonErrors.InternalServerError({
        context: 'Token refresh failed',
        error: error.message
      });
    }
  }

  /**
   * Verifies JWT token validity and signature
   * Requirements addressed:
   * - Security Protocols: Token validation
   * - Data Security: Secure token verification
   */
  public async verifyToken(token: string): Promise<boolean> {
    try {
      // Verify token signature and expiration
      const decoded = jwt.verify(token, this.jwtConfig.secret, {
        algorithms: this.jwtConfig.allowedAlgorithms
      });

      // Verify token payload
      if (!decoded || typeof decoded !== 'object' || !decoded.userId) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generates access and refresh tokens for a user
   * Requirements addressed:
   * - Security Protocols: Token generation
   * - Data Security: Secure token creation
   */
  private async generateAuthTokens(userId: string): Promise<AuthTokens> {
    // Generate access token
    const accessToken = jwt.sign(
      { userId },
      this.jwtConfig.secret,
      {
        algorithm: this.jwtConfig.algorithm as jwt.Algorithm,
        expiresIn: this.jwtConfig.expiresIn
      }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId },
      this.jwtConfig.secret,
      {
        algorithm: this.jwtConfig.algorithm as jwt.Algorithm,
        expiresIn: this.jwtConfig.refreshExpiresIn
      }
    );

    // Parse expiration time from JWT config
    const expiresIn = parseInt(this.jwtConfig.expiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn
    };
  }
}