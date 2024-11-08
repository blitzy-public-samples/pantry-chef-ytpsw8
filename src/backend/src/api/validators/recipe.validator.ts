// @ts-check
import { body, query, param } from 'express-validator'; // ^6.14.0
import { Recipe, RecipeDifficulty } from '../../interfaces/recipe.interface';
import { validateRecipe, createValidationMiddleware } from '../../utils/validators';
import { ValidationError } from '../../utils/errors';

/*
HUMAN TASKS:
1. Configure rate limiting thresholds for recipe endpoints in production
2. Set up monitoring for recipe validation failures
3. Review and update allowed cuisine types list periodically
4. Verify image URL validation patterns with security team
5. Configure maximum allowed recipe size limits
*/

// Constants for recipe validation
const MAX_RECIPE_NAME_LENGTH = 200;
const MAX_RECIPE_DESCRIPTION_LENGTH = 1000;
const MAX_INGREDIENTS = 50;
const MAX_INSTRUCTIONS = 30;
const MAX_TAGS = 10;
const MAX_PREP_TIME = 720; // 12 hours in minutes
const MAX_COOK_TIME = 1440; // 24 hours in minutes
const MAX_SERVINGS = 100;
const ALLOWED_CUISINES = [
  'Italian',
  'Chinese',
  'Japanese',
  'Indian',
  'Mexican',
  'French',
  'Thai',
  'Mediterranean',
  'American',
  'Korean',
];

// Requirement: Recipe Management - Comprehensive recipe data validation
export const validateCreateRecipe = () => {
  return [
    // Basic recipe information validation
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Recipe name is required')
      .isLength({ max: MAX_RECIPE_NAME_LENGTH })
      .withMessage(`Recipe name cannot exceed ${MAX_RECIPE_NAME_LENGTH} characters`)
      .escape(),

    body('description')
      .trim()
      .notEmpty()
      .withMessage('Recipe description is required')
      .isLength({ max: MAX_RECIPE_DESCRIPTION_LENGTH })
      .withMessage(`Description cannot exceed ${MAX_RECIPE_DESCRIPTION_LENGTH} characters`)
      .escape(),

    // Ingredients validation
    body('ingredients')
      .isArray()
      .withMessage('Ingredients must be an array')
      .notEmpty()
      .withMessage('At least one ingredient is required')
      .custom((ingredients) => ingredients.length <= MAX_INGREDIENTS)
      .withMessage(`Cannot exceed ${MAX_INGREDIENTS} ingredients`),

    body('ingredients.*.ingredientId').isMongoId().withMessage('Invalid ingredient ID'),

    body('ingredients.*.quantity')
      .isFloat({ min: 0.01 })
      .withMessage('Quantity must be a positive number'),

    body('ingredients.*.unit').trim().notEmpty().withMessage('Unit is required').escape(),

    // Cooking instructions validation
    body('instructions')
      .isArray()
      .withMessage('Instructions must be an array')
      .notEmpty()
      .withMessage('At least one instruction step is required')
      .custom((instructions) => instructions.length <= MAX_INSTRUCTIONS)
      .withMessage(`Cannot exceed ${MAX_INSTRUCTIONS} instructions`),

    body('instructions.*.stepNumber')
      .isInt({ min: 1 })
      .withMessage('Step number must be a positive integer'),

    body('instructions.*.instruction')
      .trim()
      .notEmpty()
      .withMessage('Instruction step cannot be empty')
      .escape(),

    body('instructions.*.duration')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Duration must be a non-negative integer'),

    // Timing and servings validation
    body('prepTime')
      .isInt({ min: 1, max: MAX_PREP_TIME })
      .withMessage(`Preparation time must be between 1 and ${MAX_PREP_TIME} minutes`),

    body('cookTime')
      .isInt({ min: 1, max: MAX_COOK_TIME })
      .withMessage(`Cooking time must be between 1 and ${MAX_COOK_TIME} minutes`),

    body('servings')
      .isInt({ min: 1, max: MAX_SERVINGS })
      .withMessage(`Servings must be between 1 and ${MAX_SERVINGS}`),

    // Classification validation
    body('difficulty')
      .isIn(Object.values(RecipeDifficulty))
      .withMessage('Invalid difficulty level'),

    body('cuisine').optional().trim().isIn(ALLOWED_CUISINES).withMessage('Invalid cuisine type'),

    body('tags')
      .optional()
      .isArray()
      .custom((tags) => tags.length <= MAX_TAGS)
      .withMessage(`Cannot exceed ${MAX_TAGS} tags`),

    body('tags.*').trim().notEmpty().withMessage('Tags cannot be empty').escape(),

    // Media validation
    body('imageUrl')
      .optional()
      .trim()
      .isURL({ protocols: ['https'] })
      .withMessage('Image URL must be a secure HTTPS URL'),

    // Nutritional information validation
    body('nutritionalInfo').optional().isObject().withMessage('Nutritional info must be an object'),

    body('nutritionalInfo.servingSize')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Serving size cannot be empty')
      .escape(),

    body('nutritionalInfo.calories')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Calories must be a non-negative number'),

    body('nutritionalInfo.protein')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Protein must be a non-negative number'),

    body('nutritionalInfo.carbohydrates')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Carbohydrates must be a non-negative number'),

    body('nutritionalInfo.fat')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Fat must be a non-negative number'),
  ];
};

