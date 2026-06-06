// @version express-validator ^6.14.0
// @version validator ^13.7.0

/*
HUMAN TASKS:
1. Confirm shopping list name length bounds (1-100) with the product team
2. Verify shopping list item categories align with inventory/ingredient categories
3. Review default servings bounds for recipe-driven list generation
*/

import { body, param } from 'express-validator';
import validator from 'validator';

// Requirement: Data Validation - Input validation for preventing malicious data
// Local helper that validates a route parameter is a well-formed MongoDB ObjectId.
// `validator.escape` neutralizes any HTML-significant characters before the strict
// 24-hex-character ObjectId check, mirroring the pantry validator convention exactly.
const validateObjectId = (value: string): boolean => {
  return validator.isMongoId(validator.escape(value));
};

// Requirement: Shopping List Management - Create shopping list validation
// Validates the payload for creating a new shopping list. `name` is required and
// sanitized; `items` is an optional array whose element shape is validated only when
// present. Item identifiers are NOT validated here because they are server-assigned.
export const createShoppingListValidation = [
  body('name')
    .trim()
    .escape()
    .isLength({ min: 1, max: 100 })
    .withMessage('Shopping list name must be between 1 and 100 characters'),

  body('items').optional().isArray().withMessage('Items must be an array'),

  // Element-shape checks (only evaluated when items[] is present).
  // Every user-controlled item string is trimmed AND HTML-escaped so that
  // markup-like values can neither be persisted nor later replayed by the
  // web/iOS clients (stored-XSS / dirty-data defense), mirroring the top-level
  // `name` sanitizer above and the pantry/recipe validator conventions.
  body('items.*.name')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Shopping list item name is required')
    .isLength({ max: 100 })
    .withMessage('Item name cannot exceed 100 characters'),

  body('items.*.quantity')
    .isFloat({ min: 0 })
    .withMessage('Item quantity must be a non-negative number'),

  // Optional element strings aligned to IShoppingListItem. Each is optional so
  // partially-specified items still pass, but when present it is trimmed,
  // escaped, and length-bounded to neutralize malicious or oversized input.
  body('items.*.unit')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 50 })
    .withMessage('Item unit cannot exceed 50 characters'),

  body('items.*.category')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 100 })
    .withMessage('Item category cannot exceed 100 characters'),

  body('items.*.notes')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 500 })
    .withMessage('Item notes cannot exceed 500 characters'),

  body('items.*.recipeId')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 100 })
    .withMessage('Item recipeId cannot exceed 100 characters'),

  body('items.*.recipeName')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 200 })
    .withMessage('Item recipeName cannot exceed 200 characters'),

  body('items.*.checked').optional().isBoolean().withMessage('Item checked flag must be a boolean'),
];

// Requirement: Shopping List Management - Update shopping list validation
// Validates updates to an existing shopping list. The list `id` route param must be a
// valid ObjectId. All body fields are optional to support partial updates; when present
// they enforce the same shape as creation, with item element checks made optional too.
export const updateShoppingListValidation = [
  param('id').trim().custom(validateObjectId).withMessage('Invalid shopping list ID format'),

  body('name')
    .optional()
    .trim()
    .escape()
    .isLength({ min: 1, max: 100 })
    .withMessage('Shopping list name must be between 1 and 100 characters'),

  body('items').optional().isArray().withMessage('Items must be an array'),

  body('items.*.name')
    .optional()
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Shopping list item name is required')
    .isLength({ max: 100 })
    .withMessage('Item name cannot exceed 100 characters'),

  body('items.*.quantity')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Item quantity must be a non-negative number'),

  // Optional item strings on partial update: trimmed, escaped, and
  // length-bounded so the same sanitization as creation applies whenever the
  // field is present, preventing stored-XSS / dirty-data via PUT.
  body('items.*.unit')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 50 })
    .withMessage('Item unit cannot exceed 50 characters'),

  body('items.*.category')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 100 })
    .withMessage('Item category cannot exceed 100 characters'),

  body('items.*.notes')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 500 })
    .withMessage('Item notes cannot exceed 500 characters'),

  body('items.*.recipeId')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 100 })
    .withMessage('Item recipeId cannot exceed 100 characters'),

  body('items.*.recipeName')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 200 })
    .withMessage('Item recipeName cannot exceed 200 characters'),

  body('items.*.checked').optional().isBoolean().withMessage('Item checked flag must be a boolean'),
];

// Requirement: Shopping List Generation - Generate shopping list validation
// Validates the recipe-driven generation request. At least one recipe ID is required;
// each element is validated as a non-empty string (NOT as a Mongo ObjectId, since the
// controller resolves recipes by their domain identifiers). `servings` must be a
// positive integer. The boolean toggles are optional because the service defaults them.
export const generateShoppingListValidation = [
  body('recipeIds').isArray({ min: 1 }).withMessage('At least one recipe ID is required'),

  body('recipeIds.*')
    .isString()
    .withMessage('Each recipe ID must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Recipe ID cannot be empty'),

  body('servings')
    .isInt({ min: 1 })
    .withMessage('Servings must be an integer greater than or equal to 1'),

  body('excludeInventoryItems')
    .optional()
    .isBoolean()
    .withMessage('excludeInventoryItems must be a boolean'),

  body('mergeDuplicates').optional().isBoolean().withMessage('mergeDuplicates must be a boolean'),
];

// Requirement: Shopping List Management - Toggle item checked state validation
// Validates the toggle route's two path parameters: the parent list `id` and the target
// `itemId`. Both must be well-formed ObjectIds; distinct messages aid client debugging.
export const toggleItemValidation = [
  param('id').trim().custom(validateObjectId).withMessage('Invalid shopping list ID format'),

  param('itemId').trim().custom(validateObjectId).withMessage('Invalid item ID format'),
];
