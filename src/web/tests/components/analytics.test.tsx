/**
 * HUMAN TASKS:
 * 1. Configure test environment variables for analytics service endpoints
 * 2. Set up mock data generation scripts for consistent test data
 * 3. Configure test coverage thresholds for analytics components
 */

// External dependencies
// @version: react ^18.0.0
import React from 'react';
// @version: @testing-library/react ^13.0.0
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// @version: @jest/globals ^29.0.0
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Internal dependencies
import AnalyticsChart from '../../src/components/analytics/AnalyticsChart';
import InventoryStats from '../../src/components/analytics/InventoryStats';
import UsageMetrics from '../../src/components/analytics/UsageMetrics';
import { AnalyticsMetrics, DateRange } from '../../src/interfaces/analytics.interface';

// Mock analytics service
jest.mock('../../src/services/analytics.service', () => ({
  analyticsService: {
    getMetrics: jest.fn()
  }
}));

// Mock common Card component
jest.mock('../../src/components/common/Card', () => {
  return function MockCard({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={`mock-card ${className || ''}`}>{children}</div>;
  };
});

// Mock data for testing
const mockDateRange: DateRange = {
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31')
};

const mockAnalyticsData: AnalyticsMetrics = {
  totalUsers: 1500,
  activeUsers: 750,
  recipeViews: 5000,
  ingredientScans: 3000,
  pantryUpdates: 2000,
  shoppingListUpdates: 1000,
  timeRange: mockDateRange
};

describe('AnalyticsChart Component', () => {
  // Requirement: Analytics and Reporting - Test coverage for analytics visualization components
  test('renders line chart with provided data', () => {
    render(
      <AnalyticsChart
        chartType="line"
        data={mockAnalyticsData}
        title="Usage Trends"
      />
    );

    expect(screen.getByText('Usage Trends')).toBeInTheDocument();
    expect(screen.getByRole('graphics-document')).toBeInTheDocument();
  });

  test('handles empty data gracefully', () => {
    const emptyData = {
      ...mockAnalyticsData,
      totalUsers: 0,
      activeUsers: 0,
      recipeViews: 0,
      ingredientScans: 0,
      pantryUpdates: 0,
      shoppingListUpdates: 0
    };

    render(
      <AnalyticsChart
        chartType="line"
        data={emptyData}
        title="Empty Chart"
      />
    );

    expect(screen.getByText('Empty Chart')).toBeInTheDocument();
  });

  test('updates on data changes', async () => {
    const { rerender } = render(
      <AnalyticsChart
        chartType="line"
        data={mockAnalyticsData}
        title="Dynamic Chart"
      />
    );

    const updatedData = {
      ...mockAnalyticsData,
      totalUsers: 2000,
      activeUsers: 1000
    };

    rerender(
      <AnalyticsChart
        chartType="line"
        data={updatedData}
        title="Dynamic Chart"
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('graphics-document')).toBeInTheDocument();
    });
  });

  test('displays correct chart type based on props', () => {
    const { rerender } = render(
      <AnalyticsChart
        chartType="line"
        data={mockAnalyticsData}
        title="Chart Type Test"
      />
    );

    expect(screen.getByRole('graphics-document')).toHaveClass('recharts-line');

    rerender(
      <AnalyticsChart
        chartType="bar"
        data={mockAnalyticsData}
        title="Chart Type Test"
      />
    );

    expect(screen.getByRole('graphics-document')).toHaveClass('recharts-bar');
  });

  test('shows loading state while fetching data', () => {
    render(
      <AnalyticsChart
        chartType="line"
        data={{ ...mockAnalyticsData, totalUsers: undefined }}
        title="Loading Chart"
      />
    );

    expect(screen.getByRole('graphics-document')).toHaveAttribute('aria-busy', 'true');
  });
});

