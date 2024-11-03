// @version jest ^29.0.0
// @version axios-mock-adapter ^1.21.0
// @version jwt-decode ^3.1.2

import { describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import MockAdapter from 'axios-mock-adapter';
import jwtDecode from 'jwt-decode';

import { AuthService } from '../../src/services/auth.service';
import { LoginCredentials, SignupCredentials, AuthResponse } from '../../src/interfaces/auth.interface';
import { API_ENDPOINTS } from '../../src/config/api';
import { apiClient } from '../../src/utils/api';

/**
 * HUMAN TASKS:
 * 1. Configure test environment variables for API endpoints
 * 2. Set up test database with sample user data
 * 3. Configure mock OAuth providers for testing
 * 4. Set up SSL certificates for test environment
 */

describe('AuthService', () => {
  let authService: AuthService;
  let mockAxios: MockAdapter;

  // Mock storage implementation
  const mockStorage = (() => {
    let store: { [key: string]: string } = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; }
    };
  })();

  // Sample test data
  const mockLoginCredentials: LoginCredentials = {
    email: 'test@example.com',
    password: 'Password123!',
    rememberMe: true
  };

  const mockSignupCredentials: SignupCredentials = {
    email: 'newuser@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    firstName: 'John',
    lastName: 'Doe'
  };

  const mockAuthResponse: AuthResponse = {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE2MzQ1Njc4OTAsImV4cCI6MTYzNDU3MTQ5MH0',
    refreshToken: 'refresh_token_123',
    expiresIn: 3600,
    user: {
      id: '123456',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe'
    }
  };

  beforeEach(() => {
    // Initialize mocks and service
    mockAxios = new MockAdapter(apiClient);
    authService = new AuthService();

    // Mock localStorage and sessionStorage
    Object.defineProperty(window, 'localStorage', { value: mockStorage });
    Object.defineProperty(window, 'sessionStorage', { value: mockStorage });

    // Clear storage before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    // Reset all mocks
    mockAxios.reset();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('login', () => {
    // Requirement: Authentication Service Testing - Login functionality
    it('should successfully login with valid credentials', async () => {
      mockAxios.onPost(API_ENDPOINTS.AUTH.LOGIN).reply(200, mockAuthResponse);

      const response = await authService.login(mockLoginCredentials);

      expect(response).toEqual(mockAuthResponse);
      expect(localStorage.getItem('auth_token')).toBe(mockAuthResponse.token);
      expect(localStorage.getItem('refresh_token')).toBe(mockAuthResponse.refreshToken);
    });

    // Requirement: Authentication Service Testing - Token storage
    it('should store tokens in localStorage when rememberMe is true', async () => {
      mockAxios.onPost(API_ENDPOINTS.AUTH.LOGIN).reply(200, mockAuthResponse);

      await authService.login({ ...mockLoginCredentials, rememberMe: true });

      expect(localStorage.getItem('auth_token')).toBe(mockAuthResponse.token);
      expect(localStorage.getItem('refresh_token')).toBe(mockAuthResponse.refreshToken);
      expect(sessionStorage.getItem('auth_token')).toBeNull();
    });

    // Requirement: Authentication Service Testing - Token storage
    it('should store tokens in sessionStorage when rememberMe is false', async () => {
      mockAxios.onPost(API_ENDPOINTS.AUTH.LOGIN).reply(200, mockAuthResponse);

      await authService.login({ ...mockLoginCredentials, rememberMe: false });

      expect(sessionStorage.getItem('auth_token')).toBe(mockAuthResponse.token);
      expect(sessionStorage.getItem('refresh_token')).toBe(mockAuthResponse.refreshToken);
      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    // Requirement: Authentication Service Testing - Error handling
    it('should throw error with invalid credentials', async () => {
      mockAxios.onPost(API_ENDPOINTS.AUTH.LOGIN).reply(401);

      await expect(authService.login(mockLoginCredentials))
        .rejects.toThrow('Authentication failed');
    });

    // Requirement: Authentication Service Testing - Network errors
    it('should handle network errors', async () => {
      mockAxios.onPost(API_ENDPOINTS.AUTH.LOGIN).networkError();

      await expect(authService.login(mockLoginCredentials))
        .rejects.toThrow('Authentication failed');
    });

    // Requirement: Authentication Service Testing - Validation
    it('should validate email format', async () => {
      await expect(authService.login({ ...mockLoginCredentials, email: 'invalid-email' }))
        .rejects.toThrow('Invalid credentials format');
    });
  });

  describe('signup', () => {
    // Requirement: Authentication Service Testing - Signup functionality
    it('should successfully create new account', async () => {
      mockAxios.onPost(API_ENDPOINTS.AUTH.SIGNUP).reply(200, mockAuthResponse);

      const response = await authService.signup(mockSignupCredentials);

      expect(response).toEqual(mockAuthResponse);
      expect(sessionStorage.getItem('auth_token')).toBe(mockAuthResponse.token);
    });

    // Requirement: Authentication Service Testing - Password validation
    it('should validate password confirmation', async () => {
      await expect(authService.signup({
        ...mockSignupCredentials,
        confirmPassword: 'different'
      })).rejects.toThrow('Passwords do not match');
    });

    // Requirement: Authentication Service Testing - Password strength
    it('should validate password strength requirements', async () => {
      await expect(authService.signup({
        ...mockSignupCredentials,
        password: 'weak',
        confirmPassword: 'weak'
      })).rejects.toThrow('Password must be at least 8 characters long');
    });

    // Requirement: Authentication Service Testing - Error handling
    it('should handle duplicate email error', async () => {
      mockAxios.onPost(API_ENDPOINTS.AUTH.SIGNUP).reply(409);

      await expect(authService.signup(mockSignupCredentials))
        .rejects.toThrow('Registration failed');
    });
  });

  describe('logout', () => {
    // Requirement: Authentication Service Testing - Logout functionality
    it('should clear tokens from localStorage', async () => {
      localStorage.setItem('auth_token', mockAuthResponse.token);
      localStorage.setItem('refresh_token', mockAuthResponse.refreshToken);
      mockAxios.onPost(API_ENDPOINTS.AUTH.LOGOUT).reply(200);

      await authService.logout();

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });

    // Requirement: Authentication Service Testing - Logout functionality
    it('should clear tokens from sessionStorage', async () => {
      sessionStorage.setItem('auth_token', mockAuthResponse.token);
      sessionStorage.setItem('refresh_token', mockAuthResponse.refreshToken);
      mockAxios.onPost(API_ENDPOINTS.AUTH.LOGOUT).reply(200);

      await authService.logout();

      expect(sessionStorage.getItem('auth_token')).toBeNull();
      expect(sessionStorage.getItem('refresh_token')).toBeNull();
    });

    // Requirement: Authentication Service Testing - Error handling
    it('should handle network errors during logout', async () => {
      localStorage.setItem('auth_token', mockAuthResponse.token);
      mockAxios.onPost(API_ENDPOINTS.AUTH.LOGOUT).networkError();

      await authService.logout();

      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('refreshToken', () => {
    // Requirement: Security Testing - Token refresh
    it('should successfully refresh token', async () => {
      const newAuthResponse = {
        ...mockAuthResponse,
        token: 'new_token_123',
        refreshToken: 'new_refresh_token_123'
      };

      localStorage.setItem('refresh_token', mockAuthResponse.refreshToken);
      mockAxios.onPost(API_ENDPOINTS.AUTH.REFRESH).reply(200, newAuthResponse);

      const response = await authService.refreshToken();

      expect(response).toEqual(newAuthResponse);
      expect(localStorage.getItem('auth_token')).toBe(newAuthResponse.token);
      expect(localStorage.getItem('refresh_token')).toBe(newAuthResponse.refreshToken);
    });

    // Requirement: Security Testing - Token validation
    it('should handle invalid refresh token', async () => {
      localStorage.setItem('refresh_token', 'invalid_token');

      await expect(authService.refreshToken())
        .rejects.toThrow('Token refresh failed');
    });

    // Requirement: Security Testing - Token expiration
    it('should handle expired refresh token', async () => {
      mockAxios.onPost(API_ENDPOINTS.AUTH.REFRESH).reply(401);

      await expect(authService.refreshToken())
        .rejects.toThrow('Token refresh failed');
    });
  });

  describe('isAuthenticated', () => {
    // Requirement: Security Testing - Authentication status
    it('should return true with valid token', () => {
      localStorage.setItem('auth_token', mockAuthResponse.token);

      expect(authService.isAuthenticated()).toBe(true);
    });

    // Requirement: Security Testing - Token expiration
    it('should return false with expired token', () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE2MzQ1Njc4OTAsImV4cCI6MTYzNDU2Nzg5MH0';
      localStorage.setItem('auth_token', expiredToken);

      expect(authService.isAuthenticated()).toBe(false);
    });

    // Requirement: Security Testing - Token validation
    it('should return false with no token', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    // Requirement: Security Testing - Token format
    it('should return false with invalid token format', () => {
      localStorage.setItem('auth_token', 'invalid_token_format');

      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('getToken', () => {
    // Requirement: Security Testing - Token retrieval
    it('should return token from localStorage if present', () => {
      localStorage.setItem('auth_token', mockAuthResponse.token);

      expect(authService.getToken()).toBe(mockAuthResponse.token);
    });

    // Requirement: Security Testing - Token retrieval
    it('should return token from sessionStorage if present', () => {
      sessionStorage.setItem('auth_token', mockAuthResponse.token);

      expect(authService.getToken()).toBe(mockAuthResponse.token);
    });

    // Requirement: Security Testing - Token retrieval
    it('should return null if no token exists', () => {
      expect(authService.getToken()).toBeNull();
    });

    // Requirement: Security Testing - Token storage priority
    it('should prioritize localStorage over sessionStorage', () => {
      localStorage.setItem('auth_token', 'local_token');
      sessionStorage.setItem('auth_token', 'session_token');

      expect(authService.getToken()).toBe('local_token');
    });
  });
});