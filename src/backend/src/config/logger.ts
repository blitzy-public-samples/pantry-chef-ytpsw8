// @ts-check
import winston from 'winston'; // ^3.8.0
import WinstonCloudWatch from 'winston-cloudwatch'; // ^3.1.0
import morgan from 'morgan'; // ^1.10.0
import { ERROR_CODES } from '../utils/constants';

/*
HUMAN TASKS:
1. Set up AWS CloudWatch access credentials in production environment:
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY
   - AWS_REGION
2. Configure log retention policies in AWS CloudWatch
3. Set up log rotation for development environment
4. Configure alert thresholds for error monitoring
*/

// Environment variables with defaults
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';
const AWS_CLOUDWATCH_GROUP = process.env.AWS_CLOUDWATCH_GROUP || 'pantrychef-logs';
const AWS_CLOUDWATCH_STREAM = process.env.AWS_CLOUDWATCH_STREAM || 'application';

// Requirement: System Monitoring - Structured log format configuration
const structuredLogFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.metadata({
        fillExcept: ['timestamp', 'level', 'message', 'stack']
    }),
    winston.format.json()
);

// Requirement: System Monitoring - Development-friendly console transport
const createConsoleTransport = () => {
    return new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
                let log = `${timestamp} [${level}]: ${message}`;
                if (stack) {
                    log += `\n${stack}`;
                }
                if (Object.keys(metadata).length > 0) {
                    log += `\n${JSON.stringify(metadata, null, 2)}`;
                }
                return log;
            })
        ),
        level: LOG_LEVEL
    });
};

// Requirement: Security Monitoring - CloudWatch integration for production
const createCloudWatchTransport = () => {
    return new WinstonCloudWatch({
        logGroupName: AWS_CLOUDWATCH_GROUP,
        logStreamName: `${AWS_CLOUDWATCH_STREAM}-${NODE_ENV}`,
        awsRegion: process.env.AWS_REGION,
        messageFormatter: ({ level, message, metadata }) => {
            return JSON.stringify({
                timestamp: new Date().toISOString(),
                level,
                message,
                ...metadata
            });
        },
        retentionInDays: 30,
        uploadRate: 2000,
        errorHandler: (err) => {
            console.error('CloudWatch logging error:', err);
        }
    });
};

// Requirement: System Monitoring - Base logger configuration
const createLoggerConfig = () => {
    const transports: winston.transport[] = [createConsoleTransport()];

    // Add CloudWatch transport in production
    if (NODE_ENV === 'production') {
        transports.push(createCloudWatchTransport());
    }

    return {
        level: LOG_LEVEL,
        format: structuredLogFormat,
        transports,
        // Requirement: Error Tracking - Error handling configuration
        exceptionHandlers: transports,
        rejectionHandlers: transports,
        exitOnError: false,
        // Requirement: Security Monitoring - Default metadata
        defaultMeta: {
            service: 'pantrychef-backend',
            environment: NODE_ENV,
            version: process.env.npm_package_version
        }
    };
};

// Requirement: System Monitoring - HTTP request logging format
const morganFormat = NODE_ENV === 'production' 
    ? 'combined'
    : 'dev';

// Requirement: Security Monitoring - Custom token for request tracking
morgan.token('correlation-id', (req: any) => req.correlationId);

// Requirement: Error Tracking - Error categorization
const errorCodeToLogLevel = {
    [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'error',
    [ERROR_CODES.ERR_IMG_PROCESS]: 'error',
    [ERROR_CODES.ERR_RECIPE_MATCH]: 'warn',
    [ERROR_CODES.ERR_SYNC_FAIL]: 'warn'
};

// Export the logger configuration
export const loggerConfig = createLoggerConfig();

// Export the factory function for creating logger configurations
export { createLoggerConfig };

// Export HTTP request logging middleware
export const requestLogger = morgan(morganFormat, {
    skip: (req, res) => NODE_ENV === 'production' && res.statusCode < 400,
    stream: {
        write: (message: string) => {
            const logger = winston.createLogger(loggerConfig);
            logger.info(message.trim());
        }
    }
});