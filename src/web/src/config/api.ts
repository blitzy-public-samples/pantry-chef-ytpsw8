// External dependency: Next.js environment variables (^13.0.0)
import { API_CONFIG as apiConfig } from './constants';

// Requirement: API Integration (5.2.1 Client Applications)
// Defines API versions for versioning control
export const API_VERSIONS = {
  V1: '/api/v1'
} as const;

// Requirement: API Integration (5.2.1 Client Applications)
// Defines HTTP request methods for RESTful operations
export const REQUEST_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH'
} as const;

// Requirement: Service Integration (8.3.1 REST Endpoints)
// Configures authentication endpoints implementing JWT and OAuth2.0 flow
const AUTH = {
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout'
} as const;

// Requirement: Service Integration (8.3.1 REST Endpoints)
// Configures pantry management endpoints
const PANTRY = {
  LIST: '/pantry/items',
  ADD: '/pantry/items',
  UPDATE: '/pantry/items/:id',
  DELETE: '/pantry/items/:id',
  CATEGORIES: '/pantry/categories'
} as const;

// Requirement: Service Integration (8.3.1 REST Endpoints)
// Configures recipe management endpoints
const RECIPES = {
  LIST: '/recipes',
  DETAIL: '/recipes/:id',
  MATCH: '/recipes/match',
  SAVE: '/recipes/save/:id',
  UNSAVE: '/recipes/unsave/:id'
} as const;

// Requirement: Service Integration (8.3.1 REST Endpoints)
// Configures shopping list management endpoints
const SHOPPING = {
  LIST: '/shopping/lists',
  CREATE: '/shopping/lists',
  UPDATE: '/shopping/lists/:id',
  DELETE: '/shopping/lists/:id'
} as const;

// Requirement: Service Integration (8.3.1 REST Endpoints)
// Configures user profile and settings endpoints
const USER = {
  PROFILE: '/users/profile',
  PREFERENCES: '/users/preferences',
  SETTINGS: '/users/settings'
} as const;

// Requirement: Service Integration (8.3.1 REST Endpoints)
// Configures analytics tracking endpoints
const ANALYTICS = {
  TRACK: '/analytics/events',
  METRICS: '/analytics/metrics'
} as const;

// Requirement: API Integration (5.2.1 Client Applications)
// Comprehensive API endpoint configuration for all microservices
export const API_ENDPOINTS = {
  AUTH,
  PANTRY,
  RECIPES,
  SHOPPING,
  USER,
  ANALYTICS
} as const;

// Requirement: Security Configuration (9.1 Authentication and Authorization)
// Base configuration for API requests
export const API_CONFIG = {
  baseURL: apiConfig.BASE_URL,
  timeout: apiConfig.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
} as const;

// Helper function to build full API URL
export const buildApiUrl = (endpoint: string, version: string = API_VERSIONS.V1): string => {
  return `${apiConfig.BASE_URL}${version}${endpoint}`;
};

// Helper function to replace URL parameters
export const replaceUrlParams = (url: string, params: Record<string, string | number>): string => {
  let finalUrl = url;
  Object.entries(params).forEach(([key, value]) => {
    finalUrl = finalUrl.replace(`:${key}`, value.toString());
  });
  return finalUrl;
};