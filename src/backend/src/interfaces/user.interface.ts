// @version mongoose ^6.0.0

import { Recipe } from './recipe.interface';
import { Pantry } from './pantry.interface';

/**
 * HUMAN TASKS:
 * 1. Ensure password hashing configuration aligns with security requirements
 * 2. Verify that supported languages list is complete for internationalization
 * 3. Configure notification service integration for user alerts
 * 4. Set up email verification process for new user registrations
 */

/**
 * Enum for application theme options
 * Addresses requirement: User Preference Management - Application customization
 */
export enum Theme {
    LIGHT = 'LIGHT',
    DARK = 'DARK',
    SYSTEM = 'SYSTEM'
}

/**
 * Enum for measurement system preferences
 * Addresses requirement: User Preference Management - International user support
 */
export enum MeasurementSystem {
    METRIC = 'METRIC',
    IMPERIAL = 'IMPERIAL'
}

/**
 * Enum for user cooking skill levels
 * Addresses requirement: User Preference Management - Recipe recommendations
 */
export enum SkillLevel {
    BEGINNER = 'BEGINNER',
    INTERMEDIATE = 'INTERMEDIATE',
    ADVANCED = 'ADVANCED'
}

/**
 * Enum for dietary restrictions
 * Addresses requirement: Dietary Restrictions - Recipe filtering
 */
export enum DietaryRestriction {
    VEGETARIAN = 'VEGETARIAN',
    VEGAN = 'VEGAN',
    GLUTEN_FREE = 'GLUTEN_FREE',
    DAIRY_FREE = 'DAIRY_FREE',
    NUT_FREE = 'NUT_FREE',
    HALAL = 'HALAL',
    KOSHER = 'KOSHER'
}

/**
 * Interface for user notification preferences
 * Addresses requirement: User Preference Management - Notification settings
 */
export interface NotificationSettings {
    expirationAlerts: boolean;
    lowStockAlerts: boolean;
    recipeRecommendations: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
}

/**
 * Interface for user preferences and settings
 * Addresses requirement: User Preference Management - Application customization
 */
export interface UserPreferences {
    theme: Theme;
    language: string;
    measurementSystem: MeasurementSystem;
    notificationSettings: NotificationSettings;
    cuisinePreferences: string[];
    skillLevel: SkillLevel;
}

/**
 * Main interface for user data structure
 * Addresses requirements:
 * - User Authentication - Identity management
 * - User Profile Management - Comprehensive user data
 * - User Preference Management - Personalization
 * - Dietary Restrictions - Dietary preferences
 */
export interface User {
    id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    profileImage: string;
    preferences: UserPreferences;
    dietaryRestrictions: DietaryRestriction[];
    savedRecipes: string[];  // Array of Recipe IDs
    pantryIds: string[];     // Array of Pantry IDs
    lastLogin: Date;
    createdAt: Date;
    updatedAt: Date;
}