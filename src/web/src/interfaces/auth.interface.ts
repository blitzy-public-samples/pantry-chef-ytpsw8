// @version @oauth/oauth2-client ^2.0.0
// @version jwt-decode ^3.1.2

import { User } from '../../../backend/src/interfaces/user.interface';

/**
 * HUMAN TASKS:
 * 1. Configure OAuth2.0 providers in environment variables
 * 2. Set up JWT secret and expiration times in configuration
 * 3. Implement Redis session storage configuration
 * 4. Configure SSL certificates for secure authentication
 */

/**
 * Interface for login request payload
 * Addresses requirement: Authentication Service - User login functionality
 */
export interface LoginCredentials {
    email: string;
    password: string;
    rememberMe: boolean;
}

/**
 * Interface for signup request payload
 * Addresses requirement: Authentication Service - User registration
 */
export interface SignupCredentials {
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
}

/**
 * Interface for authentication response data
 * Addresses requirements:
 * - Security Protocols/Access Control Measures - JWT token management
 * - Session Management - Token and session handling
 */
export interface AuthResponse {
    token: string;
    refreshToken: string;
    expiresIn: number;
    user: User;
}

/**
 * Interface for authentication state management
 * Addresses requirement: Authentication Service - State tracking
 */
export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    loading: boolean;
    error: string | null;
}

/**
 * Interface for JWT token payload structure
 * Addresses requirement: Security Protocols/Access Control Measures - JWT implementation
 */
export interface TokenPayload {
    userId: string;
    email: string;
    iat: number;
    exp: number;
}

/**
 * Enum for supported authentication providers
 * Addresses requirement: OAuth Integration - Third-party authentication
 */
export enum AuthProvider {
    LOCAL = 'LOCAL',
    GOOGLE = 'GOOGLE',
    FACEBOOK = 'FACEBOOK',
    APPLE = 'APPLE'
}

/**
 * Interface for OAuth2.0 authentication credentials
 * Addresses requirement: OAuth Integration - Third-party authentication data
 */
export interface OAuthCredentials {
    provider: AuthProvider;
    accessToken: string;
    idToken: string;
}

/**
 * Interface for session data stored in Redis
 * Addresses requirement: Session Management - Redis session storage
 */
export interface SessionData {
    userId: string;
    token: string;
    expiresAt: number;
    provider: AuthProvider;
}

export type EventListenerFunction = (...args: any[]) => void | Promise<void>;
