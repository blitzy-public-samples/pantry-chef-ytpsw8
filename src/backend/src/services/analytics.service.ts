// @version mongoose ^6.0.0
// @version moment ^2.29.0

import {
  UserActivityModel,
  SystemPerformanceModel,
  RecipeAnalyticsModel,
  IngredientRecognitionModel,
} from '../models/analytics.model';
import { CacheService } from './cache.service';
import { logger } from '../utils/logger';
import {
  UserActivityMetrics,
  SystemPerformanceMetrics,
  RecipeAnalytics,
  IngredientRecognitionMetrics,
  AnalyticsTimeframe,
} from '../interfaces/analytics.interface';
import moment from 'moment';

/**
 * HUMAN TASKS:
 * 1. Configure CloudWatch alerts for performance thresholds:
 *    - API response time > 200ms
 *    - Image processing time > 3s
 *    - CPU usage > 70%
 *    - Memory usage > 80%
 * 2. Set up analytics data retention policies in MongoDB
 * 3. Configure analytics aggregation cron jobs
 * 4. Set up analytics dashboard monitoring
 */

export class AnalyticsService {
  private readonly CACHE_TTL = 300; // 5 minutes cache TTL
  private readonly CACHE_KEYS = {
    USER_ACTIVITY: 'analytics:user:',
    SYSTEM_PERF: 'analytics:system:',
    RECIPE: 'analytics:recipe:',
    RECOGNITION: 'analytics:recognition:',
  };

  constructor(private cacheService: CacheService) {}

