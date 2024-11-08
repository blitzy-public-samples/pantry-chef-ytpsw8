// @ts-check
import { ValidationError } from './errors';
import { VALIDATION_CONSTANTS } from './constants';
import { Recipe } from '../interfaces/recipe.interface';
import validator from 'validator'; // ^13.7.0
import { validationResult, ValidationChain } from 'express-validator'; // ^6.14.0
import { Request, Response, NextFunction } from 'express';

/*
HUMAN TASKS:
1. Configure rate limiting thresholds in production environment
2. Set up monitoring for validation failures
3. Configure validation error reporting
4. Review and update password complexity requirements periodically
5. Verify email validation patterns with security team
*/

// Requirement: Data Validation - Email validation with security best practices
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Sanitize email input
  const sanitizedEmail = validator.trim(validator.escape(email));

  // Test against email regex pattern and additional validations
  return (
    VALIDATION_CONSTANTS.EMAIL_REGEX.test(sanitizedEmail) &&
    validator.isEmail(sanitizedEmail) &&
    validator.isLength(sanitizedEmail, { max: 254 }) // RFC 5321
  );
}

// Requirement: User Management - Password validation with security best practices
export function validatePassword(password: string): {
  isValid: boolean;
  message: string;
} {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Password is required',
    };
  }

  const checks = [
    {
      test: password.length >= VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH,
      message: `Password must be at least ${VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH} characters long`,
    },
    {
      test: /[A-Z]/.test(password),
      message: 'Password must contain at least one uppercase letter',
    },
    {
      test: /[a-z]/.test(password),
      message: 'Password must contain at least one lowercase letter',
    },
    {
      test: /[0-9]/.test(password),
      message: 'Password must contain at least one number',
    },
    {
      test: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      message: 'Password must contain at least one special character',
    },
    {
      test: !/(.)\1{2,}/.test(password),
      message: 'Password cannot contain repeating characters',
    },
  ];

  const failedCheck = checks.find((check) => !check.test);

  return failedCheck
    ? { isValid: false, message: failedCheck.message }
    : { isValid: true, message: 'Password is valid' };
}

// Requirement: Recipe Management - Comprehensive recipe validation
export function validateRecipe(recipe: Recipe): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate required fields
  if (!recipe.name || !validator.isLength(recipe.name, { min: 1, max: 200 })) {
    errors.push('Recipe name is required and must be between 1-200 characters');
  }

  if (!recipe.description || !validator.isLength(recipe.description, { min: 10, max: 1000 })) {
    errors.push('Recipe description must be between 10-1000 characters');
  }

  // Validate ingredients array
  if (
    !Array.isArray(recipe.ingredients) ||
    recipe.ingredients.length === 0 ||
    recipe.ingredients.length > VALIDATION_CONSTANTS.MAX_INGREDIENTS
  ) {
    errors.push(
      `Recipe must have between 1 and ${VALIDATION_CONSTANTS.MAX_INGREDIENTS} ingredients`
    );
  } else {
    recipe.ingredients.forEach((ingredient, index) => {
      if (!ingredient.quantity || ingredient.quantity <= 0) {
        errors.push(`Invalid quantity for ingredient at position ${index + 1}`);
      }
      if (!ingredient.unit || typeof ingredient.unit !== 'string') {
        errors.push(`Invalid unit for ingredient at position ${index + 1}`);
      }
    });
  }

  // Validate cooking instructions
  if (!Array.isArray(recipe.instructions) || recipe.instructions.length === 0) {
    errors.push('Recipe must have at least one instruction step');
  } else {
    recipe.instructions.forEach((step, index) => {
      if (!step.instruction || !validator.isLength(step.instruction, { min: 1, max: 500 })) {
        errors.push(`Invalid instruction at step ${index + 1}`);
      }
    });
  }

  // Validate numerical values
  if (!recipe.prepTime || recipe.prepTime < 0 || !Number.isInteger(recipe.prepTime)) {
    errors.push('Invalid preparation time');
  }

  if (!recipe.cookTime || recipe.cookTime < 0 || !Number.isInteger(recipe.cookTime)) {
    errors.push('Invalid cooking time');
  }

  if (!recipe.servings || recipe.servings < 1 || !Number.isInteger(recipe.servings)) {
    errors.push('Invalid number of servings');
  }

  // Sanitize text inputs for XSS prevention
  if (recipe.name) {
    recipe.name = validator.escape(recipe.name);
  }
  if (recipe.description) {
    recipe.description = validator.escape(recipe.description);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Requirement: Recipe Management - Ingredient quantity validation
export function validateIngredientQuantity(quantity: number, unit: string): boolean {
  if (typeof quantity !== 'number' || quantity <= 0) {
    return false;
  }

  const validUnits = [
    'g',
    'kg',
    'oz',
    'lb', // Weight
    'ml',
    'l',
    'cup',
    'tbsp',
    'tsp',
    'fl oz', // Volume
    'piece',
    'whole',
    'slice',
    'pinch', // Count/Other
  ];

  return validUnits.includes(unit.toLowerCase());
}

// Requirement: Data Validation - Express validation middleware factory
export function createValidationMiddleware(validationRules: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Apply all validation rules
    await Promise.all(validationRules.map((validation) => validation.run(req)));

    // Get validation results
    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    // Format validation errors
    const formattedErrors = errors.array().map((error) => ({
      field: error.type,
      constraint: error.msg,
    }));

    // Throw validation error with formatted messages
    throw new ValidationError('Validation failed', formattedErrors);
  };
}

// Helper function to sanitize user input
function sanitizeInput(input: string): string {
  return validator.escape(validator.trim(input));
}

// Helper function to normalize units
function normalizeUnit(unit: string): string {
  const unitMappings: { [key: string]: string } = {
    gram: 'g',
    grams: 'g',
    kilogram: 'kg',
    kilograms: 'kg',
    ounce: 'oz',
    ounces: 'oz',
    pound: 'lb',
    pounds: 'lb',
    milliliter: 'ml',
    milliliters: 'ml',
    liter: 'l',
    liters: 'l',
    tablespoon: 'tbsp',
    tablespoons: 'tbsp',
    teaspoon: 'tsp',
    teaspoons: 'tsp',
  };

  const normalizedUnit = unit.toLowerCase().trim();
  return unitMappings[normalizedUnit] || normalizedUnit;
}
