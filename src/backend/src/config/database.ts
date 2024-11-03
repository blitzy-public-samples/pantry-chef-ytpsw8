// @ts-check
import mongoose from 'mongoose'; // ^6.5.0
import dotenv from 'dotenv'; // ^16.0.0
import { logger } from '../utils/logger';
import { ERROR_CODES } from '../utils/constants';

// HUMAN TASKS:
// 1. Set up MongoDB cluster in AWS with multi-AZ deployment
// 2. Configure MongoDB authentication credentials in environment variables
// 3. Set up automated backups for the database
// 4. Configure MongoDB monitoring and alerts
// 5. Set up database access logging
// 6. Configure network security groups for database access
// 7. Set up SSL/TLS certificates for database connections

// Load environment variables
dotenv.config();

// Database configuration constants
// Requirement: Database Configuration - MongoDB database configuration with cluster support
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pantrychef';
const DB_NAME = process.env.DB_NAME || 'pantrychef';
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_REPLICA_SET = process.env.DB_REPLICA_SET;
const DB_MAX_POOL_SIZE = parseInt(process.env.DB_MAX_POOL_SIZE) || 10;
const DB_KEEP_ALIVE = process.env.DB_KEEP_ALIVE === 'true';
const DB_SOCKET_TIMEOUT = parseInt(process.env.DB_SOCKET_TIMEOUT) || 30000;

/**
 * Retrieves database configuration options based on environment with support for replica sets
 * Requirement: High Availability - Multi-AZ database configuration with automated backups
 */
export const getDatabaseConfig = (): mongoose.ConnectOptions => {
    const config: mongoose.ConnectOptions = {
        dbName: DB_NAME,
        maxPoolSize: DB_MAX_POOL_SIZE,
        socketTimeoutMS: DB_SOCKET_TIMEOUT,
        keepAlive: DB_KEEP_ALIVE,
        retryWrites: true,
        // Requirement: Database Cluster - MongoDB cluster with primary and secondary nodes
        writeConcern: {
            w: 'majority',
            j: true,
            wtimeout: 5000
        }
    };

    // Configure authentication if credentials are provided
    if (DB_USER && DB_PASSWORD) {
        config.auth = {
            username: DB_USER,
            password: DB_PASSWORD
        };
    }

    // Configure replica set if defined
    // Requirement: High Availability - Multi-AZ database configuration
    if (DB_REPLICA_SET) {
        config.replicaSet = DB_REPLICA_SET;
        config.readPreference = 'secondaryPreferred';
        config.retryReads = true;
    }

    return config;
};

/**
 * Establishes connection to MongoDB database with configured options
 * Requirement: Data Layer - MongoDB database configuration for primary data storage
 */
export const connectDatabase = async (): Promise<void> => {
    try {
        const config = getDatabaseConfig();
        
        // Configure mongoose settings
        mongoose.set('strictQuery', true);
        mongoose.set('autoIndex', true);
        
        // Set up connection event listeners
        mongoose.connection.on('connected', () => {
            logger.info('MongoDB connection established successfully', {
                uri: MONGODB_URI,
                database: DB_NAME,
                replicaSet: DB_REPLICA_SET || 'none'
            });
        });

        mongoose.connection.on('error', (error) => {
            logger.error('MongoDB connection error', {
                error: error.message,
                code: ERROR_CODES.INTERNAL_SERVER_ERROR,
                stack: error.stack
            });
        });

        mongoose.connection.on('disconnected', () => {
            logger.info('MongoDB connection disconnected');
        });

        // Attempt database connection with retry logic
        await mongoose.connect(MONGODB_URI, {
            ...config,
            serverSelectionTimeoutMS: 5000,
            heartbeatFrequencyMS: 10000
        });

    } catch (error) {
        logger.error('Failed to connect to MongoDB', {
            error: error.message,
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            stack: error.stack
        });
        throw error;
    }
};

/**
 * Gracefully closes database connection with proper cleanup
 * Requirement: Database Configuration - Proper connection handling
 */
export const closeDatabaseConnection = async (): Promise<void> => {
    try {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed successfully');
        }
    } catch (error) {
        logger.error('Error closing MongoDB connection', {
            error: error.message,
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            stack: error.stack
        });
        throw error;
    }
};

// Export database configuration functions
export { getDatabaseConfig, connectDatabase, closeDatabaseConnection };