/**
 * HUMAN TASKS:
 * 1. Configure JWT secret and expiration in environment variables
 * 2. Set up email verification service integration
 * 3. Configure password reset email templates
 * 4. Set up monitoring for failed login attempts
 * 5. Configure user data backup schedule
 */

import bcrypt from 'bcrypt'; // ^5.0.1
import jwt from 'jsonwebtoken'; // ^9.0.0
import { User, UserPreferences, DietaryRestriction } from '../interfaces/user.interface';
import UserModel from '../models/user.model';
import { logger } from '../utils/logger';
import { AppError, CommonErrors } from '../utils/errors';
import { validateEmail, validatePassword } from '../utils/validators';

export class UserService {
  private UserModel: typeof UserModel;
  private logger: typeof logger;

  constructor() {
    this.UserModel = UserModel;
    this.logger = logger;
  }

  /**
   * Creates a new user account with secure password hashing
   * Addresses requirement: User Authentication - Secure user registration
   */
  public async createUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    preferences?: UserPreferences;
  }): Promise<User> {
    try {
      // Validate email format
      if (!validateEmail(userData.email)) {
        throw new AppError('Invalid email format', 400, 'INVALID_EMAIL', { email: userData.email });
      }

      // Validate password strength
      const passwordValidation = validatePassword(userData.password);
      if (!passwordValidation.isValid) {
        throw new AppError(passwordValidation.message, 400, 'INVALID_PASSWORD');
      }

      // Check if email already exists
      const existingUser = await this.UserModel.findOne({ email: userData.email });
      if (existingUser) {
        throw new AppError('Email already registered', 409, 'EMAIL_EXISTS', {
          email: userData.email,
        });
      }

      // Create user document
      const user = await this.UserModel.create({
        email: userData.email,
        passwordHash: userData.password, // Will be hashed by mongoose middleware
        firstName: userData.firstName,
        lastName: userData.lastName,
        preferences: userData.preferences || {},
        dietaryRestrictions: [],
        savedRecipes: [],
        pantryIds: [],
      });

      this.logger.info('User created successfully', {
        userId: user.id,
        email: user.email,
      });

      // Remove sensitive data before returning
      const userObject = user.toObject();
      delete userObject.passwordHash;
      return userObject;
    } catch (error: any) {
      this.logger.error('Error creating user', {
        error: error.message,
        email: userData.email,
      });
      throw error;
    }
  }

  /**
   * Authenticates user credentials and generates JWT token
   * Addresses requirement: User Authentication - Secure login process
   */
  public async authenticateUser(
    email: string,
    password: string
  ): Promise<{ token: string; user: User }> {
    try {
      // Find user by email
      const user = await this.UserModel.findOne({ email });
      if (!user) {
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET!, {
        expiresIn: process.env.JWT_EXPIRATION || '24h',
      });

      // Update last login timestamp
      await this.UserModel.findByIdAndUpdate(user.id, {
        lastLogin: new Date(),
      });

      this.logger.info('User authenticated successfully', {
        userId: user.id,
        email: user.email,
      });

      // Remove sensitive data before returning
      const userObject = user.toObject();
      delete userObject.passwordHash;
      return { token, user: userObject };
    } catch (error: any) {
      this.logger.error('Authentication error', {
        error: error.message,
        email,
      });
      throw error;
    }
  }

  /**
   * Updates user profile information with validation
   * Addresses requirement: User Profile Management - Profile updates
   */
  public async updateUserProfile(userId: string, updateData: Partial<User>): Promise<User> {
    try {
      // Prevent updating sensitive fields
      const sanitizedUpdateData = { ...updateData };
      delete sanitizedUpdateData.passwordHash;
      delete sanitizedUpdateData.email;

      // Update user document
      const updatedUser = await this.UserModel.findByIdAndUpdate(
        userId,
        { $set: sanitizedUpdateData },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        throw CommonErrors.NotFound('User', { userId });
      }

      this.logger.info('User profile updated', {
        userId,
        updatedFields: Object.keys(sanitizedUpdateData),
      });

      // Remove sensitive data before returning
      const userObject = updatedUser.toObject();
      delete userObject.passwordHash;
      return userObject;
    } catch (error: any) {
      this.logger.error('Error updating user profile', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Updates user preferences and application settings
   * Addresses requirement: User Preferences - Preference management
   */
  public async updateUserPreferences(userId: string, preferences: UserPreferences): Promise<User> {
    try {
      const updatedUser = await this.UserModel.findByIdAndUpdate(
        userId,
        { $set: { preferences } },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        throw CommonErrors.NotFound('User', { userId });
      }

      this.logger.info('User preferences updated', {
        userId,
        preferences,
      });

      // Remove sensitive data before returning
      const userObject = updatedUser.toObject();
      delete userObject.passwordHash;
      return userObject;
    } catch (error: any) {
      this.logger.error('Error updating user preferences', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Updates user dietary restrictions for recipe filtering
   * Addresses requirement: User Preferences - Dietary restrictions
   */
  public async updateDietaryRestrictions(
    userId: string,
    restrictions: DietaryRestriction[]
  ): Promise<User> {
    try {
      // Validate dietary restrictions
      const validRestrictions = restrictions.every((restriction) =>
        Object.values(DietaryRestriction).includes(restriction)
      );

      if (!validRestrictions) {
        throw new AppError('Invalid dietary restrictions', 400, 'INVALID_RESTRICTIONS', {
          restrictions,
        });
      }

      const updatedUser = await this.UserModel.findByIdAndUpdate(
        userId,
        { $set: { dietaryRestrictions: restrictions } },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        throw CommonErrors.NotFound('User', { userId });
      }

      this.logger.info('User dietary restrictions updated', {
        userId,
        restrictions,
      });

      // Remove sensitive data before returning
      const userObject = updatedUser.toObject();
      delete userObject.passwordHash;
      return userObject;
    } catch (error: any) {
      this.logger.error('Error updating dietary restrictions', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Retrieves user by ID with error handling
   * Addresses requirement: User Profile Management - Profile retrieval
   */
  public async getUserById(userId: string): Promise<User> {
    try {
      const user = await this.UserModel.findById(userId);
      if (!user) {
        throw CommonErrors.NotFound('User', { userId });
      }

      // Remove sensitive data before returning
      const userObject = user.toObject();
      delete userObject.passwordHash;
      return userObject;
    } catch (error: any) {
      this.logger.error('Error retrieving user', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Deletes user account and associated data
   * Addresses requirement: User Profile Management - Account deletion
   */
  public async deleteUser(userId: string): Promise<void> {
    try {
      const user = await this.UserModel.findById(userId);
      if (!user) {
        throw CommonErrors.NotFound('User', { userId });
      }

      // Delete user document
      await this.UserModel.findByIdAndDelete(userId);

      this.logger.info('User deleted successfully', {
        userId,
        email: user.email,
      });
    } catch (error: any) {
      this.logger.error('Error deleting user', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }
}
