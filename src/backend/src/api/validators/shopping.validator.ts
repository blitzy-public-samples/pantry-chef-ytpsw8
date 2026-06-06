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
  // Requirement: Security / Ownership Isolation - reject server-managed fields.
  // These fields are owned by the server (ownership, identity, audit timestamps) and MUST NOT
  // be client-supplied; their presence is rejected with 400 so a caller cannot attempt to
  // reassign ownership or forge identity/audit metadata. This is the validator-layer complement
  // to the controller DTO construction and the ShoppingService allow-list sanitizer (defense in
  // depth against the create/update ownership-drift findings; R3 user scoping).
  body('userId').not().exists().withMessage('userId cannot be set by the client'),
  body('_id').not().exists().withMessage('_id cannot be set by the client'),
  body('id').not().exists().withMessage('id cannot be set by the client'),
  body('createdAt').not().exists().withMessage('createdAt cannot be set by the client'),
  body('updatedAt').not().exists().withMessage('updatedAt cannot be set by the client'),

  // `.isString().bail()` guards the type BEFORE the `.trim()` sanitizer runs: without
  // it, a non-string `name` (e.g. a JSON object `{ "$gt": "" }`) is silently coerced by
  // `.trim()` to the literal `"[object Object]"`, which then passes `isLength(1-100)` and
  // is accepted. The guard rejects any non-string `name` with 400 (defense-in-depth; the
  // operator never reaches Mongo as an operator, but a non-string name is invalid input).
  // Mirrors the existing `recipeIds.*` `.isString()...bail()` convention below.
  body('name')
    .isString()
    .withMessage('Shopping list name must be a string')
    .bail()
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
  // `.isString().bail()` first so a non-string item name is rejected (400) rather
  // than coerced by `.trim()` (same defense-in-depth rationale as the list `name`).
  body('items.*.name')
    .isString()
    .withMessage('Shopping list item name must be a string')
    .bail()
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

  // Requirement: Security / Ownership Isolation - reject server-managed fields on update.
  // Mirrors the create-chain forbids: a client cannot smuggle ownership/identity/audit fields
  // through PUT. Combined with the controller DTO and the service `$set` allow-list, this
  // closes the update-time ownership-drift vector (R3 user scoping).
  body('userId').not().exists().withMessage('userId cannot be set by the client'),
  body('_id').not().exists().withMessage('_id cannot be set by the client'),
  body('id').not().exists().withMessage('id cannot be set by the client'),
  body('createdAt').not().exists().withMessage('createdAt cannot be set by the client'),
  body('updatedAt').not().exists().withMessage('updatedAt cannot be set by the client'),

  body('name')
    .optional()
    .isString()
    .withMessage('Shopping list name must be a string')
    .bail()
    .trim()
    .escape()
    .isLength({ min: 1, max: 100 })
    .withMessage('Shopping list name must be between 1 and 100 characters'),

  body('items').optional().isArray().withMessage('Items must be an array'),

  body('items.*.name')
    .optional()
    .isString()
    .withMessage('Shopping list item name must be a string')
    .bail()
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
// Validates the recipe-driven generation request. `recipeIds` must be a non-empty,
// size-capped array of well-formed MongoDB ObjectIds: generation loads the referenced
// recipes via `RecipeModel` (an ObjectId lookup) and aggregates their trusted
// ingredients, so each id is constrained to the strict 24-hex ObjectId format and
// HTML-escaped before the check. This closes the stored-data / stored-XSS vector
// (CWE-20/CWE-79) where an unconstrained client id could previously reach persistence,
// and the array is capped so one request cannot fan out into an unbounded
// recipe/ingredient query (R10 performance budget). `servings` must be a positive,
// bounded integer. The boolean toggles are optional because the service defaults them.
export const generateShoppingListValidation = [
  body('recipeIds')
    .isArray({ min: 1, max: 50 })
    .withMessage('recipeIds must be an array of 1 to 50 recipe IDs'),

  body('recipeIds.*')
    .isString()
    .withMessage('Each recipe ID must be a string')
    .bail()
    .trim()
    .custom(validateObjectId)
    .withMessage('Each recipe ID must be a valid MongoDB ObjectId'),

  body('servings')
    .isInt({ min: 1, max: 100 })
    .withMessage('Servings must be an integer between 1 and 100'),

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

// Requirement: Data Validation - Delete shopping list validation
// Validates the delete route's `id` path param is a well-formed ObjectId so an invalid id is
// rejected with a 400 (consistent with the other mutating routes) instead of reaching Mongoose
// and surfacing as a CastError/500. Attached to `DELETE /:id` in shopping.routes.ts; the
// controller runs the shared validationResult guard before delegating to the service.
export const deleteShoppingListValidation = [
  param('id').trim().custom(validateObjectId).withMessage('Invalid shopping list ID format'),
];
