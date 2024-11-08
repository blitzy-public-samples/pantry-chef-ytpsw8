/**
 * HUMAN TASKS:
 * 1. Configure analytics service endpoints in environment variables
 * 2. Set up monitoring alerts for analytics data collection
 * 3. Configure data retention policies for analytics metrics
 * 4. Set up proper access control for analytics dashboard
 * 5. Configure chart theme colors in theme configuration
 */

// External dependencies
// @version: react ^18.0.0
import React, { useState, useEffect, useCallback } from 'react';
// @version: next/head ^13.0.0
import Head from 'next/head';
import { GetServerSideProps, NextPage } from 'next';

// Internal dependencies
import MainLayout from '../../components/layout/MainLayout';
import AnalyticsChart from '../../components/analytics/AnalyticsChart';
import InventoryStats from '../../components/analytics/InventoryStats';
import UsageMetrics from '../../components/analytics/UsageMetrics';
import { DateRange, AnalyticsMetrics } from '../../interfaces/analytics.interface';
import { init } from 'next/dist/compiled/webpack/webpack';
import Card from '../../components/common/Card';
import theme from '../../config/theme';

/**
 * Props interface for the Analytics Dashboard page
 * Requirement: Analytics and Reporting (1.1 System Overview/System Architecture)
 */
interface AnalyticsDashboardProps {
  initialDateRange?: {
    startDate: string,
    endDate: string,
  };
}

/**
 * Analytics Dashboard page component that displays comprehensive analytics and metrics
 * Implements requirements:
 * - Analytics and Reporting (1.1 System Overview/System Architecture)
 * - System Metrics (Appendices/C. System Metrics)
 */
const AnalyticsDashboard: NextPage<AnalyticsDashboardProps> = ({ initialDateRange }) => {
  // State management for date range and metrics
  const [dateRange, setDateRange] = useState<DateRange>(
    initialDateRange ? { startDate: new Date(initialDateRange.startDate), endDate: new Date(initialDateRange.endDate) } : {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      endDate: new Date()
    }
  );
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /**
   * Handler for date range changes
   * Requirement: Analytics and Reporting - Time-based analytics filtering
   */
  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
  };

  /**
   * Handler for metrics data loading
   * Requirement: System Metrics - Display of performance metrics
   */
  const handleMetricsLoad = useCallback((newMetrics: AnalyticsMetrics) => {
    setMetrics(newMetrics);
    setIsLoading(false);
  }, []);

  return (
    <>
      <Head>
        <title>Analytics Dashboard | PantryChef</title>
        <meta name="description" content="Comprehensive analytics and metrics for PantryChef" />
      </Head>

      <>
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Comprehensive overview of system metrics and usage statistics
            </p>
          </div>

          {/* Usage Metrics Section */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Usage Metrics</h2>
            <UsageMetrics
              timeRange={dateRange}
              onMetricsLoad={handleMetricsLoad}
              className="mb-8"
            />
          </section>

          {/* User Activity Charts Section */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">User Activity</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {metrics ? (
                <>
                  {/* Active Users Trend */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <AnalyticsChart
                      chartType="line"
                      data={metrics}
                      title="Active Users Trend"
                      chartConfig={{
                        height: 300,
                        showLegend: true,
                      }}
                    />
                  </div>

                  {/* Feature Usage Distribution */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <AnalyticsChart
                      chartType="bar"
                      data={metrics}
                      title="Feature Usage Distribution"
                      chartConfig={{
                        height: 300,
                        showLegend: true,
                      }}
                    />
                  </div>
                </>
              ) : (
                <Card className="p-4">
                  <p className="text-gray-500">No metrics data available</p>
                </Card>
              )
              }
            </div>
          </section>

          {/* Inventory Statistics Section */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Inventory Analytics</h2>
            <InventoryStats
              timeRange={dateRange}
              className="bg-white rounded-lg shadow-sm p-6"
            />
          </section>
        </div>
      </>
    </>
  );
};

/**
 * Server-side props function for initial data fetching and authentication
 * Requirement: Analytics and Reporting - Secure access to analytics data
 */
export const getServerSideProps: GetServerSideProps<AnalyticsDashboardProps> = async (context) => {
  try {
    // Check authentication status
    const { req } = context;
    // Add your authentication check logic here
    // Redirect to login if not authenticated
    // if (!isAuthenticated(req)) {
    //   return {
    //     redirect: {
    //       destination: '/login',
    //       permanent: false,
    //     },
    //   };
    // }

    // Calculate default date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      props: {
        initialDateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      }
    };
  }
  catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      redirect: {
        destination: '/error',
        permanent: false,
      },

    };
  }
};

export default AnalyticsDashboard;