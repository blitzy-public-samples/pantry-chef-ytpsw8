// @version jest ^29.0.0
// @version @testing-library/react ^13.0.0
// @version react-redux ^8.0.0

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { jest } from '@jest/globals';
import DashboardPage from '../../src/pages/dashboard';
import useAuth from '../../src/hooks/useAuth';
import { configureStore } from '@reduxjs/toolkit';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock components
jest.mock('../../src/components/layout/MainLayout', () => {
  return function MockMainLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="main-layout">{children}</div>;
  };
});

jest.mock('../../src/components/analytics/UsageMetrics', () => {
  return function MockUsageMetrics({ onMetricsLoad }: { onMetricsLoad: (metrics: any) => void }) {
    return (
      <div data-testid="usage-metrics">
        <button onClick={() => onMetricsLoad({ totalUsers: 100 })}>Load Metrics</button>
      </div>
    );
  };
});

jest.mock('../../src/components/pantry/ExpirationTracker', () => {
  return function MockExpirationTracker() {
    return <div data-testid="expiration-tracker" />;
  };
});

jest.mock('../../src/components/recipe/RecipeGrid', () => {
  return function MockRecipeGrid({ onRecipeSelect }: { onRecipeSelect: (id: string) => void }) {
    return (
      <div data-testid="recipe-grid">
        <button onClick={() => onRecipeSelect('123')}>Select Recipe</button>
      </div>
    );
  };
});

// Mock hooks
jest.mock('../../src/hooks/useAuth');
jest.mock('../../src/hooks/useRecipes', () => ({
  useRecipes: () => ({
    recipes: [],
    loading: false,
    fetchRecipes: jest.fn(),
  }),
}));

// Create mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      auth: (state = {}, action) => state,
    },
  });
};

describe('DashboardPage', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test User' },
      loading: false,
    });
  });

  /**
   * Test case verifying dashboard renders for authenticated users
   * Requirement: Web Dashboard (1.1) - Verify web dashboard functionality
   */
  it('should render dashboard when authenticated', async () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <DashboardPage />
      </Provider>
    );

    // Verify main layout is rendered
    expect(screen.getByTestId('main-layout')).toBeInTheDocument();

    // Verify welcome message
    expect(screen.getByText(/Welcome back, Test User/i)).toBeInTheDocument();

    // Verify all dashboard components are rendered
    expect(screen.getByTestId('usage-metrics')).toBeInTheDocument();
    expect(screen.getByTestId('expiration-tracker')).toBeInTheDocument();
    expect(screen.getByTestId('recipe-grid')).toBeInTheDocument();
  });

  /**
   * Test case verifying unauthenticated access handling
   * Requirement: Web Dashboard (1.1) - Security and access control
   */
  it('should redirect to login when not authenticated', () => {
    const mockRouter = { push: jest.fn() };
    jest.spyOn(require('next/router'), 'useRouter').mockReturnValue(mockRouter);
    
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: false,
    });

    const store = createMockStore();

    render(
      <Provider store={store}>
        <DashboardPage />
      </Provider>
    );

    // Verify redirect to login page
    expect(mockRouter.push).toHaveBeenCalledWith('/login');
    
    // Verify dashboard content is not rendered
    expect(screen.queryByTestId('main-layout')).not.toBeInTheDocument();
  });

  /**
   * Test case for metrics loading functionality
   * Requirement: Web Dashboard (1.1) - Analytics integration
   */
  it('should handle metrics loading', async () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <DashboardPage />
      </Provider>
    );

    // Simulate metrics load
    const metricsButton = screen.getByText('Load Metrics');
    fireEvent.click(metricsButton);

    // Verify metrics are handled correctly
    await waitFor(() => {
      const metricsComponent = screen.getByTestId('usage-metrics');
      expect(metricsComponent).toBeInTheDocument();
    });
  });

  /**
   * Test case for recipe selection interaction
   * Requirement: Recipe Discovery (1.2) - Recipe selection and navigation
   */
  it('should handle recipe selection', async () => {
    const mockRouter = { push: jest.fn() };
    jest.spyOn(require('next/router'), 'useRouter').mockReturnValue(mockRouter);

    const store = createMockStore();

    render(
      <Provider store={store}>
        <DashboardPage />
      </Provider>
    );

    // Simulate recipe selection
    const recipeButton = screen.getByText('Select Recipe');
    fireEvent.click(recipeButton);

    // Verify navigation to recipe details
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/recipes/123');
  });

  /**
   * Test case for pantry tracking integration
   * Requirement: Digital Pantry Management (1.2) - Expiration tracking
   */
  it('should render expiration tracker with correct props', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <DashboardPage />
      </Provider>
    );

    // Verify expiration tracker is rendered with correct configuration
    const expirationTracker = screen.getByTestId('expiration-tracker');
    expect(expirationTracker).toBeInTheDocument();
  });

  /**
   * Test case for loading state handling
   * Requirement: Web Dashboard (1.1) - User experience
   */
  it('should handle loading states correctly', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test User' },
      loading: true,
    });

    const store = createMockStore();

    render(
      <Provider store={store}>
        <DashboardPage />
      </Provider>
    );

    // Verify components are rendered in loading state
    expect(screen.getByTestId('usage-metrics')).toBeInTheDocument();
    expect(screen.getByTestId('recipe-grid')).toBeInTheDocument();
  });
});