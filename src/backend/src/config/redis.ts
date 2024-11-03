import Redis from 'ioredis'; // ^5.0.0
import dotenv from 'dotenv'; // ^16.0.0
import { logError } from '../utils/logger';
import { CACHE_CONSTANTS } from '../utils/constants';

// HUMAN TASKS:
// 1. Set up Redis credentials in environment variables:
//    - REDIS_HOST
//    - REDIS_PORT
//    - REDIS_PASSWORD
//    - REDIS_DB
//    - REDIS_CLUSTER_MODE
// 2. Configure Redis cluster nodes in production environment
// 3. Set up Redis monitoring and alerting
// 4. Configure Redis persistence settings
// 5. Set up Redis backup strategy
// 6. Configure network security groups for Redis access

// Load environment variables
dotenv.config();

// Environment variables with defaults
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_DB = parseInt(process.env.REDIS_DB) || 0;
const REDIS_CLUSTER_MODE = process.env.REDIS_CLUSTER_MODE === 'true';

// Requirement: Cache Layer - Redis configuration object with connection parameters
export const redisConfig = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    db: REDIS_DB,
    clusterMode: CACHE_CONSTANTS.REDIS_CLUSTER_MODE
};

// Requirement: High Availability - Redis cluster configuration for high availability
const clusterOptions = {
    clusterRetryStrategy: (times: number) => {
        const delay = Math.min(times * 100, 2000);
        return delay;
    },
    enableReadyCheck: true,
    maxRedirections: 6,
    retryDelayOnFailover: 100,
    retryDelayOnClusterDown: 100,
    scaleReads: 'slave'
};

// Requirement: Performance Optimization - Redis client configuration with retry strategy
const clientOptions = {
    retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    enableReadyCheck: true,
    keepAlive: 10000,
    connectTimeout: 10000,
    disconnectTimeout: 2000,
    maxRetriesPerRequest: 3,
    enableOfflineQueue: true
};

/**
 * Creates and configures a Redis client instance with appropriate connection settings
 * Requirement: Cache Layer - Redis cache configuration for session management
 */
export const createRedisClient = (): Redis => {
    try {
        let client: Redis;

        // Requirement: High Availability - Redis cluster configuration with automatic failover
        if (CACHE_CONSTANTS.REDIS_CLUSTER_MODE) {
            client = new Redis.Cluster(
                [
                    {
                        host: REDIS_HOST,
                        port: REDIS_PORT
                    }
                ],
                {
                    ...clusterOptions,
                    redisOptions: {
                        password: REDIS_PASSWORD,
                        db: REDIS_DB,
                        ...clientOptions
                    }
                }
            );
        } else {
            // Requirement: Performance Optimization - Standalone Redis configuration
            client = new Redis({
                host: REDIS_HOST,
                port: REDIS_PORT,
                password: REDIS_PASSWORD,
                db: REDIS_DB,
                ...clientOptions
            });
        }

        // Requirement: High Availability - Set up connection event handlers
        client.on('connect', () => {
            console.info('Redis client connected successfully');
        });

        client.on('error', (error: Error) => {
            logError(error, 'Redis connection error');
        });

        client.on('close', () => {
            console.warn('Redis connection closed');
        });

        client.on('reconnecting', () => {
            console.info('Redis client reconnecting');
        });

        // Requirement: Performance Optimization - Set default key prefix for cache management
        client.options.keyPrefix = `${process.env.NODE_ENV}:`;

        return client;
    } catch (error) {
        logError(error as Error, 'Redis client creation failed');
        throw error;
    }
};

/**
 * Retrieves Redis configuration based on environment settings
 * Requirement: Cache Layer - Redis configuration retrieval
 */
export const getRedisConfig = (): Record<string, any> => {
    try {
        // Requirement: Performance Optimization - Redis configuration with cache policies
        const config = {
            ...redisConfig,
            defaultTTL: CACHE_CONSTANTS.DEFAULT_TTL,
            keyPrefixes: {
                recipe: CACHE_CONSTANTS.RECIPE_CACHE_PREFIX,
                user: CACHE_CONSTANTS.USER_CACHE_PREFIX
            },
            cluster: {
                enabled: CACHE_CONSTANTS.REDIS_CLUSTER_MODE,
                options: clusterOptions
            },
            client: clientOptions,
            // Requirement: High Availability - Redis high availability settings
            highAvailability: {
                autoReconnect: true,
                maxReconnectAttempts: 10,
                reconnectInterval: 1000
            }
        };

        return config;
    } catch (error) {
        logError(error as Error, 'Redis configuration retrieval failed');
        throw error;
    }
};