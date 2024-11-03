// @ts-check
import { body, ValidationChain } from 'express-validator'; // ^6.14.0
import { validateEmail, validatePassword } from '../../utils/validators';
import { VALIDATION_CONSTANTS } from '../../utils/constants';
import { 
    Theme, 
    MeasurementSystem, 
    SkillLevel, 
    DietaryRestriction 
} from '../../interfaces/user.interface';

/*
HUMAN TASKS:
1. Configure email service for verification emails
2. Set up password policy in accordance with security requirements
3. Configure supported languages list in user preferences
4. Review and update dietary restriction options periodically
5. Set up monitoring for failed validation attempts
*/

/**
 * Validates user registration requests
 * Addresses requirements:
 * - User Authentication - Input validation for registration
 * - Data Security - Preventing malicious data and ensuring data integrity
 */
export const validateRegistration = (): ValidationChain[] => [
    // Email validation
    body('email')
        .trim()
        .isEmail()
        .matches(VALIDATION_CONSTANTS.EMAIL_REGEX)
        .custom(validateEmail)
        .withMessage('Invalid email format')
        .normalizeEmail(),

    // Password validation
    body('password')
        .isLength({ min: VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH })
        .custom(validatePassword)
        .withMessage('Password does not meet security requirements'),

    // Name validation
    body('firstName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .matches(/^[a-zA-Z\s-']+$/)
        .withMessage('First name must contain only letters, spaces, hyphens and apostrophes')
        .escape(),

    body('lastName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .matches(/^[a-zA-Z\s-']+$/)
        .withMessage('Last name must contain only letters, spaces, hyphens and apostrophes')
        .escape(),

    // Optional profile image validation
    body('profileImage')
        .optional()
        .isURL()
        .withMessage('Profile image must be a valid URL')
];

/**
 * Validates user login requests
 * Addresses requirements:
 * - User Authentication - Secure login validation
 * - Data Security - Input sanitization
 */
export const validateLogin = (): ValidationChain[] => [
    body('email')
        .trim()
        .custom(validateEmail)
        .withMessage('Invalid email format')
        .normalizeEmail(),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

/**
 * Validates profile update requests
 * Addresses requirements:
 * - User Profile Management - Profile data validation
 * - Data Security - XSS prevention
 */
export const validateProfileUpdate = (): ValidationChain[] => [
    // Optional profile fields validation
    body('firstName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .matches(/^[a-zA-Z\s-']+$/)
        .withMessage('First name must contain only letters, spaces, hyphens and apostrophes')
        .escape(),

    body('lastName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .matches(/^[a-zA-Z\s-']+$/)
        .withMessage('Last name must contain only letters, spaces, hyphens and apostrophes')
        .escape(),

    body('profileImage')
        .optional()
        .isURL()
        .withMessage('Profile image must be a valid URL'),

    // Dietary restrictions validation
    body('dietaryRestrictions')
        .optional()
        .isArray()
        .custom((restrictions: string[]) => {
            return restrictions.every(restriction => 
                Object.values(DietaryRestriction).includes(restriction as DietaryRestriction)
            );
        })
        .withMessage('Invalid dietary restriction value')
];

/**
 * Validates user preferences update
 * Addresses requirements:
 * - User Profile Management - Preference validation
 * - Data Security - Enum validation
 */
export const validatePreferencesUpdate = (): ValidationChain[] => [
    // Theme validation
    body('preferences.theme')
        .optional()
        .isIn(Object.values(Theme))
        .withMessage('Invalid theme selection'),

    // Language validation
    body('preferences.language')
        .optional()
        .isLocale()
        .withMessage('Invalid language code'),

    // Measurement system validation
    body('preferences.measurementSystem')
        .optional()
        .isIn(Object.values(MeasurementSystem))
        .withMessage('Invalid measurement system'),

    // Notification settings validation
    body('preferences.notificationSettings')
        .optional()
        .isObject()
        .custom((settings: any) => {
            const requiredKeys = [
                'expirationAlerts',
                'lowStockAlerts',
                'recipeRecommendations',
                'emailNotifications',
                'pushNotifications'
            ];
            return requiredKeys.every(key => 
                typeof settings[key] === 'boolean'
            );
        })
        .withMessage('Invalid notification settings format'),

    // Cuisine preferences validation
    body('preferences.cuisinePreferences')
        .optional()
        .isArray()
        .custom((cuisines: string[]) => {
            return cuisines.every(cuisine => 
                typeof cuisine === 'string' && 
                cuisine.length >= 2 && 
                cuisine.length <= 50
            );
        })
        .withMessage('Invalid cuisine preferences format'),

    // Skill level validation
    body('preferences.skillLevel')
        .optional()
        .isIn(Object.values(SkillLevel))
        .withMessage('Invalid skill level')
];

/**
 * Validates password change requests
 * Addresses requirements:
 * - User Authentication - Password security
 * - Data Security - Password validation
 */
export const validatePasswordChange = (): ValidationChain[] => [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),

    body('newPassword')
        .isLength({ min: VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH })
        .custom(validatePassword)
        .withMessage('New password does not meet security requirements')
        .custom((value, { req }) => {
            if (value === req.body.currentPassword) {
                throw new Error('New password must be different from current password');
            }
            return true;
        }),

    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Password confirmation does not match new password');
            }
            return true;
        })
];