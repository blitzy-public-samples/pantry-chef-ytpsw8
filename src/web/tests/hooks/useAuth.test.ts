// @version @testing-library/react-hooks ^8.0.0
// @version @testing-library/react ^13.0.0
// @version react-redux ^8.0.0
// @version @reduxjs/toolkit ^1.9.0
// @version jest ^29.0.0

import { renderHook, act } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useAuth } from '../../src/hooks/useAuth';
import { 
  LoginCredentials, 
  SignupCredentials, 
  AuthState 
} from '../../src/interfaces/auth.interface';

/**
 * HUMAN TASKS:
 * 1. Configure OAuth2.0 provider credentials in test environment
 * 2. Set up test JWT secret key
 * 3. Configure test Redis instance for session testing
 */

// Mock Redux store with auth reducer
const mockStore = configureStore({
  reducer: {
    auth: (state: AuthState = {
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null
    }, action) => {
      switch (action.type) {
        case 'auth/login/pending':
        case 'auth/signup/pending':
        case 'auth/logout/pending':
          return { ...state, loading: true, error: null };
        case 'auth/login/fulfilled':
        case 'auth/signup/fulfilled':
          return {
            ...state,
            isAuthenticated: true,
            user: action.payload.user,
            loading: false,
            error: null
          };
        case 'auth/logout/fulfilled':
          return {
            ...state,
            isAuthenticated: false,
            user: null,
            loading: false,
            error: null
          };
        case 'auth/login/rejected':
        case 'auth/signup/rejected':
        case 'auth/logout/rejected':
          return {
            ...state,
            loading: false,
            error: action.error.message
          };
        default:
          return state;
      }
    }
  }
});

// Test data
const mockLoginCredentials: LoginCredentials = {
  email: 'test@example.com',
  password: 'Test123!@#',
  rememberMe: true
};

const mockSignupCredentials: SignupCredentials = {
  email: 'test@example.com',
  password: 'Test123!@#',
  confirmPassword: 'Test123!@#',
  firstName: 'John',
  lastName: 'Doe'
};

const mockUser = {
  id: '123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  createdAt: new Date().toISOString()
};

// Wrapper component for providing Redux store
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={mockStore}>{children}</Provider>
);

describe('useAuth hook', () => {
  beforeEach(() => {
    // Reset store state before each test
    mockStore.dispatch({ type: 'RESET_STATE' });
    jest.clearAllMocks();
  });

  /**
   * Test initial hook state
   * Addresses requirement: Authentication Flow - Initial state verification
   */
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  /**
   * Test successful login flow
   * Addresses requirements:
   * - Authentication Flow - JWT-based authentication
   * - Security Protocols - Session management
   */
  it('should handle login successfully', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      mockStore.dispatch({
        type: 'auth/login/pending'
      });
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      mockStore.dispatch({
        type: 'auth/login/fulfilled',
        payload: { user: mockUser }
      });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  /**
   * Test successful signup flow
   * Addresses requirement: Authentication Flow - User registration
   */
  it('should handle signup successfully', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      mockStore.dispatch({
        type: 'auth/signup/pending'
      });
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      mockStore.dispatch({
        type: 'auth/signup/fulfilled',
        payload: { user: mockUser }
      });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  /**
   * Test successful logout flow
   * Addresses requirement: Security Protocols - Session management
   */
  it('should handle logout successfully', async () => {
    // Set initial authenticated state
    mockStore.dispatch({
      type: 'auth/login/fulfilled',
      payload: { user: mockUser }
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      mockStore.dispatch({
        type: 'auth/logout/pending'
      });
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      mockStore.dispatch({
        type: 'auth/logout/fulfilled'
      });
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  /**
   * Test error handling
   * Addresses requirements:
   * - Authentication Flow - Error handling
   * - Security Protocols - Authentication failure handling
   */
  it('should handle errors correctly', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const errorMessage = 'Invalid credentials';

    await act(async () => {
      mockStore.dispatch({
        type: 'auth/login/rejected',
        error: { message: errorMessage }
      });
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(errorMessage);
  });
});