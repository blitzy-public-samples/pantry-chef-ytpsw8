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
import { PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Label, Customized, Text, Legend } from 'recharts';

// Internal dependencies
import { DateRange } from '../../interfaces/analytics.interface';
import { StorageLocation } from '../../interfaces/inventory.interface';
import { analyticsService } from '../../services/analytics.service';
import Card from '../common/Card';
import theme from '../../config/theme';

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
  const CHART_COLORS = Object.values(theme.chartColors);

  /**
   * Renders the category distribution pie chart
   * Requirement: Digital Pantry Management - Category-based organization metrics
   */

  const RenderEmptyChart = ({ isEmpty }: { isEmpty: boolean }) => {
    return isEmpty ? (
      <Text
        style={{ transform: `translate(50%, 50%)` }}
        x={0}
        textAnchor="middle"
        verticalAnchor="middle"
      >
        No metrics data available
      </Text>
    ) : null
  }

  const renderCategoryDistribution = () => {
    const data = Object.entries(metrics.categoryDistribution).map(([name, value]) => ({
      name,
      value
    }));

    // Mock data
    // const data = Array(8).fill(8).map((i) => ({
    //   name: `Item-${Math.round(Math.random() * 25)}`,
    //   value: Math.round(Math.random() * 25),
    // }));

    return (
      <Card className="h-80 mb-8">
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
            <Customized
              component={<RenderEmptyChart isEmpty={!data || !Object.values(data)?.length} />}
            />
            <Legend layout="horizontal" />
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

    // Mock data
    // const data = Array(7).fill(1).map((i) => ({ date: new Date(new Date(2024, 2, 11).getTime() + Math.random() * (new Date(2024, 20, 11).getTime() - new Date(2024, 2, 11).getTime())).toLocaleDateString(), count: Math.random() * 25 }))


    return (
      <Card className="h-80 mb-8">
        <h3 className="text-lg font-semibold mb-4">Expiration Timeline</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            {data?.length != 0 && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              stroke={theme.chartColors.darkerBlue}
              activeDot={{ r: 8 }}
            />
            <Customized
              component={<RenderEmptyChart isEmpty={!data || !Object.values(data)?.length} />}
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

    // Mock data
    // const data = Object.entries({
    //   [StorageLocation.REFRIGERATOR]: 205,
    //   [StorageLocation.FREEZER]: 600,
    //   [StorageLocation.PANTRY]: 140
    // }).map(([name, value]) => ({
    //   name,
    //   value
    // }));

    const allItemsCount = data.reduce((a, p) => a + p.value, 0)

    return (
      <Card className="h-80 mb-8">
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
            <Customized
              component={<RenderEmptyChart isEmpty={allItemsCount === 0} />}
            />
            <Legend layout="horizontal" />
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