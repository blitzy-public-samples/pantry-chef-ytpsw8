// @version validator ^13.7.0

import isEmail from 'validator';
import { 
  LoginCredentials, 
  SignupCredentials 
} from '../interfaces/auth.interface';
import { 
  Recipe, 
  RecipeDifficulty, 
  RecipeIngredient 
} from '../interfaces/recipe.interface';
import { 
  InventoryItem, 
  StorageLocation 
} from '../interfaces/inventory.interface';

/**
 * HUMAN TASKS:
 * 1. Configure password policy settings in environment variables
 * 2. Set up validation error message translations
 * 3. Verify recipe difficulty levels match backend validation
 * 4. Confirm inventory storage locations match physical setup
 */

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Requirement: Data Validation - Input validation for security and integrity
const EMAIL_MAX_LENGTH = 255;
const PASSWORD_MIN_LENGTH = 8;
const NAME_MAX_LENGTH = 50;
const DESCRIPTION_MAX_LENGTH = 1000;

/**
 * Validates email format and requirements
 * Requirement: Form Validation - Client-side validation for user input forms
 */
export const validateEmail = (email: string): boolean => {
  if (!email || email.trim().length === 0) {
    return false;
  }
  if (email.length > EMAIL_MAX_LENGTH) {
    return false;
  }
  return isEmail.isEmail(email);
};

/**
 * Validates password strength and requirements
 * Requirement: Security Protocols/Access Control Measures - Password security
 */
export const validatePassword = (password: string): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`;
  }
  if (!/[A-Z]/.test(password)) {
    errors.password = 'Password must contain at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    errors.password = 'Password must contain at least one lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    errors.password = 'Password must contain at least one number';
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.password = 'Password must contain at least one special character';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates login form data
 * Requirement: Form Validation - Login form validation
 */
export const validateLoginCredentials = (credentials: LoginCredentials): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!validateEmail(credentials.email)) {
    errors.email = 'Please enter a valid email address';
  }

  const passwordValidation = validatePassword(credentials.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.errors.password;
  }

  if (typeof credentials.rememberMe !== 'boolean') {
    errors.rememberMe = 'Remember me must be a boolean value';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates signup form data
 * Requirement: Form Validation - Signup form validation
 */
export const validateSignupCredentials = (credentials: SignupCredentials): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!validateEmail(credentials.email)) {
    errors.email = 'Please enter a valid email address';
  }

  const passwordValidation = validatePassword(credentials.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.errors.password;
  }

  if (credentials.password !== credentials.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (!credentials.firstName || credentials.firstName.trim().length === 0) {
    errors.firstName = 'First name is required';
  }
  if (credentials.firstName.length > NAME_MAX_LENGTH) {
    errors.firstName = `First name cannot exceed ${NAME_MAX_LENGTH} characters`;
  }

  if (!credentials.lastName || credentials.lastName.trim().length === 0) {
    errors.lastName = 'Last name is required';
  }
  if (credentials.lastName.length > NAME_MAX_LENGTH) {
    errors.lastName = `Last name cannot exceed ${NAME_MAX_LENGTH} characters`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates recipe data before submission
 * Requirement: Data Validation - Recipe data validation
 */
export const validateRecipe = (recipe: Recipe): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!recipe.name || recipe.name.trim().length === 0) {
    errors.name = 'Recipe name is required';
  }
  if (recipe.name.length > NAME_MAX_LENGTH) {
    errors.name = `Recipe name cannot exceed ${NAME_MAX_LENGTH} characters`;
  }

  if (!recipe.description || recipe.description.trim().length === 0) {
    errors.description = 'Recipe description is required';
  }
  if (recipe.description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`;
  }

  if (!recipe.ingredients || recipe.ingredients.length === 0) {
    errors.ingredients = 'At least one ingredient is required';
  } else {
    recipe.ingredients.forEach((ingredient: RecipeIngredient, index: number) => {
      if (!ingredient.name || ingredient.name.trim().length === 0) {
        errors[`ingredients[${index}].name`] = 'Ingredient name is required';
      }
      if (ingredient.quantity <= 0) {
        errors[`ingredients[${index}].quantity`] = 'Quantity must be greater than 0';
      }
      if (!ingredient.unit || ingredient.unit.trim().length === 0) {
        errors[`ingredients[${index}].unit`] = 'Unit is required';
      }
    });
  }

  if (!Object.values(RecipeDifficulty).includes(recipe.difficulty)) {
    errors.difficulty = 'Invalid difficulty level';
  }

  if (recipe.prepTime <= 0) {
    errors.prepTime = 'Preparation time must be greater than 0';
  }

  if (recipe.cookTime <= 0) {
    errors.cookTime = 'Cooking time must be greater than 0';
  }

  if (!recipe.steps || recipe.steps.length === 0) {
    errors.steps = 'At least one step is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates inventory item data
 * Requirement: Data Validation - Inventory data validation
 */
export const validateInventoryItem = (item: InventoryItem): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!item.name || item.name.trim().length === 0) {
    errors.name = 'Item name is required';
  }
  if (item.name.length > NAME_MAX_LENGTH) {
    errors.name = `Item name cannot exceed ${NAME_MAX_LENGTH} characters`;
  }

  if (item.quantity <= 0) {
    errors.quantity = 'Quantity must be greater than 0';
  }

  if (!item.unit || item.unit.trim().length === 0) {
    errors.unit = 'Unit is required';
  }

  if (!Object.values(StorageLocation).includes(item.storageLocation)) {
    errors.storageLocation = 'Invalid storage location';
  }

  if (!item.category || item.category.trim().length === 0) {
    errors.category = 'Category is required';
  }

  const expirationDate = new Date(item.expirationDate);
  if (isNaN(expirationDate.getTime())) {
    errors.expirationDate = 'Invalid expiration date';
  } else if (expirationDate < new Date()) {
    errors.expirationDate = 'Expiration date cannot be in the past';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};