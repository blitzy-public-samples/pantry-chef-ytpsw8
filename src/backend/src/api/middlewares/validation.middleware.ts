// @ts-check
import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import { body, validationResult, ValidationChain } from 'express-validator'; // ^6.14.0
import validator from 'validator'; // ^13.7.0
import { 
    validateEmail, 
    validatePassword, 
    validateRecipe, 
    validateIngredientQuantity 
} from '../../utils/validators';
import { ValidationError } from '../../utils/errors';

/*
HUMAN TASKS:
1. Configure validation error monitoring alerts in production environment
2. Set up validation failure rate thresholds and alerts
3. Review and update validation rules periodically with security team
4. Configure validation error reporting dashboards
5. Set up validation performance monitoring
*/

// Requirement: Data Validation - Main validation middleware for Express routes
export async function validateRequest(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        // Extract validation rules based on request path and method
        const validationRules = getValidationRules(req.path, req.method);
        
        // Apply validation rules
        await Promise.all(validationRules.map(validation => validation.run(req)));
        
        // Get validation results
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            // Format validation errors with context for monitoring
            const formattedErrors = errors.array().map(error => ({
                field: error.param,
                constraint: error.msg
            }));
            
            throw new ValidationError('Request validation failed', formattedErrors);
        }
        
        // Sanitize request data to prevent XSS and injection attacks
        sanitizeRequestData(req);
        
        next();
    } catch (error) {
        next(error);
    }
}

// Requirement: Security Best Practices - Authentication data validation
export async function validateAuthData(authData: any): Promise<boolean> {
    const errors: Array<{ field: string; constraint: string }> = [];
    
    // Sanitize input data for security
    const sanitizedEmail = validator.trim(validator.escape(authData.email || ''));
    
    // Validate email format
    if (!validateEmail(sanitizedEmail)) {
        errors.push({
            field: 'email',
            constraint: 'Invalid email format'
        });
    }
    
    // Validate password strength
    const passwordValidation = validatePassword(authData.password || '');
    if (!passwordValidation.isValid) {
        errors.push({
            field: 'password',
            constraint: passwordValidation.message
        });
    }
    
    // Check for required authentication fields
    if (!authData.email || !authData.password) {
        errors.push({
            field: 'credentials',
            constraint: 'Email and password are required'
        });
    }
    
    // Validate additional auth parameters if present
    if (authData.rememberMe !== undefined && typeof authData.rememberMe !== 'boolean') {
        errors.push({
            field: 'rememberMe',
            constraint: 'Remember me must be a boolean value'
        });
    }
    
    if (errors.length > 0) {
        throw new ValidationError('Authentication validation failed', errors);
    }
    
    return true;
}

// Requirement: Data Validation - Recipe data validation
export async function validateRecipeData(recipeData: any): Promise<boolean> {
    // Sanitize recipe text inputs
    const sanitizedRecipe = {
        ...recipeData,
        name: validator.escape(recipeData.name || ''),
        description: validator.escape(recipeData.description || ''),
        instructions: recipeData.instructions?.map((instruction: any) => ({
            ...instruction,
            instruction: validator.escape(instruction.instruction || '')
        }))
    };
    
    // Validate recipe structure
    const recipeValidation = validateRecipe(sanitizedRecipe);
    if (!recipeValidation.isValid) {
        throw new ValidationError('Recipe validation failed', 
            recipeValidation.errors.map(error => ({
                field: 'recipe',
                constraint: error
            }))
        );
    }
    
    // Validate ingredient quantities and measurements
    const ingredientErrors: Array<{ field: string; constraint: string }> = [];
    sanitizedRecipe.ingredients?.forEach((ingredient: any, index: number) => {
        if (!validateIngredientQuantity(ingredient.quantity, ingredient.unit)) {
            ingredientErrors.push({
                field: `ingredients[${index}]`,
                constraint: 'Invalid ingredient quantity or unit'
            });
        }
    });
    
    if (ingredientErrors.length > 0) {
        throw new ValidationError('Ingredient validation failed', ingredientErrors);
    }
    
    // Validate numerical values
    const numericalErrors: Array<{ field: string; constraint: string }> = [];
    
    if (!Number.isInteger(sanitizedRecipe.prepTime) || sanitizedRecipe.prepTime < 0) {
        numericalErrors.push({
            field: 'prepTime',
            constraint: 'Preparation time must be a positive integer'
        });
    }
    
    if (!Number.isInteger(sanitizedRecipe.cookTime) || sanitizedRecipe.cookTime < 0) {
        numericalErrors.push({
            field: 'cookTime',
            constraint: 'Cooking time must be a positive integer'
        });
    }
    
    if (!Number.isInteger(sanitizedRecipe.servings) || sanitizedRecipe.servings < 1) {
        numericalErrors.push({
            field: 'servings',
            constraint: 'Servings must be a positive integer'
        });
    }
    
    if (numericalErrors.length > 0) {
        throw new ValidationError('Numerical values validation failed', numericalErrors);
    }
    
    return true;
}

// Helper function to get validation rules based on request path and method.
// Rules are express-validator `ValidationChain`s so each exposes the `.run(req)`
// contract that validateRequest awaits above. (The previous implementation pushed
// raw `validator` library calls, which return strings/booleans and have no `.run()`
// method — they neither type-checked against ValidationChain nor worked at runtime.)
function getValidationRules(path: string, method: string): ValidationChain[] {
    const rules: ValidationChain[] = [];

    // Path-specific validation rules. Each field rule is optional so it only
    // validates the field when present, leaving route-level validators (e.g.
    // validateSignupRequest / validateLoginRequest) as the authoritative,
    // required-field validation; these act as a defensive sanitizing layer.
    if (path.includes('/auth')) {
        rules.push(
            body('email')
                .optional()
                .isEmail()
                .withMessage('Invalid email format'),
            body('password')
                .optional()
                .isLength({ min: 8 })
                .withMessage('Password must be at least 8 characters long')
        );
    }

    if (path.includes('/recipes') && method === 'POST') {
        rules.push(
            body('name')
                .optional()
                .trim()
                .isLength({ min: 1 })
                .withMessage('Name must not be empty')
                .escape()
        );
    }

    return rules;
}

// Helper function to sanitize request data
function sanitizeRequestData(req: Request): void {
    // Sanitize query parameters
    for (const key in req.query) {
        if (typeof req.query[key] === 'string') {
            req.query[key] = validator.escape(req.query[key] as string);
        }
    }
    
    // Sanitize body data
    if (req.body && typeof req.body === 'object') {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = validator.escape(req.body[key]);
            }
        }
    }
    
    // Sanitize URL parameters
    for (const key in req.params) {
        if (typeof req.params[key] === 'string') {
            req.params[key] = validator.escape(req.params[key]);
        }
    }
}