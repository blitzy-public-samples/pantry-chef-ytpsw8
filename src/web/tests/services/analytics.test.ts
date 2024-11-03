/**
 * HUMAN TASKS:
 * 1. Configure test environment variables for analytics endpoints
 * 2. Set up test analytics tracking ID in CI/CD pipeline
 * 3. Configure test data retention policies
 * 4. Set up test analytics event processing pipeline
 */

// External dependencies
// @version @jest/globals ^29.0.0
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
// @version axios-mock-adapter ^1.21.0
import MockAdapter from 'axios-mock-adapter';

// Internal dependencies
import { analyticsService } from '../../src/services/analytics.service';
import { 
  AnalyticsEvent, 
  AnalyticsEventType, 
  AnalyticsMetrics, 
  DateRange 
} from '../../src/interfaces/analytics.interface';
import { ANALYTICS_CONFIG } from '../../src/config/constants';
import { apiClient } from '../../src/utils/api';

// Initialize mock adapter for axios
const mockApiClient = new MockAdapter(apiClient);

// Mock event data
const mockEvent: AnalyticsEvent = {
  eventType: AnalyticsEventType.PAGE_VIEW,
  timestamp: new Date(),
  userId: 'test-user-123',
  metadata: {
    page: '/dashboard',
    referrer: '/login'
  }
};

// Mock metrics data
const mockMetrics: AnalyticsMetrics = {
  totalUsers: 1000,
  activeUsers: 500,
  recipeViews: 2500,
  ingredientScans: 1500,
  pantryUpdates: 750,
  shoppingListUpdates: 300,
  timeRange: {
    startDate: new Date('2023-01-01'),
    endDate: new Date('2023-12-31')
  }
};

