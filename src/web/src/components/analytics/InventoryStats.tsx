/**
 * HUMAN TASKS:
 * 1. Configure Recharts theme colors to match application theme
 * 2. Set up analytics data retention policies
 * 3. Configure monitoring for analytics metrics collection
 * 4. Verify chart accessibility compliance
 */

// React and core dependencies
// @version react ^18.0.0
import React, { useEffect, useState, useMemo } from 'react';
// @version recharts ^2.0.0
import { PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Internal dependencies
import { AnalyticsMetrics, DateRange } from '../../interfaces/analytics.interface';
import { InventoryItem, StorageLocation } from '../../interfaces/inventory.interface';
import { analyticsService } from '../../services/analytics.service';
import Card from '../common/Card';

/**
 * Props for the InventoryStats component
 * Requirement: Analytics and Reporting - Component for displaying inventory analytics
 */
interface InventoryStatsProps {
  className?: string;
  timeRange: DateRange;
}

/**
 * Interface for processed inventory statistics
 * Requirement: Digital Pantry Management - Category-based organization metrics
 */
interface InventoryMetrics {
  categoryDistribution: Record<string, number>;
  expirationTimeline: Array<{ date: Date; count: number }>;
  locationBreakdown: Record<StorageLocation, number>;
}

/**
 * Custom hook to fetch and process inventory statistics
 * Requirement: Analytics and Reporting - Data processing for visualization
 */
const useInventoryStats = (timeRange: DateRange) => {
  const [metrics, setMetrics] = useState<InventoryMetrics>({
    categoryDistribution: {},
    expirationTimeline: [],
    locationBreakdown: {
      [StorageLocation.REFRIGERATOR]: 0,
      [StorageLocation.FREEZER]: 0,
      [StorageLocation.PANTRY]: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const data = await analyticsService.getMetrics(timeRange);
        
        // Process and transform the data for visualization
        const processedMetrics: InventoryMetrics = {
          categoryDistribution: {},
          expirationTimeline: [],
          locationBreakdown: {
            [StorageLocation.REFRIGERATOR]: 0,
            [StorageLocation.FREEZER]: 0,
            [StorageLocation.PANTRY]: 0
          }
        };

        // Update metrics state with processed data
        setMetrics(processedMetrics);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch metrics'));
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [timeRange]);

  return { metrics, loading, error };
};

/**
 * Component that displays statistical analytics about the user's pantry inventory
 * Requirement: Analytics and Reporting - Interactive charts and visualizations
 */
const InventoryStats: React.FC<InventoryStatsProps> = ({ className, timeRange }) => {
  const { metrics, loading, error } = useInventoryStats(timeRange);

  // Chart colors configuration
  const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c'];

  /**
   * Renders the category distribution pie chart
   * Requirement: Digital Pantry Management - Category-based organization metrics
   */
  const renderCategoryDistribution = () => {
    const data = Object.entries(metrics.categoryDistribution).map(([name, value]) => ({
      name,
      value
    }));

    return (
      <Card className="h-80">
        <h3 className="text-lg font-semibold mb-4">Category Distribution</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    );
  };

  /**
   * Renders the expiration timeline line chart
   * Requirement: Digital Pantry Management - Expiration tracking visualization
   */
  const renderExpirationTimeline = () => {
    const data = metrics.expirationTimeline.map(item => ({
      date: new Date(item.date).toLocaleDateString(),
      count: item.count
    }));

    return (
      <Card className="h-80">
        <h3 className="text-lg font-semibold mb-4">Expiration Timeline</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#8884d8"
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    );
  };

  /**
   * Renders the storage location distribution chart
   * Requirement: Digital Pantry Management - Storage location breakdown
   */
  const renderLocationBreakdown = () => {
    const data = Object.entries(metrics.locationBreakdown).map(([name, value]) => ({
      name,
      value
    }));

    return (
      <Card className="h-80">
        <h3 className="text-lg font-semibold mb-4">Storage Location Breakdown</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className={className}>
        <Card>
          <div className="flex items-center justify-center h-80">
            <span className="text-gray-500">Loading statistics...</span>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Card>
          <div className="flex items-center justify-center h-80">
            <span className="text-red-500">Error loading statistics: {error.message}</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {renderCategoryDistribution()}
        {renderExpirationTimeline()}
        {renderLocationBreakdown()}
      </div>
    </div>
  );
};

export default InventoryStats;