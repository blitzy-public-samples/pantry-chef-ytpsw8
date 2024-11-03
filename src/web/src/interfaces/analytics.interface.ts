/**
 * HUMAN TASKS:
 * 1. Configure analytics service endpoints in API gateway
 * 2. Set up analytics event processing pipeline in backend
 * 3. Configure analytics data retention policies
 * 4. Set up analytics dashboard access permissions
 */

// Import analytics configuration constants
// @version: constants.ts from web/src/config
import { ANALYTICS_CONFIG } from '../config/constants';

/**
 * Requirement: Analytics and Reporting (1.1 System Overview/System Architecture)
 * Enum defining all possible analytics event types for consistent event tracking
 */
export enum AnalyticsEventType {
  PAGE_VIEW = 'PAGE_VIEW',
  USER_ACTION = 'USER_ACTION',
  RECIPE_VIEW = 'RECIPE_VIEW',
  INGREDIENT_SCAN = 'INGREDIENT_SCAN',
  PANTRY_UPDATE = 'PANTRY_UPDATE',
  SHOPPING_LIST_UPDATE = 'SHOPPING_LIST_UPDATE'
}

/**
 * Requirement: Analytics and Reporting (1.1 System Overview/System Architecture)
 * Core interface for analytics event data structure with required tracking fields
 */
export interface AnalyticsEvent {
  eventType: AnalyticsEventType;
  timestamp: Date;
  userId: string;
  metadata: Record<string, any>;
}

/**
 * Requirement: Usage Metrics (6.4 Component Specifications/Analytics Service)
 * Interface for specifying date ranges in analytics queries
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Requirement: Usage Metrics (6.4 Component Specifications/Analytics Service)
 * Interface for aggregated analytics metrics and statistics
 */
export interface AnalyticsMetrics {
  totalUsers: number;
  activeUsers: number;
  recipeViews: number;
  ingredientScans: number;
  pantryUpdates: number;
  shoppingListUpdates: number;
  timeRange: DateRange;
}

/**
 * Requirement: Usage Metrics (6.4 Component Specifications/Analytics Service)
 * Interface for tracking individual user activity metrics and engagement
 */
export interface UserActivityMetrics {
  userId: string;
  lastActive: Date;
  totalRecipeViews: number;
  totalIngredientScans: number;
  totalPantryUpdates: number;
  totalShoppingListUpdates: number;
}

// Export configuration constants for analytics event batching
export const { EVENT_BATCH_SIZE, FLUSH_INTERVAL } = ANALYTICS_CONFIG;