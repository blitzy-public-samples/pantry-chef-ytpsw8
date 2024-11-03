// @version mongoose ^6.0.0

import { id } from '../interfaces/recipe.interface';

/**
 * HUMAN TASKS:
 * 1. Verify that analytics collection intervals align with business reporting requirements
 * 2. Ensure monitoring thresholds match infrastructure capacity planning
 * 3. Confirm that all required metrics are being tracked for compliance reporting
 */

/**
 * Interface for tracking comprehensive user engagement metrics
 * Addresses requirement: Usage Tracking - Analytics Service for monitoring user engagement
 */
export interface UserActivityMetrics {
    userId: string;
    recipeViews: number;
    recipeSaves: number;
    ingredientScans: number;
    shoppingListsCreated: number;
    lastActive: Date;
}

/**
 * Interface for system performance metrics tracking
 * Addresses requirement: System Metrics - Performance, reliability, and resource metrics tracking
 */
export interface SystemPerformanceMetrics {
    apiResponseTime: number;      // in milliseconds, target <200ms
    imageProcessingTime: number;  // in milliseconds, target <3s
    concurrentUsers: number;
    errorRate: number;           // as percentage
    cpuUsage: number;           // as percentage, threshold <70%
    memoryUsage: number;        // as percentage, threshold <80%
    timestamp: Date;
}

/**
 * Interface for tracking recipe engagement and performance metrics
 * Addresses requirement: Analytics and Reporting - Tracking system metrics and user behavior
 */
export interface RecipeAnalytics {
    recipeId: string;
    viewCount: number;
    saveCount: number;
    averageRating: number;
    completionCount: number;
    updatedAt: Date;
}

/**
 * Interface for tracking image recognition performance and accuracy metrics
 * Addresses requirement: Analytics and Reporting - System metrics tracking
 */
export interface IngredientRecognitionMetrics {
    totalScans: number;
    successfulScans: number;
    averageConfidence: number;   // as percentage
    manualCorrections: number;
    processingTime: number;      // in milliseconds
}

/**
 * Enum defining time intervals for analytics data aggregation
 * Addresses requirement: Analytics and Reporting - Tracking system metrics
 */
export enum AnalyticsTimeframe {
    HOURLY = 'HOURLY',
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY'
}