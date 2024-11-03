// @version react-redux ^8.0.0
// @version react ^18.0.0

import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { 
  LoginCredentials, 
  SignupCredentials, 
  AuthState 
} from '../interfaces/auth.interface';
import { 
  loginThunk, 
  signupThunk, 
  logoutThunk,
  selectAuth 
} from '../store/slices/authSlice';

/**
 * HUMAN TASKS:
 * 1. Configure OAuth2.0 providers in environment variables
 * 2. Set up JWT secret and expiration times in configuration
 * 3. Implement Redis session storage configuration
 * 4. Configure SSL certificates for secure authentication
 */

/**
 * Custom hook for managing authentication state and operations
 * Addresses requirements:
 * - Authentication Flow: Implements JWT-based authentication flow between web client and auth service
 * - Security Protocols: Implements JWT + OAuth2.0 authentication and session management
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  const authState = useSelector(selectAuth);

  /**
   * Handles user login with credentials
   * Addresses requirement: Authentication Flow - JWT-based authentication
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      await dispatch(loginThunk(credentials)).unwrap();
    } catch (error) {
      // Error handling is managed by the thunk and reflected in auth state
      console.error('Login failed:', error);
    }
  }, [dispatch]);

  /**
   * Handles user signup with credentials
   * Addresses requirement: Authentication Flow - User registration
   */
  const signup = useCallback(async (credentials: SignupCredentials) => {
    try {
      await dispatch(signupThunk(credentials)).unwrap();
    } catch (error) {
      // Error handling is managed by the thunk and reflected in auth state
      console.error('Signup failed:', error);
    }
  }, [dispatch]);

  /**
   * Handles user logout
   * Addresses requirement: Security Protocols - Session management
   */
  const logout = useCallback(async () => {
    try {
      await dispatch(logoutThunk()).unwrap();
    } catch (error) {
      // Error handling is managed by the thunk and reflected in auth state
      console.error('Logout failed:', error);
    }
  }, [dispatch]);

  // Return authentication state and operations
  return {
    // Auth state
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    // Auth operations
    login,
    signup,
    logout
  };
};

export default useAuth;