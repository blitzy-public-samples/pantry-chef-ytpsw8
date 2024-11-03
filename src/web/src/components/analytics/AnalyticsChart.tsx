/**
 * HUMAN TASKS:
 * 1. Configure chart theme colors in theme.ts to match application branding
 * 2. Set up analytics data retention policies in backend
 * 3. Configure monitoring alerts for analytics data collection
 */

// External dependencies
// @version: react ^18.0.0
import React, { useMemo, useCallback } from 'react';
// @version: recharts ^2.0.0
import {
  LineChart,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  Bar
} from 'recharts';

// Internal dependencies
import { AnalyticsMetrics, DateRange } from '../../interfaces/analytics.interface';
import { analyticsService } from '../../services/analytics.service';

interface AnalyticsChartProps {
  chartType: 'line' | 'bar';
  data: AnalyticsMetrics;
  title: string;
  chartConfig?: {
    height?: number;
    showLegend?: boolean;
    showTooltip?: boolean;
    colors?: string[];
  };
}

/**
 * Requirement: Analytics and Reporting (1.1 System Overview/System Architecture)
 * Formats analytics metrics into a structure suitable for Recharts visualization
 */
const formatChartData = (metrics: AnalyticsMetrics) => {
  const {
    totalUsers,
    activeUsers,
    recipeViews,
    ingredientScans,
    pantryUpdates,
    shoppingListUpdates,
    timeRange
  } = metrics;

  // Create time series data points
  const startDate = new Date(timeRange.startDate);
  const endDate = new Date(timeRange.endDate);
  const dayDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));

  return Array.from({ length: dayDiff + 1 }, (_, index) => {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + index);

    // Format date for x-axis
    const formattedDate = currentDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    // Calculate metrics distribution across the time range
    const dayRatio = index / dayDiff;
    return {
      date: formattedDate,
      'Total Users': Math.round(totalUsers * dayRatio),
      'Active Users': Math.round(activeUsers * dayRatio),
      'Recipe Views': Math.round(recipeViews * dayRatio),
      'Ingredient Scans': Math.round(ingredientScans * dayRatio),
      'Pantry Updates': Math.round(pantryUpdates * dayRatio),
      'Shopping List Updates': Math.round(shoppingListUpdates * dayRatio)
    };
  });
};

/**
 * Requirement: Usage Metrics (6.4 Component Specifications/Analytics Service)
 * React component that renders analytics charts using Recharts
 */
const AnalyticsChart: React.FC<AnalyticsChartProps> = React.memo(({
  chartType,
  data,
  title,
  chartConfig = {
    height: 400,
    showLegend: true,
    showTooltip: true,
    colors: ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28']
  }
}) => {
  // Format data for chart rendering
  const formattedData = useMemo(() => formatChartData(data), [data]);

  // Extract metric keys for rendering chart elements
  const metricKeys = useMemo(() => 
    Object.keys(formattedData[0] || {}).filter(key => key !== 'date'),
    [formattedData]
  );

  // Custom tooltip formatter
  const formatTooltip = useCallback((value: number) => [
    `${value.toLocaleString()}`,
    'Count'
  ], []);

  // Render appropriate chart based on chartType prop
  const renderChart = () => {
    const commonProps = {
      data: formattedData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    if (chartType === 'line') {
      return (
        <LineChart {...commonProps}>
          <XAxis dataKey="date" />
          <YAxis />
          {chartConfig.showTooltip && (
            <Tooltip formatter={formatTooltip} />
          )}
          {chartConfig.showLegend && <Legend />}
          {metricKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={chartConfig.colors?.[index]}
              activeDot={{ r: 8 }}
              dot={false}
            />
          ))}
        </LineChart>
      );
    }

    return (
      <BarChart {...commonProps}>
        <XAxis dataKey="date" />
        <YAxis />
        {chartConfig.showTooltip && (
          <Tooltip formatter={formatTooltip} />
        )}
        {chartConfig.showLegend && <Legend />}
        {metricKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            fill={chartConfig.colors?.[index]}
            stackId="metrics"
          />
        ))}
      </BarChart>
    );
  };

  return (
    <div className="analytics-chart">
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={chartConfig.height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
});

AnalyticsChart.displayName = 'AnalyticsChart';

export default AnalyticsChart;