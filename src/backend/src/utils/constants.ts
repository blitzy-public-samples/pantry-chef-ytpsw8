// @ts-check
import dotenv from 'dotenv'; // ^16.0.0

/*
HUMAN TASKS:
1. Create .env file with required environment variables:
   - NODE_ENV
   - PORT
   - JWT_SECRET
   - S3_BUCKET_NAME
   - REDIS_HOST
   - REDIS_PORT
2. Configure AWS credentials for S3 access
3. Set up SSL certificates for HTTPS in production
4. Configure RabbitMQ credentials
5. Set up Elasticsearch connection details
*/

// Load environment variables
dotenv.config();

// Global system configuration
// Requirement: System Configuration - Backend configuration constants
export const API_VERSION: string = 'v1';
export const NODE_ENV: string = process.env.NODE_ENV || 'development';
export const PORT: number = parseInt(process.env.PORT) || 3000;
export const IS_PRODUCTION: boolean = process.env.NODE_ENV === 'production';

// Error codes for system-wide error handling
// Requirement: Error Handling - Standardized error codes
export const ERROR_CODES = {
    INTERNAL_SERVER_ERROR: 'ERR_INTERNAL_SERVER',
    UNAUTHORIZED: 'ERR_UNAUTHORIZED',
    BAD_REQUEST: 'ERR_BAD_REQUEST',
    NOT_FOUND: 'ERR_NOT_FOUND',
    VALIDATION_ERROR: 'ERR_VALIDATION',
    ERR_IMG_PROCESS: 'ERR_IMG_PROCESS',
    ERR_RECIPE_MATCH: 'ERR_RECIPE_MATCH',
    ERR_SYNC_FAIL: 'ERR_SYNC_FAIL'
} as const;

// HTTP status codes for API responses
// Requirement: API Configuration - API and service configuration constants
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
    TOO_MANY_REQUESTS: 429
} as const;

// Storage configuration constants
// Requirement: System Configuration - Backend configuration constants
export const STORAGE_CONSTANTS = {
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || 'pantrychef-storage',
    IMAGE_UPLOAD_PATH: '/uploads/images',
    ALLOWED_FILE_TYPES: ['.jpg', '.jpeg', '.png', '.webp'],
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ENCRYPTION_ALGORITHM: 'AES-256-GCM' // Requirement: Security Standards - Encryption standards
} as const;

// Authentication constants
// Requirement: Security Standards - Security and encryption related constants
export const AUTH_CONSTANTS = {
    JWT_SECRET: process.env.JWT_SECRET || 'development-secret',
    TOKEN_EXPIRY: '24h',
    REFRESH_TOKEN_EXPIRY: '7d',
    OAUTH_PROVIDERS: ['google', 'facebook', 'apple']
} as const;

// Cache configuration constants
// Requirement: System Configuration - Backend configuration constants
export const CACHE_CONSTANTS = {
    DEFAULT_TTL: 3600, // 1 hour in seconds
    RECIPE_CACHE_PREFIX: 'recipe:',
    USER_CACHE_PREFIX: 'user:',
    REDIS_CLUSTER_MODE: IS_PRODUCTION
} as const;

// Validation constants
// Requirement: API Configuration - API and service configuration constants
export const VALIDATION_CONSTANTS = {
    PASSWORD_MIN_LENGTH: 8,
    USERNAME_MIN_LENGTH: 3,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MAX_INGREDIENTS: 50
} as const;

// Queue configuration constants
// Requirement: System Configuration - Backend configuration constants
export const QUEUE_CONSTANTS = {
    IMAGE_PROCESSING_QUEUE: 'image-processing',
    NOTIFICATION_QUEUE: 'notifications',
    RECIPE_MATCHING_QUEUE: 'recipe-matching',
    ANALYTICS_QUEUE: 'analytics'
} as const;

// Rate limiting configuration
// Requirement: Security Standards - Security and encryption related constants
export const RATE_LIMIT_CONSTANTS = {
    MAX_REQUESTS_PER_MINUTE: 60,
    RATE_LIMIT_WINDOW_MS: 60 * 1000 // 1 minute
} as const;