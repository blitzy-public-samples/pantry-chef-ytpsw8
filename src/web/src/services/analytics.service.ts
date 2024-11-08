/**
 * HUMAN TASKS:
 * 1. Configure analytics endpoints in API gateway
 * 2. Set up analytics event processing pipeline in backend
 * 3. Configure analytics data retention policies
 * 4. Set up monitoring for analytics event processing
 */

// External dependencies
// @version axios ^1.4.0
import axios from 'axios';

// Internal dependencies
import {
  AnalyticsEvent,
  AnalyticsEventType,
  AnalyticsMetrics,
  DateRange
} from '../interfaces/analytics.interface';
import { ANALYTICS_CONFIG } from '../config/constants';
import { apiClient } from '../utils/api';

/**
 * Requirement: Analytics and Reporting (1.1 System Overview/System Architecture)
 * Service class for handling analytics event tracking and metrics retrieval
 */
class AnalyticsService {
  private eventQueue: AnalyticsEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly trackingId: string;

  constructor() {
    this.trackingId = ANALYTICS_CONFIG.TRACKING_ID;
    this.setupFlushInterval();
  }

  /**
   * Requirement: Analytics and Reporting (1.1 System Overview/System Architecture)
   * Tracks a new analytics event by adding it to the queue
   */
  public async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Validate event structure
      if (!event.eventType || !event.userId) {
        throw new Error('Invalid event data: missing required fields');
      }

      // Add timestamp if not provided
      const enrichedEvent = {
        ...event,
        timestamp: event.timestamp || new Date(),
      };

      // Add to queue
      this.eventQueue.push(enrichedEvent);

      // Check if queue size exceeds batch size
      if (this.eventQueue.length >= ANALYTICS_CONFIG.EVENT_BATCH_SIZE) {
        await this.flushEvents();
      }
    } catch (error) {
      console.error('Error tracking analytics event:', error);
      // Don't throw to prevent disrupting user experience
    }
  }

  /**
   * Requirement: Usage Metrics (6.4 Component Specifications/Analytics Service)
   * Retrieves analytics metrics for the specified time range
   */
  public async getMetrics(dateRange: DateRange): Promise<AnalyticsMetrics> {
    try {
      // Validate date range
      if (dateRange.endDate < dateRange.startDate) {
        throw new Error('Invalid date range: end date must be after start date');
      }

      // Make API request to get metrics
      const response = await apiClient.get<AnalyticsMetrics>('/analytics/metrics', {
        params: {
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString()
        }
      });

      return response.data;

      // Mock data
      // return {
      //   totalUsers: 1200,
      //   activeUsers: 850,
      //   recipeViews: 5000,
      //   ingredientScans: 1200,
      //   pantryUpdates: 800,
      //   shoppingListUpdates: 600,
      //   timeRange: {
      //     startDate: new Date("2024-10-01"),
      //     endDate: new Date("2024-10-31"),
      //   },
      // }
    } catch (error) {
      console.error('Error retrieving analytics metrics:', error);
      throw new Error('Failed to retrieve analytics metrics');
    }
  }

  /**
   * Requirement: Analytics and Reporting (1.1 System Overview/System Architecture)
   * Sets up automatic flushing of the event queue at regular intervals
   */
  private setupFlushInterval(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(
      async () => {
        if (this.eventQueue.length > 0) {
          await this.flushEvents();
        }
      },
      ANALYTICS_CONFIG.FLUSH_INTERVAL
    );
  }

  /**
   * Requirement: Analytics and Reporting (1.1 System Overview/System Architecture)
   * Sends batched events to the analytics API endpoint
   */
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = []; // Clear queue before sending to prevent duplicates

    try {
      // Create batch payload with tracking ID
      const payload = {
        trackingId: this.trackingId,
        events: events,
        timestamp: new Date().toISOString()
      };

      // Send events to analytics endpoint
      await apiClient.post('/analytics/events', payload);
    } catch (error) {
      console.error('Error flushing analytics events:', error);

      // Return events to queue on failure
      // Add at beginning to maintain chronological order
      this.eventQueue.unshift(...events);

      // Implement exponential backoff for retries
      if (this.eventQueue.length >= ANALYTICS_CONFIG.EVENT_BATCH_SIZE * 2) {
        // If queue gets too large, drop oldest events to prevent memory issues
        this.eventQueue = this.eventQueue.slice(-ANALYTICS_CONFIG.EVENT_BATCH_SIZE);
      }
    }
  }

  /**
   * Cleanup method to clear interval on service destruction
   */
  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

// Export singleton instance for application-wide usage
export const analyticsService = new AnalyticsService();