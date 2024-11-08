// @ts-check
import { validateEmail, validatePassword } from '../../utils/validators';
import { ValidationError } from '../../utils/errors';
import { VALIDATION_CONSTANTS } from '../../utils/constants';
import { User } from '../../interfaces/user.interface';
import { body, validationResult } from 'express-validator'; // ^6.14.0
import { Request, Response, NextFunction } from 'express';

/*
HUMAN TASKS:
1. Configure rate limiting thresholds for authentication endpoints
2. Set up monitoring for failed authentication attempts
3. Configure password complexity requirements in production
4. Set up email verification service integration
5. Configure security alerts for suspicious authentication patterns
*/

// Requirement: User Authentication - Login request validation with security best practices
export async function validateLoginRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Apply validation rules
    await Promise.all([
      body('email')
        .trim()
        .escape()
        .isEmail()
        .withMessage('Invalid email format')
        .custom((email: string) => {
          if (!validateEmail(email)) {
            throw new Error('Email validation failed');
          }
          return true;
        })
        .run(req),

      body('password')
        .isLength({ min: VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH })
        .withMessage(
          `Password must be at least ${VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH} characters`
        )
        .run(req),
    ]);

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(
        'Login validation failed',
        errors.array().map((error: any) => ({
          field: error.param,
          constraint: error.msg,
        }))
      );
    }

    next();
  } catch (error: any) {
    next(error);
  }
}

// Requirement: User Authentication - Signup request validation with comprehensive profile validation
export async function validateSignupRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Apply validation rules
    await Promise.all([
      // Email validation
      body('email')
        .trim()
        .escape()
        .isEmail()
        .withMessage('Invalid email format')
        .custom((email: string) => {
          if (!validateEmail(email)) {
            throw new Error('Email validation failed');
          }
          return true;
        })
        .run(req),

      // Password validation with security requirements
      body('password')
        .custom((password: string) => {
          const validation = validatePassword(password);
          if (!validation.isValid) {
            throw new Error(validation.message);
          }
          return true;
        })
        .run(req),

      // Profile information validation
      body('firstName')
        .trim()
        .escape()
        .isLength({ min: 1, max: 50 })
        .withMessage('First name is required and must be between 1-50 characters')
        .run(req),

      body('lastName')
        .trim()
        .escape()
        .isLength({ min: 1, max: 50 })
        .withMessage('Last name is required and must be between 1-50 characters')
        .run(req),

      // Optional preferences validation
      body('preferences.theme')
        .optional()
        .isIn(['LIGHT', 'DARK', 'SYSTEM'])
        .withMessage('Invalid theme selection')
        .run(req),

      body('preferences.measurementSystem')
        .optional()
        .isIn(['METRIC', 'IMPERIAL'])
        .withMessage('Invalid measurement system')
        .run(req),

      body('preferences.skillLevel')
        .optional()
        .isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
        .withMessage('Invalid skill level')
        .run(req),

      // Dietary restrictions validation
      body('dietaryRestrictions')
        .optional()
        .isArray()
        .custom((restrictions: string[]) => {
          const validRestrictions = [
            'VEGETARIAN',
            'VEGAN',
            'GLUTEN_FREE',
            'DAIRY_FREE',
            'NUT_FREE',
            'HALAL',
            'KOSHER',
          ];
          return restrictions.every((r) => validRestrictions.includes(r));
        })
        .withMessage('Invalid dietary restrictions')
        .run(req),
    ]);

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(
        'Signup validation failed',
        errors.array().map((error: any) => ({
          field: error.param,
          constraint: error.msg,
        }))
      );
    }

    next();
  } catch (error: any) {
    next(error);
  }
}

// Requirement: User Authentication - Password reset request validation
export async function validatePasswordResetRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Apply validation rules
    await Promise.all([
      body('email')
        .trim()
        .escape()
        .isEmail()
        .withMessage('Invalid email format')
        .custom((email: string) => {
          if (!validateEmail(email)) {
            throw new Error('Email validation failed');
          }
          return true;
        })
        .run(req),
    ]);

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(
        'Password reset validation failed',
        errors.array().map((error: any) => ({
          field: error.param,
          constraint: error.msg,
        }))
      );
    }

    next();
  } catch (error: any) {
    next(error);
  }
}

// Requirement: User Authentication - New password validation with security requirements
export async function validateNewPasswordRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Apply validation rules
    await Promise.all([
      // Reset token validation
      body('token')
        .trim()
        .notEmpty()
        .withMessage('Reset token is required')
        .isLength({ min: 32, max: 128 })
        .withMessage('Invalid reset token format')
        .run(req),

      // New password validation
      body('newPassword')
        .custom((password: string) => {
          const validation = validatePassword(password);
          if (!validation.isValid) {
            throw new Error(validation.message);
          }
          return true;
        })
        .run(req),

      // Password confirmation validation
      body('confirmPassword')
        .custom((confirmPassword: string, { req }) => {
          if (confirmPassword !== req.body.newPassword) {
            throw new Error('Password confirmation does not match');
          }
          return true;
        })
        .run(req),
    ]);

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(
        'New password validation failed',
        errors.array().map((error: any) => ({
          field: error.param,
          constraint: error.msg,
        }))
      );
    }

    next();
  } catch (error: any) {
    next(error);
  }
}
