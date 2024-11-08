// @ts-check
import dotenv from 'dotenv'; // ^16.0.0
import { AUTH_CONSTANTS } from '../utils/constants';

/*
HUMAN TASKS:
1. Ensure JWT_SECRET is set in the environment variables for production
2. Review and adjust token expiration times based on security requirements
3. Configure allowed algorithms based on security policy
4. Set up key rotation policy for JWT secrets in production
5. Implement monitoring for token usage and potential security issues
*/

// Load environment variables
dotenv.config();

/**
 * Interface defining JWT configuration options for token generation and validation
 * Requirement: Authentication Security - JWT token configuration for secure user authentication
 */
export interface JWTConfig {
  secret: string;
  algorithm: string;
  expiresIn: string;
  refreshExpiresIn: string;
  allowedAlgorithms: string[];
}

/**
 * JWT configuration object with secure token settings and algorithm restrictions
 * Requirements addressed:
 * - Authentication Security (9.1.1): Secure token-based authentication with refresh support
 * - Security Protocols (9.3.1): Token-based access control with strict algorithm restrictions
 */
export const jwtConfig: JWTConfig = {
  // Use environment variable for secret or fall back to constant (development only)
  secret: process.env.JWT_SECRET || AUTH_CONSTANTS.JWT_SECRET,

  // Use HS256 as the default signing algorithm
  algorithm: 'HS256',

  // Token expiration times from constants
  expiresIn: AUTH_CONSTANTS.TOKEN_EXPIRY,
  refreshExpiresIn: AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY,

  // Restrict allowed algorithms to prevent algorithm switching attacks
  allowedAlgorithms: ['HS256'],
};
