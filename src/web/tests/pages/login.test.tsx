// @version @testing-library/react ^13.0.0
// @version @jest/globals ^29.0.0
// @version react-redux ^8.0.0

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest, describe, it, beforeEach, expect } from '@jest/globals';
import { Provider } from 'react-redux';
import LoginPage from '../../src/pages/login';
import { useAuth } from '../../src/hooks/useAuth';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    query: {}
  })
}));

// Mock authentication hook
jest.mock('../../src/hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

// Constants for testing
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';
const DASHBOARD_ROUTE = '/dashboard';
const TEST_JWT = 'mock.jwt.token';

/**
 * Test suite for login page component with JWT authentication
 * Addresses requirements:
 * - Authentication Flow: Validates client-side JWT-based authentication flow
 * - Access Control Measures: Verifies secure authentication interface
 * - Frontend UI Framework: Validates Material Design compliance
 */
describe('LoginPage', () => {
  // Mock store setup for Redux Provider
  const mockStore = {
    getState: () => ({}),
    subscribe: jest.fn(),
    dispatch: jest.fn()
  };

  // Mock auth hook implementation
  const mockAuthHook = {
    login: jest.fn(),
    isAuthenticated: false,
    user: null,
    loading: false,
    error: null
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup default auth hook mock
    (useAuth as jest.Mock).mockImplementation(() => mockAuthHook);
  });

  /**
   * Test case verifying login form rendering and Material Design compliance
   * Addresses requirement: Frontend UI Framework - Material Design implementation
   */
  it('renders login form correctly', async () => {
    render(
      <Provider store={mockStore}>
        <LoginPage />
      </Provider>
    );

    // Verify form header
    expect(screen.getByText(/Welcome to PantryChef/i)).toBeInTheDocument();
    
    // Verify email input with Material Design styling
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveClass('md-input'); // Material Design class
    
    // Verify password input with Material Design styling
    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveClass('md-input'); // Material Design class
    
    // Verify submit button with Material Design styling
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveClass('md-button'); // Material Design class
    
    // Verify form layout matches Material Design specifications
    const form = screen.getByRole('form');
    expect(form).toHaveClass('space-y-6'); // Material Design spacing
  });

  /**
   * Test case for JWT-based form submission behavior
   * Addresses requirement: Authentication Flow - JWT-based authentication
   */
  it('handles form submission correctly', async () => {
    render(
      <Provider store={mockStore}>
        <LoginPage />
      </Provider>
    );

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: TEST_EMAIL }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: TEST_PASSWORD }
    });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Verify login function was called with correct credentials
    await waitFor(() => {
      expect(mockAuthHook.login).toHaveBeenCalledWith({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });
    });

    // Verify JWT token storage
    await waitFor(() => {
      expect(document.cookie).toContain('auth-token');
    });
  });

  /**
   * Test case for form validation errors
   * Addresses requirement: Access Control Measures - Input validation
   */
  it('displays validation errors', async () => {
    render(
      <Provider store={mockStore}>
        <LoginPage />
      </Provider>
    );

    // Submit empty form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Verify error messages
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    // Test invalid email format
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'invalid-email' }
    });
    fireEvent.blur(screen.getByLabelText(/email/i));

    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });

    // Test password length requirement
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: '123' }
    });
    fireEvent.blur(screen.getByLabelText(/password/i));

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });

    // Verify error message styling matches Material Design
    const errorMessages = screen.getAllByRole('alert');
    errorMessages.forEach(error => {
      expect(error).toHaveClass('md-error-text'); // Material Design error styling
    });
  });

  /**
   * Test case for authenticated user redirection
   * Addresses requirement: Authentication Flow - Session management
   */
  it('redirects authenticated users', async () => {
    // Mock authenticated state
    (useAuth as jest.Mock).mockImplementation(() => ({
      ...mockAuthHook,
      isAuthenticated: true,
      user: { id: '1', email: TEST_EMAIL }
    }));

    const mockRouter = {
      push: jest.fn(),
      query: {}
    };
    (require('next/router').useRouter as jest.Mock).mockImplementation(() => mockRouter);

    render(
      <Provider store={mockStore}>
        <LoginPage />
      </Provider>
    );

    // Verify automatic redirection to dashboard
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(DASHBOARD_ROUTE);
    });

    // Verify JWT token presence in redirection
    expect(document.cookie).toContain('auth-token');
  });

  /**
   * Test case for loading state during authentication
   * Addresses requirement: Frontend UI Framework - Loading state handling
   */
  it('displays loading state during authentication', async () => {
    // Mock loading state
    (useAuth as jest.Mock).mockImplementation(() => ({
      ...mockAuthHook,
      loading: true
    }));

    render(
      <Provider store={mockStore}>
        <LoginPage />
      </Provider>
    );

    // Verify loading indicator with Material Design styling
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveClass('md-circular-progress');
  });

  /**
   * Test case for authentication error handling
   * Addresses requirement: Access Control Measures - Error handling
   */
  it('handles authentication errors correctly', async () => {
    const errorMessage = 'Invalid credentials';
    (useAuth as jest.Mock).mockImplementation(() => ({
      ...mockAuthHook,
      error: errorMessage
    }));

    render(
      <Provider store={mockStore}>
        <LoginPage />
      </Provider>
    );

    // Verify error message display with Material Design styling
    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent(errorMessage);
    expect(errorAlert).toHaveClass('md-error-alert');
  });

  /**
   * Test case for custom redirect URL handling
   * Addresses requirement: Authentication Flow - Redirect handling
   */
  it('handles custom redirect URLs', async () => {
    const customRedirect = '/custom-page';
    const mockRouter = {
      push: jest.fn(),
      query: { redirect: customRedirect }
    };
    (require('next/router').useRouter as jest.Mock).mockImplementation(() => mockRouter);

    // Mock successful authentication
    (useAuth as jest.Mock).mockImplementation(() => ({
      ...mockAuthHook,
      isAuthenticated: true,
      user: { id: '1', email: TEST_EMAIL }
    }));

    render(
      <Provider store={mockStore}>
        <LoginPage redirectUrl={customRedirect} />
      </Provider>
    );

    // Verify redirection to custom URL
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(customRedirect);
    });
  });
});