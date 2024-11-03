// External dependencies
// @version jest ^29.0.0
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
// @version axios-mock-adapter ^1.21.0
import MockAdapter from 'axios-mock-adapter';

// Internal dependencies
import { apiClient, handleApiError } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/config/api';

// Constants for testing
const TOKEN_STORAGE_KEY = 'auth_token';
const REFRESH_TOKEN_STORAGE_KEY = 'refresh_token';
const TEST_TOKEN = 'test-jwt-token';
const TEST_REFRESH_TOKEN = 'test-refresh-token';

/**
 * HUMAN TASKS:
 * 1. Ensure test environment variables are properly configured
 * 2. Set up test database with sample data if needed
 * 3. Configure test coverage thresholds in jest.config.js
 */

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Initialize axios mock
const mockAxios = new MockAdapter(apiClient);

describe('apiClient', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockAxios.reset();
  });

  afterEach(() => {
    mockAxios.reset();
    localStorageMock.clear();
  });

  // Requirement: API Integration Testing - Validates API client functionality
  test('should add auth header when token exists', async () => {
    // Setup
    localStorageMock.setItem(TOKEN_STORAGE_KEY, TEST_TOKEN);
    mockAxios.onGet(API_ENDPOINTS.USER.PROFILE).reply(config => {
      // Verify Authorization header
      expect(config.headers?.Authorization).toBe(`Bearer ${TEST_TOKEN}`);
      return [200, { id: 1, name: 'Test User' }];
    });

    // Execute
    await apiClient.get(API_ENDPOINTS.USER.PROFILE);

    // Verify
    expect(mockAxios.history.get.length).toBe(1);
  });

  // Requirement: Security Testing - Verifies secure API communication
  test('should handle token refresh on 401', async () => {
    // Setup
    localStorageMock.setItem(TOKEN_STORAGE_KEY, 'expired-token');
    localStorageMock.setItem(REFRESH_TOKEN_STORAGE_KEY, TEST_REFRESH_TOKEN);

    // Mock initial 401 response
    mockAxios.onGet(API_ENDPOINTS.PANTRY.LIST).replyOnce(401);

    // Mock successful token refresh
    mockAxios.onPost(API_ENDPOINTS.AUTH.REFRESH).replyOnce(200, {
      token: TEST_TOKEN,
      refreshToken: 'new-refresh-token'
    });

    // Mock successful retry with new token
    mockAxios.onGet(API_ENDPOINTS.PANTRY.LIST).replyOnce(200, []);

    // Execute
    await apiClient.get(API_ENDPOINTS.PANTRY.LIST);

    // Verify
    expect(mockAxios.history.post.length).toBe(1);
    expect(mockAxios.history.get.length).toBe(2);
    expect(localStorageMock.getItem(TOKEN_STORAGE_KEY)).toBe(TEST_TOKEN);
  });

  // Requirement: Error Handling Testing - Tests network error handling
  test('should handle network errors', async () => {
    // Setup
    mockAxios.onGet(API_ENDPOINTS.RECIPES.LIST).networkError();

    // Execute & Verify
    await expect(apiClient.get(API_ENDPOINTS.RECIPES.LIST))
      .rejects
      .toThrow('Network error - no response received');
  });

  // Requirement: Security Testing - Verifies token removal on auth failure
  test('should clear tokens and redirect on refresh failure', async () => {
    // Setup
    localStorageMock.setItem(TOKEN_STORAGE_KEY, 'expired-token');
    localStorageMock.setItem(REFRESH_TOKEN_STORAGE_KEY, 'expired-refresh-token');

    // Mock failed requests
    mockAxios.onGet(API_ENDPOINTS.USER.PROFILE).replyOnce(401);
    mockAxios.onPost(API_ENDPOINTS.AUTH.REFRESH).replyOnce(401);

    // Mock window.location.href
    const locationSpy = jest.spyOn(window.location, 'href', 'set');

    // Execute
    try {
      await apiClient.get(API_ENDPOINTS.USER.PROFILE);
    } catch (error) {
      // Verify tokens are cleared
      expect(localStorageMock.getItem(TOKEN_STORAGE_KEY)).toBeNull();
      expect(localStorageMock.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
      // Verify redirect
      expect(locationSpy).toHaveBeenCalledWith('/login');
    }
  });
});

describe('handleApiError', () => {
  // Requirement: Error Handling Testing - Verifies error transformation
  test('should transform API errors with status codes', () => {
    // Test cases for different status codes
    const testCases = [
      {
        status: 400,
        response: { message: 'Invalid data' },
        expected: { message: 'Invalid data', code: 'ERR_BAD_REQUEST' }
      },
      {
        status: 401,
        response: {},
        expected: { message: 'Authentication required', code: 'ERR_UNAUTHORIZED' }
      },
      {
        status: 403,
        response: {},
        expected: { message: 'Access denied', code: 'ERR_FORBIDDEN' }
      },
      {
        status: 404,
        response: {},
        expected: { message: 'Resource not found', code: 'ERR_NOT_FOUND' }
      },
      {
        status: 429,
        response: {},
        expected: { message: 'Too many requests', code: 'ERR_RATE_LIMIT' }
      },
      {
        status: 500,
        response: {},
        expected: { message: 'Internal server error', code: 'ERR_SERVER' }
      }
    ];

    testCases.forEach(({ status, response, expected }) => {
      const axiosError = {
        response: {
          status,
          data: response
        }
      } as any;

      const error = handleApiError(axiosError);
      expect(error.message).toBe(expected.message);
      expect(error.name).toBe(expected.code);
    });
  });

  // Requirement: Error Handling Testing - Tests custom error handling
  test('should handle custom error responses', () => {
    const customError = {
      response: {
        status: 422,
        data: {
          message: 'Custom validation error',
          code: 'ERR_VALIDATION'
        }
      }
    } as any;

    const error = handleApiError(customError);
    expect(error.message).toBe('Custom validation error');
    expect(error.name).toBe('ERR_VALIDATION');
  });

  // Requirement: Error Handling Testing - Tests network error scenarios
  test('should handle request errors without response', () => {
    const networkError = {
      request: {},
      response: undefined
    } as any;

    const error = handleApiError(networkError);
    expect(error.message).toBe('Network error - no response received');
    expect(error.name).toBe('ERR_NETWORK');
  });

  // Requirement: Error Handling Testing - Tests unknown error scenarios
  test('should handle unknown errors', () => {
    const unknownError = {} as any;

    const error = handleApiError(unknownError);
    expect(error.message).toBe('An unexpected error occurred');
    expect(error.name).toBe('ERR_UNKNOWN');
  });
});