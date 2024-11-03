/**
 * HUMAN TASKS:
 * 1. Configure analytics service endpoints in environment variables
 * 2. Set up WebSocket connection for real-time metrics updates
 * 3. Configure caching policies for dashboard data
 * 4. Verify proper error tracking setup
 */

import React, { useState, useEffect, useCallback } from 'react'; // ^18.0.0
import { useRouter } from 'next/router'; // ^13.0.0
import MainLayout from '../../components/layout/MainLayout';
import UsageMetrics from '../../components/analytics/UsageMetrics';
import ExpirationTracker from '../../components/pantry/ExpirationTracker';
import RecipeGrid from '../../components/recipe/RecipeGrid';
import useAuth from '../../hooks/useAuth';
import { DashboardMetrics } from '../../interfaces/analytics.interface';
import { Recipe, RecipeFilter } from '../../interfaces/recipe.interface';
import { useRecipes } from '../../hooks/useRecipes';

/**
 * Main dashboard page component that provides an overview of the PantryChef system
 * Implements requirements:
 * - Web Dashboard (1.1): Comprehensive overview of system status
 * - Digital Pantry Management (1.2): Expiration tracking and inventory overview
 * - Recipe Discovery (1.2): Smart recipe matching and recommendations
 */
const DashboardPage: React.FC = () => {
  // Authentication and routing
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  // Dashboard state management
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [dateRange] = useState({ 
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
    end: new Date() 
  });

  // Recipe management
  const { recipes, loading: recipesLoading, fetchRecipes } = useRecipes();
  const [recipeFilters, setRecipeFilters] = useState<RecipeFilter>({
    difficulty: [],
    maxPrepTime: 0,
    maxCookTime: 0,
    tags: [],
    ingredients: [],
    searchTerm: ''
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  /**
   * Handle metrics data updates
   * Implements requirement: Web Dashboard - Real-time updates for metrics
   */
  const handleMetricsLoad = useCallback((newMetrics: DashboardMetrics) => {
    setMetrics(newMetrics);
  }, []);

  /**
   * Handle recipe selection
   * Implements requirement: Recipe Discovery - Recipe details navigation
   */
  const handleRecipeSelect = useCallback((recipeId: string) => {
    router.push(`/dashboard/recipes/${recipeId}`);
  }, [router]);

  /**
   * Handle recipe filter changes
   * Implements requirement: Recipe Discovery - Smart recipe matching
   */
  const handleFilterChange = useCallback((filters: RecipeFilter) => {
    setRecipeFilters(filters);
    fetchRecipes(filters);
  }, [fetchRecipes]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name}
          </h1>
          <p className="mt-2 text-gray-600">
            Here's an overview of your PantryChef system
          </p>
        </div>

        {/* Usage Metrics Section */}
        <section aria-label="Usage Metrics">
          <UsageMetrics
            timeRange={dateRange}
            onMetricsLoad={handleMetricsLoad}
            className="bg-white rounded-lg shadow-sm"
          />
        </section>

        {/* Expiring Items Section */}
        <section aria-label="Expiring Items">
          <ExpirationTracker
            daysThreshold={7}
            className="bg-white rounded-lg shadow-sm"
          />
        </section>

        {/* Recommended Recipes Section */}
        <section aria-label="Recommended Recipes">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">
              Recommended Recipes
            </h2>
            <RecipeGrid
              recipes={recipes}
              loading={recipesLoading}
              onRecipeSelect={handleRecipeSelect}
              onFilterChange={handleFilterChange}
            />
          </div>
        </section>
      </div>
    </MainLayout>
  );
};

export default DashboardPage;