describe('AnalyticsService', () => {
  beforeEach(() => {
    // Reset mock adapter
    mockApiClient.reset();
    // Clear all mock timers
    jest.clearAllTimers();
    // Reset API client mock
    jest.spyOn(apiClient, 'post').mockClear();
    jest.spyOn(apiClient, 'get').mockClear();
    // Mock timer functions
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Restore all mocks
    jest.restoreAllMocks();
    // Clear mock adapter
    mockApiClient.reset();
    // Reset timers
    jest.useRealTimers();
    // Clear event queue
    analyticsService.destroy();
  });

  /**
   * Requirement: Analytics and Reporting (1.1 System Overview/System Architecture)
   * Tests event tracking functionality
   */
  test('should track events correctly', async () => {
    // Mock successful API response
    mockApiClient.onPost('/analytics/events').reply(200);

    // Track event
    await analyticsService.trackEvent(mockEvent);

    // Verify event is queued (queue size should be 1)
    expect(apiClient.post).not.toHaveBeenCalled();

    // Add more events to trigger batch
    for (let i = 0; i < ANALYTICS_CONFIG.EVENT_BATCH_SIZE - 1; i++) {
      await analyticsService.trackEvent({
        ...mockEvent,
        timestamp: new Date(),
        metadata: { ...mockEvent.metadata, index: i }
      });
    }

    // Verify batch was sent
    expect(apiClient.post).toHaveBeenCalledWith('/analytics/events', {
      trackingId: ANALYTICS_CONFIG.TRACKING_ID,
      events: expect.arrayContaining([
        expect.objectContaining({
          eventType: AnalyticsEventType.PAGE_VIEW,
          userId: 'test-user-123'
        })
      ]),
      timestamp: expect.any(String)
    });
  });

  /**
   * Requirement: Analytics and Reporting (1.1 System Overview/System Architecture)
   * Tests event batching functionality
   */
  test('should batch events correctly', async () => {
    // Mock successful API response
    mockApiClient.onPost('/analytics/events').reply(200);

    // Track multiple events
    const events = Array.from({ length: ANALYTICS_CONFIG.EVENT_BATCH_SIZE + 2 }, (_, i) => ({
      ...mockEvent,
      timestamp: new Date(),
      metadata: { ...mockEvent.metadata, index: i }
    }));

    // Send events
    await Promise.all(events.map(event => analyticsService.trackEvent(event)));

    // Verify first batch was sent
    expect(apiClient.post).toHaveBeenCalledWith('/analytics/events', {
      trackingId: ANALYTICS_CONFIG.TRACKING_ID,
      events: expect.arrayContaining([
        expect.objectContaining({
          eventType: AnalyticsEventType.PAGE_VIEW,
          userId: 'test-user-123'
        })
      ]),
      timestamp: expect.any(String)
    });

    // Verify remaining events are queued
    expect(apiClient.post).toHaveBeenCalledTimes(1);
  });

  /**
   * Requirement: Usage Metrics (6.4 Component Specifications/Analytics Service)
   * Tests metrics retrieval functionality
   */
  test('should retrieve metrics correctly', async () => {
    // Mock date range for query
    const dateRange: DateRange = {
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-12-31')
    };

    // Mock successful API response
    mockApiClient.onGet('/analytics/metrics').reply(200, mockMetrics);

    // Retrieve metrics
    const metrics = await analyticsService.getMetrics(dateRange);

    // Verify API call
    expect(apiClient.get).toHaveBeenCalledWith('/analytics/metrics', {
      params: {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString()
      }
    });

    // Verify metrics data
    expect(metrics).toEqual(mockMetrics);
    expect(metrics.totalUsers).toBe(1000);
    expect(metrics.activeUsers).toBe(500);
    expect(metrics.recipeViews).toBe(2500);
  });

  /**
   * Requirement: Analytics and Reporting (1.1 System Overview/System Architecture)
   * Tests error handling in API calls
   */
  test('should handle API errors', async () => {
    // Mock API error response
    mockApiClient.onPost('/analytics/events').reply(500);

    // Track event
    await analyticsService.trackEvent(mockEvent);

    // Add more events to trigger batch
    for (let i = 0; i < ANALYTICS_CONFIG.EVENT_BATCH_SIZE - 1; i++) {
      await analyticsService.trackEvent({
        ...mockEvent,
        timestamp: new Date(),
        metadata: { ...mockEvent.metadata, index: i }
      });
    }

    // Verify events are requeued on error
    expect(apiClient.post).toHaveBeenCalledWith('/analytics/events', expect.any(Object));
    
    // Mock successful retry
    mockApiClient.onPost('/analytics/events').reply(200);
    
    // Advance timers to trigger retry
    jest.advanceTimersByTime(ANALYTICS_CONFIG.FLUSH_INTERVAL);
    
    // Verify successful retry
    expect(apiClient.post).toHaveBeenCalledTimes(2);
  });

  /**
   * Requirement: Analytics and Reporting (1.1 System Overview/System Architecture)
   * Tests automatic flush interval functionality
   */
  test('should flush events on interval', async () => {
    // Mock successful API response
    mockApiClient.onPost('/analytics/events').reply(200);

    // Track a single event
    await analyticsService.trackEvent(mockEvent);

    // Verify event is queued
    expect(apiClient.post).not.toHaveBeenCalled();

    // Advance timers to trigger flush
    jest.advanceTimersByTime(ANALYTICS_CONFIG.FLUSH_INTERVAL);

    // Verify flush occurred
    expect(apiClient.post).toHaveBeenCalledWith('/analytics/events', {
      trackingId: ANALYTICS_CONFIG.TRACKING_ID,
      events: [expect.objectContaining(mockEvent)],
      timestamp: expect.any(String)
    });
  });

  /**
   * Requirement: Usage Metrics (6.4 Component Specifications/Analytics Service)
   * Tests invalid date range handling
   */
  test('should handle invalid date ranges', async () => {
    // Create invalid date range
    const invalidDateRange: DateRange = {
      startDate: new Date('2023-12-31'),
      endDate: new Date('2023-01-01')
    };

    // Attempt to retrieve metrics with invalid range
    await expect(analyticsService.getMetrics(invalidDateRange))
      .rejects
      .toThrow('Invalid date range: end date must be after start date');

    // Verify no API call was made
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  /**
   * Requirement: Analytics and Reporting (1.1 System Overview/System Architecture)
   * Tests queue size management
   */
  test('should manage queue size correctly', async () => {
    // Mock API error to force queue growth
    mockApiClient.onPost('/analytics/events').reply(500);

    // Add events beyond 2x batch size
    const eventCount = ANALYTICS_CONFIG.EVENT_BATCH_SIZE * 2 + 1;
    for (let i = 0; i < eventCount; i++) {
      await analyticsService.trackEvent({
        ...mockEvent,
        timestamp: new Date(),
        metadata: { ...mockEvent.metadata, index: i }
      });
    }

    // Advance timer to trigger flush attempts
    jest.advanceTimersByTime(ANALYTICS_CONFIG.FLUSH_INTERVAL * 2);

    // Mock successful API call
    mockApiClient.onPost('/analytics/events').reply(200);

    // Advance timer one more time
    jest.advanceTimersByTime(ANALYTICS_CONFIG.FLUSH_INTERVAL);

    // Verify queue was trimmed to prevent memory issues
    expect(apiClient.post).toHaveBeenLastCalledWith('/analytics/events', {
      trackingId: ANALYTICS_CONFIG.TRACKING_ID,
      events: expect.arrayContaining([
        expect.objectContaining({
          eventType: AnalyticsEventType.PAGE_VIEW,
          userId: 'test-user-123'
        })
      ]),
      timestamp: expect.any(String)
    });
  });
});