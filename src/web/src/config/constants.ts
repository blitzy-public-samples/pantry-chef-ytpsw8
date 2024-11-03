/**
 * HUMAN TASKS:
 * 1. Set up environment variables in .env file:
 *    - NEXT_PUBLIC_API_BASE_URL: Backend API base URL
 *    - NEXT_PUBLIC_WEBSOCKET_URL: WebSocket server URL
 *    - NEXT_PUBLIC_ANALYTICS_ID: Google Analytics tracking ID
 * 2. Configure Redis cache settings in infrastructure
 * 3. Update JWT token expiry settings in auth service
 */

// External dependency: Next.js environment variables (^13.0.0)
import { env } from 'process';

// Requirement: API Integration (5.2 Component Architecture/5.2.1 Client Applications)
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3
} as const;

// Requirement: Security Configuration (9.1 Authentication and Authorization/9.1.1 Authentication Flow)
export const AUTH_CONSTANTS = {
  TOKEN_KEY: 'pantrychef_access_token',
  TOKEN_EXPIRY: 3600, // 1 hour in seconds
  REFRESH_TOKEN_KEY: 'pantrychef_refresh_token'
} as const;

// Requirement: System Configuration (5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview)
export const ANALYTICS_CONFIG = {
  TRACKING_ID: process.env.NEXT_PUBLIC_ANALYTICS_ID || '',
  EVENT_BATCH_SIZE: 10,
  FLUSH_INTERVAL: 30000 // 30 seconds
} as const;

// Requirement: System Configuration (5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview)
export const CACHE_CONFIG = {
  TTL: 3600, // 1 hour in seconds
  MAX_SIZE: 100 // Maximum number of cached items
} as const;

// Requirement: System Configuration (5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview)
export const WEBSOCKET_CONFIG = {
  URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001',
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_INTERVAL: 5000 // 5 seconds
} as const;

// Requirement: System Configuration (5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview)
export const APP_ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  RECIPES: '/dashboard/recipes',
  PANTRY: '/dashboard/pantry',
  SHOPPING: '/dashboard/shopping',
  SETTINGS: '/dashboard/settings'
} as const;

// Global environment flags
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// Global API configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
export const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL;