// @version mongoose ^6.0.0

import { Schema, model, Model } from 'mongoose';
import {
  UserActivityMetrics,
  SystemPerformanceMetrics,
  RecipeAnalytics,
  IngredientRecognitionMetrics,
  AnalyticsTimeframe,
} from '../interfaces/analytics.interface';

/**
 * HUMAN TASKS:
 * 1. Configure MongoDB indexes based on analytics query patterns
 * 2. Set up monitoring alerts for performance thresholds
 * 3. Verify analytics data retention policies
 * 4. Configure automated analytics rollup jobs
 */

// Addresses requirement: Usage Tracking - Analytics Service for monitoring user engagement
const UserActivitySchema = new Schema<UserActivityMetrics>(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    recipeViews: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    recipeSaves: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    ingredientScans: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    shoppingListsCreated: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lastActive: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Addresses requirement: System Metrics - Performance, reliability, and resource metrics tracking
const SystemPerformanceSchema = new Schema<SystemPerformanceMetrics>(
  {
    apiResponseTime: {
      type: Number,
      required: true,
      min: 0,
      index: true, // Index for performance monitoring queries
    },
    imageProcessingTime: {
      type: Number,
      required: true,
      min: 0,
      index: true, // Index for image processing performance tracking
    },
    concurrentUsers: {
      type: Number,
      required: true,
      min: 0,
    },
    errorRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    cpuUsage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      index: true, // Index for resource utilization monitoring
    },
    memoryUsage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      index: true, // Index for resource utilization monitoring
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true, // Index for time-based queries
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Addresses requirement: Analytics and Reporting - Tracking system metrics and user behavior
const RecipeAnalyticsSchema = new Schema<RecipeAnalytics>(
  {
    recipeId: {
      type: String,
      required: true,
      ref: 'Recipe',
      index: true,
    },
    viewCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    saveCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    averageRating: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 5,
    },
    completionCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    updatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Addresses requirement: Analytics and Reporting - System metrics tracking
const IngredientRecognitionSchema = new Schema<IngredientRecognitionMetrics>(
  {
    totalScans: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    successfulScans: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    averageConfidence: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    manualCorrections: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    processingTime: {
      type: Number,
      required: true,
      min: 0,
      index: true, // Index for performance monitoring
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Create compound indexes for efficient querying
UserActivitySchema.index({ userId: 1, lastActive: -1 });
SystemPerformanceSchema.index({ timestamp: -1, apiResponseTime: 1 });
SystemPerformanceSchema.index({ timestamp: -1, cpuUsage: 1, memoryUsage: 1 });
RecipeAnalyticsSchema.index({ recipeId: 1, viewCount: -1 });
RecipeAnalyticsSchema.index({ recipeId: 1, averageRating: -1 });
IngredientRecognitionSchema.index({ processingTime: 1, averageConfidence: -1 });

// Create models with strict type checking
export const UserActivityModel: Model<UserActivityMetrics> = model<UserActivityMetrics>(
  'UserActivity',
  UserActivitySchema
);
export const SystemPerformanceModel: Model<SystemPerformanceMetrics> =
  model<SystemPerformanceMetrics>('SystemPerformance', SystemPerformanceSchema);
export const RecipeAnalyticsModel: Model<RecipeAnalytics> = model<RecipeAnalytics>(
  'RecipeAnalytics',
  RecipeAnalyticsSchema
);
export const IngredientRecognitionModel: Model<IngredientRecognitionMetrics> =
  model<IngredientRecognitionMetrics>('IngredientRecognition', IngredientRecognitionSchema);
