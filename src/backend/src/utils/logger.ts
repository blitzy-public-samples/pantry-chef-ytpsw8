import winston from 'winston'; // ^3.8.0
import morgan from 'morgan'; // ^1.10.0
import WinstonCloudWatch from 'winston-cloudwatch'; // ^3.1.0
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ERROR_CODES } from './constants';

// HUMAN TASKS:
// 1. Configure AWS CloudWatch credentials in production environment:
//    - AWS_ACCESS_KEY_ID
//    - AWS_SECRET_ACCESS_KEY
//    - AWS_REGION
// 2. Set LOG_LEVEL in environment variables (debug, info, warn, error)
// 3. Configure log retention period in CloudWatch
// 4. Set up log aggregation and monitoring alerts
// 5. Configure log rotation for development environment

// Requirement: System Monitoring - Configure log levels based on environment
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Requirement: System Monitoring - Custom log format with timestamps and metadata
const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
    winston.format.json()
);

// Requirement: System Monitoring - Create base logger configuration
const createLogger = (): winston.Logger => {
    const transports: winston.transport[] = [
        // Console transport for all environments with color coding
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ];

    // Requirement: Security Monitoring - Add CloudWatch transport in production
    if (NODE_ENV === 'production') {
        transports.push(
            new WinstonCloudWatch({
                logGroupName: '/pantrychef/backend',
                logStreamName: `${NODE_ENV}-${new Date().toISOString()}`,
                awsRegion: process.env.AWS_REGION,
                messageFormatter: ({ level, message, metadata }) => 
                    JSON.stringify({ level, message, ...metadata })
            })
        );
    }

    return winston.createLogger({
        level: LOG_LEVEL,
        format: logFormat,
        transports,
        // Requirement: Error Tracking - Handle uncaught exceptions
        exceptionHandlers: transports,
        rejectionHandlers: transports,
        exitOnError: false
    });
};

// Create singleton logger instance
export const logger = createLogger();

// Requirement: Error Tracking - Standardized error logging with context
export const logError = (error: Error, context: string): void => {
    const errorDetails = {
        message: error.message,
        stack: error.stack,
        context,
        correlationId: (global as any).correlationId,
        timestamp: new Date().toISOString()
    };

    if (error.message.includes(ERROR_CODES.INTERNAL_SERVER_ERROR)) {
        logger.error('Internal Server Error', errorDetails);
    } else {
        logger.error('Application Error', errorDetails);
    }
};

// Requirement: System Monitoring - HTTP request logging middleware
export const logRequest = (): RequestHandler => {
    return morgan(
        (tokens, req: Request, res: Response) => {
            const logData = {
                method: tokens.method(req, res),
                url: tokens.url(req, res),
                status: tokens.status(req, res),
                responseTime: `${tokens['response-time'](req, res)}ms`,
                userAgent: tokens['user-agent'](req, res),
                correlationId: (req as any).correlationId,
                userId: (req as any).user?.id,
                timestamp: new Date().toISOString()
            };

            // Log request details at appropriate level based on status code
            const status = parseInt(logData.status || '500');
            if (status >= 500) {
                logger.error('Request Failed', logData);
            } else if (status >= 400) {
                logger.warn('Request Warning', logData);
            } else {
                logger.info('Request Completed', logData);
            }

            return JSON.stringify(logData);
        },
        { stream: { write: (message: string) => logger.debug(message.trim()) } }
    );
};

// Requirement: System Monitoring - Utility function for structured info logging
export const logInfo = (message: string, metadata: Record<string, any> = {}): void => {
    logger.info(message, {
        ...metadata,
        correlationId: (global as any).correlationId,
        timestamp: new Date().toISOString(),
        environment: NODE_ENV
    });
};

// Export logger instance with exposed log levels
export default {
    error: logger.error.bind(logger),
    warn: logger.warn.bind(logger),
    info: logger.info.bind(logger),
    debug: logger.debug.bind(logger)
};