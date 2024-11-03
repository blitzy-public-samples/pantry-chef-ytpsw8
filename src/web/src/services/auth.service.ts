// External dependencies
// @version jwt-decode ^3.1.2
import jwtDecode from 'jwt-decode';

// Internal dependencies
import { 
  LoginCredentials, 
  SignupCredentials, 
  AuthResponse, 
  TokenPayload 
} from '../interfaces/auth.interface';
import { apiClient } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';

/**
 * HUMAN TASKS:
 * 1. Configure OAuth2.0 providers in environment variables
 * 2. Set up JWT secret and expiration times in configuration
 * 3. Configure secure token storage mechanism
 * 4. Set up SSL certificates for secure authentication
 * 5. Implement rate limiting for authentication endpoints
 */

// Global constants for token storage and security
const TOKEN_STORAGE_KEY = 'auth_token';
const REFRESH_TOKEN_STORAGE_KEY = 'refresh_token';
const TOKEN_EXPIRY_BUFFER = 300; // 5 minutes buffer for token refresh

/**
 * Authentication service class for managing user authentication and token lifecycle
 * Implements requirements from sections 5.1 and 9.3.1 of the technical specification
 */
export class AuthService {
  /**
   * Authenticates user with email and password credentials
   * Requirement: Authentication Service - User login functionality
   */
  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Validate login credentials format
      if (!credentials.email || !credentials.password) {
        throw new Error('Invalid credentials format');
      }

      // Make POST request to login endpoint with credentials
      const response = await apiClient.post<AuthResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        credentials
      );

      // Store received tokens based on rememberMe preference
      if (credentials.rememberMe) {
        localStorage.setItem(TOKEN_STORAGE_KEY, response.data.token);
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, response.data.refreshToken);
      } else {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, response.data.token);
        sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, response.data.refreshToken);
      }

      // Decode and validate received JWT token
      const decodedToken = jwtDecode<TokenPayload>(response.data.token);
      if (!decodedToken || !decodedToken.exp) {
        throw new Error('Invalid token format');
      }

      return response.data;
    } catch (error) {
      throw new Error('Authentication failed');
    }
  }

  /**
   * Registers a new user account with provided credentials
   * Requirement: Authentication Service - User registration
   */
  public async signup(credentials: SignupCredentials): Promise<AuthResponse> {
    try {
      // Validate password and confirmPassword match
      if (credentials.password !== credentials.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Validate email format and password strength
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(credentials.email)) {
        throw new Error('Invalid email format');
      }

      if (credentials.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Make POST request to signup endpoint with credentials
      const response = await apiClient.post<AuthResponse>(
        API_ENDPOINTS.AUTH.SIGNUP,
        credentials
      );

      // Store received tokens in session storage
      sessionStorage.setItem(TOKEN_STORAGE_KEY, response.data.token);
      sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, response.data.refreshToken);

      // Decode and validate received JWT token
      const decodedToken = jwtDecode<TokenPayload>(response.data.token);
      if (!decodedToken || !decodedToken.exp) {
        throw new Error('Invalid token format');
      }

      return response.data;
    } catch (error) {
      throw new Error('Registration failed');
    }
  }

  /**
   * Logs out current user and clears authentication state
   * Requirement: Token Management - Token lifecycle management
   */
  public async logout(): Promise<void> {
    try {
      // Make POST request to logout endpoint
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);

      // Remove tokens from storage
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);

      // Clear authentication state
      // Note: This assumes the app is using a state management solution
      // that will handle the auth state reset
    } catch (error) {
      // Continue with local cleanup even if server request fails
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
  }

  /**
   * Refreshes authentication token using refresh token
   * Requirement: Security Protocols - Token refresh mechanism
   */
  public async refreshToken(): Promise<AuthResponse> {
    try {
      // Get refresh token from storage
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || 
                          sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Validate refresh token expiration
      const decodedRefreshToken = jwtDecode<TokenPayload>(refreshToken);
      if (!decodedRefreshToken || !decodedRefreshToken.exp) {
        throw new Error('Invalid refresh token');
      }

      // Make POST request to refresh endpoint
      const response = await apiClient.post<AuthResponse>(
        API_ENDPOINTS.AUTH.REFRESH,
        { refreshToken }
      );

      // Store new tokens in appropriate storage
      const isLocalStorage = !!localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
      const storage = isLocalStorage ? localStorage : sessionStorage;

      storage.setItem(TOKEN_STORAGE_KEY, response.data.token);
      storage.setItem(REFRESH_TOKEN_STORAGE_KEY, response.data.refreshToken);

      // Decode and validate new JWT token
      const decodedToken = jwtDecode<TokenPayload>(response.data.token);
      if (!decodedToken || !decodedToken.exp) {
        throw new Error('Invalid token format');
      }

      return response.data;
    } catch (error) {
      throw new Error('Token refresh failed');
    }
  }

  /**
   * Checks if user is currently authenticated with valid token
   * Requirement: Access Control - Authentication state verification
   */
  public isAuthenticated(): boolean {
    try {
      // Check for valid token in local and session storage
      const token = this.getToken();
      if (!token) {
        return false;
      }

      // Decode token to get expiration time
      const decodedToken = jwtDecode<TokenPayload>(token);
      if (!decodedToken || !decodedToken.exp) {
        return false;
      }

      // Verify token has not expired (with buffer time)
      const currentTime = Math.floor(Date.now() / 1000);
      return decodedToken.exp > (currentTime + TOKEN_EXPIRY_BUFFER);
    } catch (error) {
      return false;
    }
  }

  /**
   * Retrieves current authentication token from storage
   * Requirement: Token Management - Token retrieval
   */
  public getToken(): string | null {
    // Check local storage for token
    const localToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (localToken) {
      return localToken;
    }

    // Check session storage for token
    const sessionToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    return sessionToken;
  }
}