  /**
   * Tracks and updates user activity metrics with caching
   * Addresses requirement: Usage Tracking - Analytics Service for monitoring user engagement
   */
  public async trackUserActivity(userId: string, metrics: UserActivityMetrics): Promise<void> {
    try {
      // Validate metrics
      if (!userId || !metrics) {
        throw new Error('Invalid user activity metrics');
      }

      // Check cache first
      const cacheKey = `${this.CACHE_KEYS.USER_ACTIVITY}${userId}`;
      const cachedMetrics = await this.cacheService.get<UserActivityMetrics>(cacheKey);

      // Update or create metrics
      const updatedMetrics = {
        ...metrics,
        lastActive: new Date(),
        userId,
      };

      await UserActivityModel.findOneAndUpdate({ userId }, updatedMetrics, {
        upsert: true,
        new: true,
      });

      // Update cache
      await this.cacheService.set(cacheKey, updatedMetrics, this.CACHE_TTL);

      logger.info('User activity tracked successfully', {
        userId,
        metrics: updatedMetrics,
      });
    } catch (error: any) {
      logger.error('Failed to track user activity', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Records system performance metrics with thresholds monitoring
   * Addresses requirement: System Metrics - Performance, reliability, and resource metrics tracking
   */
  public async recordSystemMetrics(metrics: SystemPerformanceMetrics): Promise<void> {
    try {
      // Validate thresholds
      this.validateSystemMetrics(metrics);

      // Create metrics record
      await SystemPerformanceModel.create({
        ...metrics,
        timestamp: new Date(),
      });

      // Cache latest metrics
      const cacheKey = `${this.CACHE_KEYS.SYSTEM_PERF}${moment().format('YYYY-MM-DD-HH')}`;
      await this.cacheService.set(cacheKey, metrics, this.CACHE_TTL);

      logger.info('System metrics recorded', { metrics });

      // Log alerts for threshold violations
      this.checkSystemThresholds(metrics);
    } catch (error: any) {
      logger.error('Failed to record system metrics', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Updates analytics for recipe interactions with aggregation
   * Addresses requirement: Analytics and Reporting - Tracking system metrics and user behavior
   */
  public async updateRecipeAnalytics(recipeId: string, analytics: RecipeAnalytics): Promise<void> {
    try {
      // Validate recipe analytics
      if (!recipeId || !analytics) {
        throw new Error('Invalid recipe analytics data');
      }

      const cacheKey = `${this.CACHE_KEYS.RECIPE}${recipeId}`;

      // Update recipe analytics
      await RecipeAnalyticsModel.findOneAndUpdate(
        { recipeId },
        {
          ...analytics,
          updatedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      // Update cache
      await this.cacheService.set(cacheKey, analytics, this.CACHE_TTL);

      logger.info('Recipe analytics updated', {
        recipeId,
        analytics,
      });
    } catch (error: any) {
      logger.error('Failed to update recipe analytics', {
        recipeId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Tracks metrics for ingredient recognition operations
   * Addresses requirement: Analytics and Reporting - System metrics tracking
   */
  public async trackIngredientRecognition(metrics: IngredientRecognitionMetrics): Promise<void> {
    try {
      // Validate processing time threshold
      if (metrics.processingTime > 3000) {
        // 3s threshold
        logger.warn('Image processing time exceeded threshold', {
          processingTime: metrics.processingTime,
        });
      }

      // Create recognition metrics
      await IngredientRecognitionModel.create(metrics);

      // Cache latest metrics
      const cacheKey = `${this.CACHE_KEYS.RECOGNITION}${moment().format('YYYY-MM-DD-HH')}`;
      await this.cacheService.set(cacheKey, metrics, this.CACHE_TTL);

      logger.info('Ingredient recognition metrics tracked', { metrics });
    } catch (error: any) {
      logger.error('Failed to track ingredient recognition metrics', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Retrieves aggregated analytics data for specified timeframe
   * Addresses requirement: Analytics and Reporting - Tracking system metrics
   */
  public async getAnalyticsByTimeframe(timeframe: AnalyticsTimeframe): Promise<object> {
    try {
      const timeRange = this.getTimeRange(timeframe);
      const cacheKey = `analytics:aggregated:${timeframe}:${timeRange.start}`;

      // Check cache first
      const cachedData = await this.cacheService.get<object>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Aggregate analytics data
      const [userMetrics, systemMetrics, recipeMetrics, recognitionMetrics] = await Promise.all([
        this.aggregateUserMetrics(timeRange),
        this.aggregateSystemMetrics(timeRange),
        this.aggregateRecipeMetrics(timeRange),
        this.aggregateRecognitionMetrics(timeRange),
      ]);

      const aggregatedData = {
        timeframe,
        range: timeRange,
        userMetrics,
        systemMetrics,
        recipeMetrics,
        recognitionMetrics,
      };

      // Cache aggregated data
      await this.cacheService.set(cacheKey, aggregatedData, this.CACHE_TTL);

      return aggregatedData;
    } catch (error: any) {
      logger.error('Failed to get analytics by timeframe', {
        timeframe,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Validates system metrics against defined thresholds
   * Private helper method for system metrics validation
   */
  private validateSystemMetrics(metrics: SystemPerformanceMetrics): void {
    if (metrics.apiResponseTime > 200) {
      // 200ms threshold
      logger.warn('API response time exceeded threshold', {
        responseTime: metrics.apiResponseTime,
      });
    }

    if (metrics.cpuUsage > 70) {
      // 70% threshold
      logger.warn('CPU usage exceeded threshold', {
        cpuUsage: metrics.cpuUsage,
      });
    }

    if (metrics.memoryUsage > 80) {
      // 80% threshold
      logger.warn('Memory usage exceeded threshold', {
        memoryUsage: metrics.memoryUsage,
      });
    }
  }

  /**
   * Checks system metrics against thresholds and logs alerts
   * Private helper method for threshold monitoring
   */
  private checkSystemThresholds(metrics: SystemPerformanceMetrics): void {
    const alerts = [];

    if (metrics.apiResponseTime > 200) {
      alerts.push(`API response time (${metrics.apiResponseTime}ms) exceeded 200ms threshold`);
    }

    if (metrics.imageProcessingTime > 3000) {
      alerts.push(`Image processing time (${metrics.imageProcessingTime}ms) exceeded 3s threshold`);
    }

    if (metrics.cpuUsage > 70) {
      alerts.push(`CPU usage (${metrics.cpuUsage}%) exceeded 70% threshold`);
    }

    if (metrics.memoryUsage > 80) {
      alerts.push(`Memory usage (${metrics.memoryUsage}%) exceeded 80% threshold`);
    }

    if (alerts.length > 0) {
      logger.warn('System metrics thresholds exceeded', { alerts });
    }
  }

  /**
   * Calculates time range for analytics aggregation
   * Private helper method for timeframe calculations
   */
  private getTimeRange(timeframe: AnalyticsTimeframe): { start: Date; end: Date } {
    const end = moment();
    let start = moment();

    switch (timeframe) {
      case AnalyticsTimeframe.HOURLY:
        start = start.subtract(1, 'hour');
        break;
      case AnalyticsTimeframe.DAILY:
        start = start.subtract(1, 'day');
        break;
      case AnalyticsTimeframe.WEEKLY:
        start = start.subtract(1, 'week');
        break;
      case AnalyticsTimeframe.MONTHLY:
        start = start.subtract(1, 'month');
        break;
      default:
        throw new Error('Invalid timeframe');
    }

    return {
      start: start.toDate(),
      end: end.toDate(),
    };
  }

  /**
   * Aggregates user metrics for specified time range
   * Private helper method for user analytics aggregation
   */
  private async aggregateUserMetrics(timeRange: { start: Date; end: Date }): Promise<object> {
    const metrics = await UserActivityModel.find({
      lastActive: { $gte: timeRange.start, $lte: timeRange.end },
    });

    return {
      totalUsers: metrics.length,
      averageRecipeViews: this.calculateAverage(metrics, 'recipeViews'),
      averageRecipeSaves: this.calculateAverage(metrics, 'recipeSaves'),
      averageIngredientScans: this.calculateAverage(metrics, 'ingredientScans'),
      averageShoppingLists: this.calculateAverage(metrics, 'shoppingListsCreated'),
    };
  }

  /**
   * Aggregates system metrics for specified time range
   * Private helper method for system analytics aggregation
   */
  private async aggregateSystemMetrics(timeRange: { start: Date; end: Date }): Promise<object> {
    const metrics = await SystemPerformanceModel.find({
      timestamp: { $gte: timeRange.start, $lte: timeRange.end },
    });

    return {
      averageResponseTime: this.calculateAverage(metrics, 'apiResponseTime'),
      averageProcessingTime: this.calculateAverage(metrics, 'imageProcessingTime'),
      averageCpuUsage: this.calculateAverage(metrics, 'cpuUsage'),
      averageMemoryUsage: this.calculateAverage(metrics, 'memoryUsage'),
      peakConcurrentUsers: Math.max(...metrics.map((m) => m.concurrentUsers)),
      averageErrorRate: this.calculateAverage(metrics, 'errorRate'),
    };
  }

  /**
   * Aggregates recipe metrics for specified time range
   * Private helper method for recipe analytics aggregation
   */
  private async aggregateRecipeMetrics(timeRange: { start: Date; end: Date }): Promise<object> {
    const metrics = await RecipeAnalyticsModel.find({
      updatedAt: { $gte: timeRange.start, $lte: timeRange.end },
    });

    return {
      totalViews: this.sumMetric(metrics, 'viewCount'),
      totalSaves: this.sumMetric(metrics, 'saveCount'),
      averageRating: this.calculateAverage(metrics, 'averageRating'),
      totalCompletions: this.sumMetric(metrics, 'completionCount'),
      mostViewedRecipes: await this.getMostViewedRecipes(timeRange),
    };
  }

  /**
   * Aggregates recognition metrics for specified time range
   * Private helper method for recognition analytics aggregation
   */
  private async aggregateRecognitionMetrics(timeRange: {
    start: Date;
    end: Date;
  }): Promise<object> {
    const metrics = await IngredientRecognitionModel.find({
      createdAt: { $gte: timeRange.start, $lte: timeRange.end },
    });

    return {
      totalScans: this.sumMetric(metrics, 'totalScans'),
      successRate:
        (this.sumMetric(metrics, 'successfulScans') / this.sumMetric(metrics, 'totalScans')) * 100,
      averageConfidence: this.calculateAverage(metrics, 'averageConfidence'),
      averageProcessingTime: this.calculateAverage(metrics, 'processingTime'),
      manualCorrections: this.sumMetric(metrics, 'manualCorrections'),
    };
  }

  /**
   * Calculates average for a specific metric
   * Private helper method for metric calculations
   */
  private calculateAverage(metrics: any[], field: string): number {
    if (!metrics.length) return 0;
    return metrics.reduce((acc, curr) => acc + curr[field], 0) / metrics.length;
  }

  /**
   * Sums up a specific metric
   * Private helper method for metric calculations
   */
  private sumMetric(metrics: any[], field: string): number {
    return metrics.reduce((acc, curr) => acc + curr[field], 0);
  }

  /**
   * Retrieves most viewed recipes for specified time range
   * Private helper method for recipe analytics
   */
  private async getMostViewedRecipes(timeRange: { start: Date; end: Date }): Promise<object[]> {
    return await RecipeAnalyticsModel.find({
      updatedAt: { $gte: timeRange.start, $lte: timeRange.end },
    })
      .sort({ viewCount: -1 })
      .limit(10)
      .select('recipeId viewCount averageRating');
  }
}
