// @jest/globals ^29.0.0

import { describe, it, expect } from '@jest/globals';
import {
  validateEmail,
  validatePassword,
  validateLoginCredentials,
  validateSignupCredentials,
  validateRecipe,
  validateInventoryItem
} from '../../src/utils/validation';
import { LoginCredentials, SignupCredentials } from '../../src/interfaces/auth.interface';

/**
 * HUMAN TASKS:
 * 1. Configure test environment variables for password policy
 * 2. Set up test data fixtures for recipes and inventory items
 * 3. Add test cases for additional validation scenarios
 * 4. Configure test coverage thresholds
 */

describe('Email Validation', () => {
  // Requirement: Data Validation - Test email format validation
  it('should validate correct email format', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('user.name+tag@subdomain.example.co.uk')).toBe(true);
  });

  it('should reject invalid email format', () => {
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
    expect(validateEmail('user@.com')).toBe(false);
  });

  it('should reject empty email', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail(' ')).toBe(false);
  });

  it('should reject email exceeding maximum length', () => {
    const longEmail = 'a'.repeat(246) + '@example.com'; // 256 chars
    expect(validateEmail(longEmail)).toBe(false);
  });
});

describe('Password Validation', () => {
  // Requirement: Security Protocols - Test password complexity requirements
  it('should validate password meeting all requirements', () => {
    const result = validatePassword('Test1234!');
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should reject password shorter than 8 characters', () => {
    const result = validatePassword('Test1!');
    expect(result.isValid).toBe(false);
    expect(result.errors.password).toContain('at least 8 characters');
  });

  it('should reject password without uppercase letter', () => {
    const result = validatePassword('test1234!');
    expect(result.isValid).toBe(false);
    expect(result.errors.password).toContain('uppercase letter');
  });

  it('should reject password without lowercase letter', () => {
    const result = validatePassword('TEST1234!');
    expect(result.isValid).toBe(false);
    expect(result.errors.password).toContain('lowercase letter');
  });

  it('should reject password without number', () => {
    const result = validatePassword('TestTest!');
    expect(result.isValid).toBe(false);
    expect(result.errors.password).toContain('number');
  });

  it('should reject password without special character', () => {
    const result = validatePassword('TestTest1');
    expect(result.isValid).toBe(false);
    expect(result.errors.password).toContain('special character');
  });
});

