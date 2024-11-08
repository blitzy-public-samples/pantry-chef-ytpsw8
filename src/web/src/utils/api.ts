// External dependencies
// @version axios ^1.4.0
import axios, { AxiosInstance, AxiosError } from 'axios';

// Internal dependencies
import { API_ENDPOINTS, API_CONFIG } from '../config/api';
import { AuthResponse } from '../interfaces/auth.interface';
import { APP_ROUTES } from '../config/constants';

// Global constants for token storage and configuration
const TOKEN_STORAGE_KEY = 'auth_token';
const REFRESH_TOKEN_STORAGE_KEY = 'refresh_token';
const API_TIMEOUT = 30000;
const MAX_RETRY_ATTEMPTS = 3;

/**
 * HUMAN TASKS:
 * 1. Configure API base URL in environment variables
 * 2. Set up SSL certificates for API communication
 * 3. Configure rate limiting parameters
 * 4. Set up monitoring for API health checks
 */

// Requirement: API Integration (5.2.1 Client Applications)
// Creates and configures an axios instance with default settings and interceptors
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    ...API_CONFIG,
    timeout: API_TIMEOUT
  });

  // Request interceptor for JWT token authentication
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling and token refresh
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config;

      // Handle token expiration and refresh

      // prevent endless retry?
      if (originalRequest && error.response?.status === 401) {
        try {
          const newTokens = await refreshAuthToken();
          localStorage.setItem(TOKEN_STORAGE_KEY, newTokens.token);
          localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, newTokens.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${newTokens.token}`;
          return client(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
          window.location.href = APP_ROUTES.LOGIN;
          return Promise.reject(refreshError);
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
};

// Requirement: Security Protocols (9.3.1 Access Control Measures)
// Attempts to refresh the authentication token using the refresh token
const refreshAuthToken = async (): Promise<AuthResponse> => {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await axios.post<AuthResponse>(
      `${API_CONFIG.baseURL}${API_ENDPOINTS.AUTH.REFRESH}`,
      { refreshToken }
    );
    return response.data;
  } catch (error) {
    throw new Error('Failed to refresh authentication token');
  }
};

// Requirement: Error Handling (APPENDICES/E. ERROR CODES)
// Processes API error responses and transforms them into standardized error objects
const handleApiError = (error: AxiosError): Error => {
  let errorMessage = 'An unexpected error occurred';
  let errorCode = 'ERR_UNKNOWN';

  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const data = error.response.data as any;

    switch (status) {
      case 400:
        errorMessage = data.message || 'Invalid request';
        errorCode = 'ERR_BAD_REQUEST';
        break;
      case 401:
        errorMessage = 'Authentication required';
        errorCode = 'ERR_UNAUTHORIZED';
        break;
      case 403:
        errorMessage = 'Access denied';
        errorCode = 'ERR_FORBIDDEN';
        break;
      case 404:
        errorMessage = 'Resource not found';
        errorCode = 'ERR_NOT_FOUND';
        break;
      case 429:
        errorMessage = 'Too many requests';
        errorCode = 'ERR_RATE_LIMIT';
        break;
      case 500:
        errorMessage = 'Internal server error';
        errorCode = 'ERR_SERVER';
        break;
      default:
        errorMessage = data.message || errorMessage;
        errorCode = data.code || errorCode;
    }
  } else if (error.request) {
    // Request made but no response received
    errorMessage = 'Network error - no response received';
    errorCode = 'ERR_NETWORK';
  }

  const formattedError = new Error(errorMessage);
  formattedError.name = errorCode;
  return formattedError;
};

// Create and export the configured API client instance
export const apiClient = createApiClient();

// Export error handling utility
export { handleApiError };