describe('InventoryStats Component', () => {
  // Requirement: Digital Pantry Management - Verification of inventory tracking and analytics visualization
  test('renders category distribution chart correctly', async () => {
    render(<InventoryStats timeRange={mockDateRange} />);

    await waitFor(() => {
      expect(screen.getByText('Category Distribution')).toBeInTheDocument();
      expect(screen.getByRole('graphics-document', { name: 'category-distribution' })).toBeInTheDocument();
    });
  });

  test('renders expiration timeline accurately', async () => {
    render(<InventoryStats timeRange={mockDateRange} />);

    await waitFor(() => {
      expect(screen.getByText('Expiration Timeline')).toBeInTheDocument();
      expect(screen.getByRole('graphics-document', { name: 'expiration-timeline' })).toBeInTheDocument();
    });
  });

  test('renders location breakdown chart properly', async () => {
    render(<InventoryStats timeRange={mockDateRange} />);

    await waitFor(() => {
      expect(screen.getByText('Storage Location Breakdown')).toBeInTheDocument();
      expect(screen.getByRole('graphics-document', { name: 'location-breakdown' })).toBeInTheDocument();
    });
  });

  test('handles data updates properly', async () => {
    const { rerender } = render(<InventoryStats timeRange={mockDateRange} />);

    const newTimeRange = {
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-02-28')
    };

    rerender(<InventoryStats timeRange={newTimeRange} />);

    await waitFor(() => {
      expect(screen.getAllByRole('graphics-document')).toHaveLength(3);
    });
  });

  test('displays loading state', () => {
    render(<InventoryStats timeRange={mockDateRange} />);
    expect(screen.getByText('Loading statistics...')).toBeInTheDocument();
  });

  test('handles error states appropriately', async () => {
    const mockError = new Error('Failed to fetch inventory stats');
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const { analyticsService } = require('../../src/services/analytics.service');
    analyticsService.getMetrics.mockRejectedValueOnce(mockError);

    render(<InventoryStats timeRange={mockDateRange} />);

    await waitFor(() => {
      expect(screen.getByText(/Error loading statistics/)).toBeInTheDocument();
    });
  });
});

describe('UsageMetrics Component', () => {
  // Requirement: Analytics and Reporting - Test coverage for metrics display
  test('displays all required metrics from AnalyticsMetrics interface', async () => {
    render(<UsageMetrics timeRange={mockDateRange} />);

    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('Recipe Views')).toBeInTheDocument();
      expect(screen.getByText('Ingredient Scans')).toBeInTheDocument();
      expect(screen.getByText('Pantry Updates')).toBeInTheDocument();
      expect(screen.getByText('Shopping List Updates')).toBeInTheDocument();
    });
  });

  test('formats metric values correctly using formatMetricValue', async () => {
    const largeNumberMetrics = {
      ...mockAnalyticsData,
      totalUsers: 1500000,
      activeUsers: 1500,
      recipeViews: 1000000
    };

    const { analyticsService } = require('../../src/services/analytics.service');
    analyticsService.getMetrics.mockResolvedValueOnce(largeNumberMetrics);

    render(<UsageMetrics timeRange={mockDateRange} />);

    await waitFor(() => {
      expect(screen.getByText('1.5M')).toBeInTheDocument();
      expect(screen.getByText('1.5K')).toBeInTheDocument();
      expect(screen.getByText('1.0M')).toBeInTheDocument();
    });
  });

  test('updates on time range changes', async () => {
    const { rerender } = render(<UsageMetrics timeRange={mockDateRange} />);

    const newTimeRange = {
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-02-28')
    };

    rerender(<UsageMetrics timeRange={newTimeRange} />);

    await waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(6);
    });
  });

  test('triggers onMetricsLoad callback with valid metrics data', async () => {
    const onMetricsLoad = jest.fn();
    const { analyticsService } = require('../../src/services/analytics.service');
    analyticsService.getMetrics.mockResolvedValueOnce(mockAnalyticsData);

    render(
      <UsageMetrics
        timeRange={mockDateRange}
        onMetricsLoad={onMetricsLoad}
      />
    );

    await waitFor(() => {
      expect(onMetricsLoad).toHaveBeenCalledWith(mockAnalyticsData);
    });
  });

  test('handles loading and error states', async () => {
    const mockError = new Error('Failed to fetch metrics');
    const { analyticsService } = require('../../src/services/analytics.service');
    analyticsService.getMetrics.mockRejectedValueOnce(mockError);

    render(<UsageMetrics timeRange={mockDateRange} />);

    // Check loading state
    expect(screen.getByTestId('loading-metrics')).toBeInTheDocument();

    // Check error state
    await waitFor(() => {
      expect(screen.getByText('Failed to load metrics data')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    // Test retry functionality
    fireEvent.click(screen.getByText('Retry'));
    expect(window.location.reload).toHaveBeenCalled();
  });
});