describe('Login Validation', () => {
  // Requirement: Form Validation - Test login form validation
  it('should validate correct login credentials', () => {
    const credentials: LoginCredentials = {
      email: 'user@example.com',
      password: 'Test1234!',
      rememberMe: true
    };
    const result = validateLoginCredentials(credentials);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return errors for invalid email', () => {
    const credentials: LoginCredentials = {
      email: 'invalid-email',
      password: 'Test1234!',
      rememberMe: true
    };
    const result = validateLoginCredentials(credentials);
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  it('should return errors for invalid password', () => {
    const credentials: LoginCredentials = {
      email: 'user@example.com',
      password: 'weak',
      rememberMe: true
    };
    const result = validateLoginCredentials(credentials);
    expect(result.isValid).toBe(false);
    expect(result.errors.password).toBeDefined();
  });

  it('should handle optional rememberMe field', () => {
    const credentials: LoginCredentials = {
      email: 'user@example.com',
      password: 'Test1234!',
      rememberMe: false
    };
    const result = validateLoginCredentials(credentials);
    expect(result.isValid).toBe(true);
  });

  it('should return errors for empty credentials', () => {
    const credentials: LoginCredentials = {
      email: '',
      password: '',
      rememberMe: true
    };
    const result = validateLoginCredentials(credentials);
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBeDefined();
    expect(result.errors.password).toBeDefined();
  });
});

describe('Signup Validation', () => {
  // Requirement: Form Validation - Test signup form validation
  it('should validate correct signup credentials', () => {
    const credentials: SignupCredentials = {
      email: 'user@example.com',
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      firstName: 'John',
      lastName: 'Doe'
    };
    const result = validateSignupCredentials(credentials);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("should return error when passwords don't match", () => {
    const credentials: SignupCredentials = {
      email: 'user@example.com',
      password: 'Test1234!',
      confirmPassword: 'Test1234@',
      firstName: 'John',
      lastName: 'Doe'
    };
    const result = validateSignupCredentials(credentials);
    expect(result.isValid).toBe(false);
    expect(result.errors.confirmPassword).toContain('do not match');
  });

  it('should return error for invalid email', () => {
    const credentials: SignupCredentials = {
      email: 'invalid-email',
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      firstName: 'John',
      lastName: 'Doe'
    };
    const result = validateSignupCredentials(credentials);
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  it('should return error for weak password', () => {
    const credentials: SignupCredentials = {
      email: 'user@example.com',
      password: 'weak',
      confirmPassword: 'weak',
      firstName: 'John',
      lastName: 'Doe'
    };
    const result = validateSignupCredentials(credentials);
    expect(result.isValid).toBe(false);
    expect(result.errors.password).toBeDefined();
  });

  it('should return error for missing firstName', () => {
    const credentials: SignupCredentials = {
      email: 'user@example.com',
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      firstName: '',
      lastName: 'Doe'
    };
    const result = validateSignupCredentials(credentials);
    expect(result.isValid).toBe(false);
    expect(result.errors.firstName).toBeDefined();
  });

  it('should return error for missing lastName', () => {
    const credentials: SignupCredentials = {
      email: 'user@example.com',
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      firstName: 'John',
      lastName: ''
    };
    const result = validateSignupCredentials(credentials);
    expect(result.isValid).toBe(false);
    expect(result.errors.lastName).toBeDefined();
  });

  it('should return errors for missing required fields', () => {
    const credentials: SignupCredentials = {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: ''
    };
    const result = validateSignupCredentials(credentials);
    expect(result.isValid).toBe(false);
    expect(Object.keys(result.errors).length).toBeGreaterThan(0);
  });
});

describe('Recipe Validation', () => {
  // Requirement: Data Validation - Test recipe data validation
  it('should validate valid recipe data with all required fields', () => {
    const recipe = {
      name: 'Test Recipe',
      description: 'Test description',
      ingredients: [
        { name: 'Ingredient 1', quantity: 1, unit: 'cup' }
      ],
      difficulty: 'MEDIUM',
      prepTime: 10,
      cookTime: 20,
      steps: ['Step 1']
    };
    const result = validateRecipe(recipe);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return error for invalid recipe name length/format', () => {
    const recipe = {
      name: 'a'.repeat(51),
      description: 'Test description',
      ingredients: [
        { name: 'Ingredient 1', quantity: 1, unit: 'cup' }
      ],
      difficulty: 'MEDIUM',
      prepTime: 10,
      cookTime: 20,
      steps: ['Step 1']
    };
    const result = validateRecipe(recipe);
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('should return error for empty ingredients array', () => {
    const recipe = {
      name: 'Test Recipe',
      description: 'Test description',
      ingredients: [],
      difficulty: 'MEDIUM',
      prepTime: 10,
      cookTime: 20,
      steps: ['Step 1']
    };
    const result = validateRecipe(recipe);
    expect(result.isValid).toBe(false);
    expect(result.errors.ingredients).toBeDefined();
  });

  it('should return error for invalid ingredient data', () => {
    const recipe = {
      name: 'Test Recipe',
      description: 'Test description',
      ingredients: [
        { name: '', quantity: -1, unit: '' }
      ],
      difficulty: 'MEDIUM',
      prepTime: 10,
      cookTime: 20,
      steps: ['Step 1']
    };
    const result = validateRecipe(recipe);
    expect(result.isValid).toBe(false);
    expect(result.errors['ingredients[0].name']).toBeDefined();
    expect(result.errors['ingredients[0].quantity']).toBeDefined();
    expect(result.errors['ingredients[0].unit']).toBeDefined();
  });
});

describe('Inventory Validation', () => {
  // Requirement: Data Validation - Test inventory item validation
  it('should validate valid inventory item with all fields', () => {
    const item = {
      name: 'Test Item',
      quantity: 1,
      unit: 'piece',
      storageLocation: 'PANTRY',
      category: 'Dry Goods',
      expirationDate: new Date(Date.now() + 86400000).toISOString() // Tomorrow
    };
    const result = validateInventoryItem(item);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return error for invalid quantity', () => {
    const item = {
      name: 'Test Item',
      quantity: -1,
      unit: 'piece',
      storageLocation: 'PANTRY',
      category: 'Dry Goods',
      expirationDate: new Date(Date.now() + 86400000).toISOString()
    };
    const result = validateInventoryItem(item);
    expect(result.isValid).toBe(false);
    expect(result.errors.quantity).toBeDefined();
  });

  it('should return error for invalid expiration date format', () => {
    const item = {
      name: 'Test Item',
      quantity: 1,
      unit: 'piece',
      storageLocation: 'PANTRY',
      category: 'Dry Goods',
      expirationDate: 'invalid-date'
    };
    const result = validateInventoryItem(item);
    expect(result.isValid).toBe(false);
    expect(result.errors.expirationDate).toBeDefined();
  });

  it('should return error for past expiration date', () => {
    const item = {
      name: 'Test Item',
      quantity: 1,
      unit: 'piece',
      storageLocation: 'PANTRY',
      category: 'Dry Goods',
      expirationDate: new Date(Date.now() - 86400000).toISOString() // Yesterday
    };
    const result = validateInventoryItem(item);
    expect(result.isValid).toBe(false);
    expect(result.errors.expirationDate).toContain('past');
  });
});