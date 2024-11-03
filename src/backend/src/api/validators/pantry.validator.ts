// @version express-validator ^6.14.0
// @version validator ^13.7.0

/*
HUMAN TASKS:
1. Configure rate limiting thresholds for pantry operations
2. Set up monitoring for validation failures
3. Review and update storage location enum values periodically
4. Configure expiration date validation thresholds
5. Verify unit validation patterns with product team
*/

import { body, param } from 'express-validator';
import validator from 'validator';
import { StorageLocation, Pantry, PantryItem } from '../../interfaces/pantry.interface';
import { validateIngredientQuantity, createValidationMiddleware } from '../../utils/validators';

// Requirement: Data Validation - Input validation for preventing malicious data
const validateObjectId = (value: string): boolean => {
    return validator.isMongoId(validator.escape(value));
};

// Requirement: Digital Pantry Management - Pantry creation validation
export const createPantryValidation = [
    body('name')
        .trim()
        .escape()
        .isLength({ min: 3, max: 50 })
        .withMessage('Pantry name must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9\s-_]+$/)
        .withMessage('Pantry name can only contain letters, numbers, spaces, hyphens and underscores'),
    
    body('locations')
        .isArray({ min: 1 })
        .withMessage('At least one storage location is required')
        .custom((locations: string[]) => {
            return locations.every(location => 
                Object.values(StorageLocation).includes(location as StorageLocation)
            );
        })
        .withMessage('Invalid storage location provided'),

    body('userId')
        .trim()
        .custom(validateObjectId)
        .withMessage('Invalid user ID format')
];

// Requirement: Digital Pantry Management - Pantry update validation
export const updatePantryValidation = [
    param('id')
        .trim()
        .custom(validateObjectId)
        .withMessage('Invalid pantry ID format'),
    
    body('name')
        .optional()
        .trim()
        .escape()
        .isLength({ min: 3, max: 50 })
        .withMessage('Pantry name must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9\s-_]+$/)
        .withMessage('Pantry name can only contain letters, numbers, spaces, hyphens and underscores'),
    
    body('locations')
        .optional()
        .isArray({ min: 1 })
        .withMessage('At least one storage location is required')
        .custom((locations: string[]) => {
            return locations.every(location => 
                Object.values(StorageLocation).includes(location as StorageLocation)
            );
        })
        .withMessage('Invalid storage location provided')
];

// Requirement: Inventory Management - Pantry item addition validation
export const addItemValidation = [
    param('pantryId')
        .trim()
        .custom(validateObjectId)
        .withMessage('Invalid pantry ID format'),
    
    body('ingredientId')
        .trim()
        .custom(validateObjectId)
        .withMessage('Invalid ingredient ID format'),
    
    body('quantity')
        .isFloat({ min: 0.01 })
        .withMessage('Quantity must be greater than 0'),
    
    body('unit')
        .trim()
        .custom((unit: string, { req }) => {
            return validateIngredientQuantity(req.body.quantity, unit);
        })
        .withMessage('Invalid measurement unit'),
    
    body('location')
        .trim()
        .custom((location: string) => 
            Object.values(StorageLocation).includes(location as StorageLocation)
        )
        .withMessage('Invalid storage location'),
    
    body('expirationDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid expiration date format')
        .custom((date: string) => {
            const expirationDate = new Date(date);
            const now = new Date();
            return expirationDate > now;
        })
        .withMessage('Expiration date must be in the future')
];

// Requirement: Inventory Management - Pantry item update validation
export const updateItemValidation = [
    param('pantryId')
        .trim()
        .custom(validateObjectId)
        .withMessage('Invalid pantry ID format'),
    
    param('itemId')
        .trim()
        .custom(validateObjectId)
        .withMessage('Invalid item ID format'),
    
    body('quantity')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('Quantity must be greater than 0'),
    
    body('unit')
        .optional()
        .trim()
        .custom((unit: string, { req }) => {
            const quantity = req.body.quantity || 1; // Use existing quantity if not provided
            return validateIngredientQuantity(quantity, unit);
        })
        .withMessage('Invalid measurement unit'),
    
    body('location')
        .optional()
        .trim()
        .custom((location: string) => 
            Object.values(StorageLocation).includes(location as StorageLocation)
        )
        .withMessage('Invalid storage location'),
    
    body('expirationDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid expiration date format')
        .custom((date: string) => {
            const expirationDate = new Date(date);
            const now = new Date();
            return expirationDate > now;
        })
        .withMessage('Expiration date must be in the future')
];

// Helper function to validate pantry item data
function validatePantryItem(itemData: PantryItem): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!validateObjectId(itemData.ingredientId)) {
        errors.push('Invalid ingredient ID');
    }

    if (!validateIngredientQuantity(itemData.quantity, itemData.unit)) {
        errors.push('Invalid quantity or unit');
    }

    if (!Object.values(StorageLocation).includes(itemData.location)) {
        errors.push('Invalid storage location');
    }

    // Validate expiration date if provided
    if (itemData.expirationDate) {
        const expirationDate = new Date(itemData.expirationDate);
        const now = new Date();
        if (isNaN(expirationDate.getTime())) {
            errors.push('Invalid expiration date format');
        } else if (expirationDate <= now) {
            errors.push('Expiration date must be in the future');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Helper function to validate pantry update data
function validatePantryUpdate(updateData: Partial<Pantry>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate ID
    if (!validateObjectId(updateData.id)) {
        errors.push('Invalid pantry ID');
    }

    // Validate name if provided
    if (updateData.name !== undefined) {
        const sanitizedName = validator.escape(updateData.name.trim());
        if (sanitizedName.length < 3 || sanitizedName.length > 50) {
            errors.push('Pantry name must be between 3 and 50 characters');
        }
        if (!/^[a-zA-Z0-9\s-_]+$/.test(sanitizedName)) {
            errors.push('Pantry name can only contain letters, numbers, spaces, hyphens and underscores');
        }
    }

    // Validate locations if provided
    if (updateData.locations !== undefined) {
        if (!Array.isArray(updateData.locations) || updateData.locations.length === 0) {
            errors.push('At least one storage location is required');
        } else if (!updateData.locations.every(location => 
            Object.values(StorageLocation).includes(location)
        )) {
            errors.push('Invalid storage location provided');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}