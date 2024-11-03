// @version @reduxjs/toolkit ^1.9.5
// @version @jest/globals ^29.0.0

import { configureStore } from '@reduxjs/toolkit';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import reducer, {
  loginThunk,
  signupThunk,
  logoutThunk,
  refreshTokenThunk,
  clearError,
  resetAuth
} from '../../src/store/slices/authSlice';
import { AuthState, LoginCredentials, SignupCredentials, AuthResponse } from '../../src/interfaces/auth.interface';

/**
 * HUMAN TASKS:
 * 1. Configure test environment variables for OAuth2.0 providers
 * 2. Set up test JWT secrets and mock token generation
 * 3. Configure mock Redis session storage for testing
 * 4. Set up test SSL certificates if needed for OAuth testing
 */

// Mock auth service
jest.mock('../../src/services/auth.service', () => {
  return {
    AuthService: jest.fn().mockImplementation(() => ({
      login: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn()
    }))
  };
});

describe('auth slice', () => {
  let store: ReturnType<typeof configureStore>;
  let mockAuthService: jest.Mocked<any>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Configure test store
    store = configureStore({
      reducer: { auth: reducer }
    });
    
    // Get mock auth service instance
    mockAuthService = require('../../src/services/auth.service').AuthService.mock.results[0].value;
  });

  // Test initial state
  test('should return initial state', () => {
    // Requirement: Authentication Service - State management
    const state = store.getState().auth;
    expect(state).toEqual({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null
    });
  });

  // Test login thunk
  describe('login thunk', () => {
    const mockCredentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'password123',
      rememberMe: true
    };

    const mockResponse: AuthResponse = {
      token: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 3600,
      user: {
        id: '123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      }
    };

    test('should handle successful login', async () => {
      // Requirement: Authentication Service - User login functionality
      mockAuthService.login.mockResolvedValueOnce(mockResponse);

      // Dispatch login action
      await store.dispatch(loginThunk(mockCredentials));
      const state = store.getState().auth;

      // Verify state updates
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockResponse.user);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(mockAuthService.login).toHaveBeenCalledWith(mockCredentials);
    });

    test('should handle login failure', async () => {
      // Requirement: Security Protocols - Error handling
      const errorMessage = 'Invalid credentials';
      mockAuthService.login.mockRejectedValueOnce(new Error(errorMessage));

      // Dispatch login action
      await store.dispatch(loginThunk(mockCredentials));
      const state = store.getState().auth;

      // Verify error state
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });

    test('should set loading state during login', () => {
      // Requirement: Authentication Service - Loading state management
      mockAuthService.login.mockImplementationOnce(() => new Promise(() => {}));
      
      // Dispatch login action
      store.dispatch(loginThunk(mockCredentials));
      const state = store.getState().auth;

      // Verify loading state
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  // Test signup thunk
  describe('signup thunk', () => {
    const mockCredentials: SignupCredentials = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };

    const mockResponse: AuthResponse = {
      token: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 3600,
      user: {
        id: '123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      }
    };

    test('should handle successful signup', async () => {
      // Requirement: Authentication Service - User registration
      mockAuthService.signup.mockResolvedValueOnce(mockResponse);

      // Dispatch signup action
      await store.dispatch(signupThunk(mockCredentials));
      const state = store.getState().auth;

      // Verify state updates
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockResponse.user);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(mockAuthService.signup).toHaveBeenCalledWith(mockCredentials);
    });

    test('should handle password mismatch', async () => {
      // Requirement: Authentication Service - Validation
      const invalidCredentials = {
        ...mockCredentials,
        confirmPassword: 'different'
      };

      // Dispatch signup action
      await store.dispatch(signupThunk(invalidCredentials));
      const state = store.getState().auth;

      // Verify error state
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Passwords do not match');
      expect(mockAuthService.signup).not.toHaveBeenCalled();
    });

    test('should handle signup failure', async () => {
      // Requirement: Security Protocols - Error handling
      const errorMessage = 'Email already exists';
      mockAuthService.signup.mockRejectedValueOnce(new Error(errorMessage));

      // Dispatch signup action
      await store.dispatch(signupThunk(mockCredentials));
      const state = store.getState().auth;

      // Verify error state
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  // Test logout thunk
  describe('logout thunk', () => {
    test('should handle successful logout', async () => {
      // Requirement: Session Management - Token and session cleanup
      mockAuthService.logout.mockResolvedValueOnce();

      // Set initial authenticated state
      store.dispatch(loginThunk.fulfilled({
        token: 'token',
        refreshToken: 'refresh',
        expiresIn: 3600,
        user: { id: '123', email: 'test@example.com' }
      }, '', { email: '', password: '', rememberMe: false }));

      // Dispatch logout action
      await store.dispatch(logoutThunk());
      const state = store.getState().auth;

      // Verify state reset
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(mockAuthService.logout).toHaveBeenCalled();
    });

    test('should clear state even on logout failure', async () => {
      // Requirement: Security Protocols - Graceful error handling
      const errorMessage = 'Network error';
      mockAuthService.logout.mockRejectedValueOnce(new Error(errorMessage));

      // Dispatch logout action
      await store.dispatch(logoutThunk());
      const state = store.getState().auth;

      // Verify state is cleared despite error
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  // Test refresh token thunk
  describe('refresh token thunk', () => {
    const mockResponse: AuthResponse = {
      token: 'new-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 3600,
      user: {
        id: '123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      }
    };

    test('should handle successful token refresh', async () => {
      // Requirement: Security Protocols - Token refresh mechanism
      mockAuthService.refreshToken.mockResolvedValueOnce(mockResponse);

      // Dispatch refresh token action
      await store.dispatch(refreshTokenThunk());
      const state = store.getState().auth;

      // Verify state updates
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockResponse.user);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(mockAuthService.refreshToken).toHaveBeenCalled();
    });

    test('should handle refresh token failure', async () => {
      // Requirement: Security Protocols - Token refresh error handling
      const errorMessage = 'Refresh token expired';
      mockAuthService.refreshToken.mockRejectedValueOnce(new Error(errorMessage));

      // Dispatch refresh token action
      await store.dispatch(refreshTokenThunk());
      const state = store.getState().auth;

      // Verify error state
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  // Test reducer actions
  describe('reducer actions', () => {
    test('should clear error state', () => {
      // Requirement: Authentication Service - Error state management
      // Set initial error state
      store.dispatch(loginThunk.rejected(new Error('Test error'), '', { 
        email: '', 
        password: '', 
        rememberMe: false 
      }));

      // Clear error
      store.dispatch(clearError());
      const state = store.getState().auth;

      // Verify error cleared
      expect(state.error).toBeNull();
    });

    test('should reset auth state', () => {
      // Requirement: Authentication Service - State reset
      // Set initial authenticated state
      store.dispatch(loginThunk.fulfilled({
        token: 'token',
        refreshToken: 'refresh',
        expiresIn: 3600,
        user: { id: '123', email: 'test@example.com' }
      }, '', { email: '', password: '', rememberMe: false }));

      // Reset state
      store.dispatch(resetAuth());
      const state = store.getState().auth;

      // Verify state reset
      expect(state).toEqual({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null
      });
    });
  });
});