// Requirement: Recipe Management - Partial recipe update validation
export const validateUpdateRecipe = () => {
  return [
    param('id').isMongoId().withMessage('Invalid recipe ID'),

    // All fields are optional for updates but must follow the same validation rules
    body('name')
      .optional()
      .trim()
      .isLength({ max: MAX_RECIPE_NAME_LENGTH })
      .withMessage(`Recipe name cannot exceed ${MAX_RECIPE_NAME_LENGTH} characters`)
      .escape(),

    body('description')
      .optional()
      .trim()
      .isLength({ max: MAX_RECIPE_DESCRIPTION_LENGTH })
      .withMessage(`Description cannot exceed ${MAX_RECIPE_DESCRIPTION_LENGTH} characters`)
      .escape(),

    body('ingredients')
      .optional()
      .isArray()
      .custom((ingredients) => !ingredients || ingredients.length <= MAX_INGREDIENTS)
      .withMessage(`Cannot exceed ${MAX_INGREDIENTS} ingredients`),

    body('instructions')
      .optional()
      .isArray()
      .custom((instructions) => !instructions || instructions.length <= MAX_INSTRUCTIONS)
      .withMessage(`Cannot exceed ${MAX_INSTRUCTIONS} instructions`),

    // Ensure at least one field is being updated
    body().custom((body) => {
      if (Object.keys(body).length === 0) {
        throw new Error('At least one field must be provided for update');
      }
      return true;
    }),
  ];
};

// Requirement: Recipe Management - Recipe search query validation
export const validateRecipeQuery = () => {
  return [
    query('search').optional().trim().escape(),

    query('cuisine').optional().trim().isIn(ALLOWED_CUISINES).withMessage('Invalid cuisine type'),

    query('difficulty')
      .optional()
      .isIn(Object.values(RecipeDifficulty))
      .withMessage('Invalid difficulty level'),

    query('prepTimeMax')
      .optional()
      .isInt({ min: 1, max: MAX_PREP_TIME })
      .withMessage(`Maximum prep time must be between 1 and ${MAX_PREP_TIME} minutes`),

    query('cookTimeMax')
      .optional()
      .isInt({ min: 1, max: MAX_COOK_TIME })
      .withMessage(`Maximum cook time must be between 1 and ${MAX_COOK_TIME} minutes`),

    query('ingredients')
      .optional()
      .custom((value) => {
        if (value) {
          const ingredients = value.split(',');
          return ingredients.every((id: any) => /^[0-9a-fA-F]{24}$/.test(id));
        }
        return true;
      })
      .withMessage('Invalid ingredient ID format'),

    query('tags')
      .optional()
      .custom((value) => {
        if (value) {
          const tags = value.split(',');
          return tags.length <= MAX_TAGS;
        }
        return true;
      })
      .withMessage(`Cannot search for more than ${MAX_TAGS} tags`),

    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page number must be a positive integer'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),

    query('sort')
      .optional()
      .isIn(['rating', 'prepTime', 'cookTime', 'createdAt'])
      .withMessage('Invalid sort field'),

    query('order').optional().isIn(['asc', 'desc']).withMessage('Invalid sort order'),
  ];
};

// Requirement: Recipe Management - Recipe rating validation
export const validateRecipeRating = () => {
  return [
    param('id').isMongoId().withMessage('Invalid recipe ID'),

    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),

    body('comment')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Comment cannot exceed 500 characters')
      .escape(),

    // Custom validation to ensure user hasn't already rated
    body().custom(async (_, { req }) => {
      const recipe = await validateRecipe(req.body as Recipe);
      if (!recipe.isValid) {
        throw new ValidationError(
          'Invalid recipe data',
          recipe.errors.map((error) => ({
            field: 'recipe',
            constraint: error,
          }))
        );
      }
      return true;
    }),
  ];
};

// Export validation middleware factory for reuse
export const createRecipeValidationMiddleware = createValidationMiddleware;
