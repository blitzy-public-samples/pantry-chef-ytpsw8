/**
 * HUMAN TASKS:
 * 1. Ensure proper analytics service configuration in environment variables
 * 2. Set up error tracking and monitoring for analytics metrics
 * 3. Configure appropriate caching policies for metrics data
 * 4. Set up access control for analytics dashboard
 */

// External dependencies
// @version: react ^18.0.0
import React, { useState, useEffect } from 'react';

// Internal dependencies
import { AnalyticsMetrics, DateRange } from '../../interfaces/analytics.interface';
import { analyticsService } from '../../services/analytics.service';
import Card from '../common/Card';

/**
 * Props interface for the UsageMetrics component
 * Requirement: Analytics and Reporting (1.1 System Overview/System Architecture)
 */
interface UsageMetricsProps {
  timeRange: DateRange;
  className?: string;
  onMetricsLoad?: (metrics: AnalyticsMetrics) => void;
}

/**
 * Component that displays key usage metrics and statistics for the PantryChef application
 * Requirement: Usage Metrics (6.4 Component Specifications/Analytics Service)
 */
const UsageMetrics: React.FC<UsageMetricsProps> = ({
  timeRange,
  className,
  onMetricsLoad
}) => {
  // State management for metrics data and loading states
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch metrics when timeRange changes
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await analyticsService.getMetrics(timeRange);
        setMetrics(data);
        onMetricsLoad?.(data);
      } catch (err) {
        setError('Failed to load metrics data');
        console.error('Error fetching metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [timeRange, onMetricsLoad]);

  /**
   * Formats numeric values for display with appropriate suffixes
   * Requirement: Usage Metrics (6.4 Component Specifications/Analytics Service)
   */
  const formatMetricValue = (value: number): string => {
    if (value === null || value === undefined) return '0';
    
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    
    return value.toLocaleString();
  };

  // Loading state
  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
        {[...Array(6)].map((_, index) => (
          <Card key={index} className="animate-pulse h-32">
            <div className="h-full bg-gray-200 rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={`p-4 bg-red-50 border border-red-200 ${className}`}>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 text-sm text-red-700 underline"
        >
          Retry
        </button>
      </Card>
    );
  }

  // No data state
  if (!metrics) {
    return (
      <Card className={`p-4 ${className}`}>
        <p className="text-gray-500">No metrics data available</p>
      </Card>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {/* Total Users Metric */}
      <Card elevation="sm" className="p-4">
        <h3 className="text-lg font-semibold text-gray-700">Total Users</h3>
        <p className="text-3xl font-bold text-primary mt-2">
          {formatMetricValue(metrics.totalUsers)}
        </p>
        <p className="text-sm text-gray-500 mt-1">Registered users</p>
      </Card>

      {/* Active Users Metric */}
      <Card elevation="sm" className="p-4">
        <h3 className="text-lg font-semibold text-gray-700">Active Users</h3>
        <p className="text-3xl font-bold text-green-600 mt-2">
          {formatMetricValue(metrics.activeUsers)}
        </p>
        <p className="text-sm text-gray-500 mt-1">Current period</p>
      </Card>

      {/* Recipe Views Metric */}
      <Card elevation="sm" className="p-4">
        <h3 className="text-lg font-semibold text-gray-700">Recipe Views</h3>
        <p className="text-3xl font-bold text-blue-600 mt-2">
          {formatMetricValue(metrics.recipeViews)}
        </p>
        <p className="text-sm text-gray-500 mt-1">Total views</p>
      </Card>

      {/* Ingredient Scans Metric */}
      <Card elevation="sm" className="p-4">
        <h3 className="text-lg font-semibold text-gray-700">Ingredient Scans</h3>
        <p className="text-3xl font-bold text-purple-600 mt-2">
          {formatMetricValue(metrics.ingredientScans)}
        </p>
        <p className="text-sm text-gray-500 mt-1">Total scans</p>
      </Card>

      {/* Pantry Updates Metric */}
      <Card elevation="sm" className="p-4">
        <h3 className="text-lg font-semibold text-gray-700">Pantry Updates</h3>
        <p className="text-3xl font-bold text-orange-600 mt-2">
          {formatMetricValue(metrics.pantryUpdates)}
        </p>
        <p className="text-sm text-gray-500 mt-1">Total updates</p>
      </Card>

      {/* Shopping List Updates Metric */}
      <Card elevation="sm" className="p-4">
        <h3 className="text-lg font-semibold text-gray-700">Shopping List Updates</h3>
        <p className="text-3xl font-bold text-yellow-600 mt-2">
          {formatMetricValue(metrics.shoppingListUpdates)}
        </p>
        <p className="text-sm text-gray-500 mt-1">Total updates</p>
      </Card>
    </div>
  );
};

export default UsageMetrics;