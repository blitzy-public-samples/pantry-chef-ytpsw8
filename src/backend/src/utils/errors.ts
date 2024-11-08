// @ts-check
import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import { logger, error as logError, warn as logWarn } from './logger';
import { ERROR_CODES } from './constants';

/*
HUMAN TASKS:
1. Configure error monitoring alerts in CloudWatch
2. Set up error notification thresholds
3. Configure error tracking integration with external monitoring services
4. Set up error reporting dashboards
5. Configure error log retention policies
*/

// Requirement: Error Handling - Base error class for application-specific errors
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly context: Record<string, any>;
  public readonly timestamp: string;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    context: Record<string, any> = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();

    // Capture stack trace for debugging
    Error.captureStackTrace(this, this.constructor);

    // Requirement: System Monitoring - Log error with context
    logger.error('Application Error', {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      stack: this.stack,
      timestamp: this.timestamp,
    });
  }
}

// Requirement: Error Handling - Specific error class for validation errors
export class ValidationError extends AppError {
  public readonly validationErrors: Array<{
    field: string;
    constraint: string;
  }>;

  constructor(message: string, errors: Array<{ field: string; constraint: string }>) {
    super(message, 400, ERROR_CODES.VALIDATION_ERROR, { validationErrors: errors });
    this.validationErrors = errors;

    // Requirement: System Monitoring - Log validation errors
    logger.warn('Validation Error', {
      message: this.message,
      validationErrors: this.validationErrors,
      timestamp: this.timestamp,
    });
  }
}

// Requirement: Error Handling - Format error object for consistent API responses
export function formatError(error: Error): Record<string, any> {
  const formattedError: Record<string, any> = {
    message: error.message,
    timestamp: new Date().toISOString(),
  };

  if (error instanceof AppError) {
    formattedError.code = error.code;
    formattedError.statusCode = error.statusCode;
    formattedError.context = error.context;

    if (error instanceof ValidationError) {
      formattedError.validationErrors = error.validationErrors;
    }
  } else {
    formattedError.code = ERROR_CODES.INTERNAL_SERVER_ERROR;
    formattedError.statusCode = 500;
  }

  // Include stack trace in development environment
  if (process.env.NODE_ENV === 'development') {
    formattedError.stack = error.stack;
  }

  // Add request tracking ID if available
  if ((global as any).correlationId) {
    formattedError.correlationId = (global as any).correlationId;
  }

  return formattedError;
}

// Requirement: Error Handling - Global error handling middleware with monitoring
export function handleError(error: Error, req: Request, res: Response, next: NextFunction): void {
  // Log error details with context
  logger.error('Request Error', {
    error: formatError(error),
    request: {
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
      body: req.body,
      headers: req.headers,
      userId: (req as any).user?.id,
      correlationId: (req as any).correlationId,
    },
  });

  // Determine error type and appropriate status code
  const formattedError = formatError(error);
  const statusCode = formattedError.statusCode || 500;

  // Track error metrics in production
  if (process.env.NODE_ENV === 'production') {
    // Requirement: Security Monitoring - Track security-related errors
    if (statusCode === 401 || statusCode === 403) {
      logWarn('Security Event', {
        type: 'unauthorized_access',
        ip: req.ip,
        path: req.path,
        userId: (req as any).user?.id,
      });
    }

    // Requirement: System Monitoring - Track system errors
    if (statusCode >= 500) {
      logError('System Error', {
        type: 'system_failure',
        service: 'api',
        endpoint: req.path,
        method: req.method,
      });
    }
  }

  // Send formatted error response
  res.status(statusCode).json({
    error: formattedError,
    success: false,
  });
}

// Export common error instances for reuse
export const CommonErrors = {
  InternalServerError: (context = {}) =>
    new AppError(
      'An internal server error occurred',
      500,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      context
    ),

  BadRequest: (message: string, context = {}) =>
    new AppError(message, 400, ERROR_CODES.BAD_REQUEST, context),

  Unauthorized: (context = {}) =>
    new AppError('Unauthorized access', 401, ERROR_CODES.UNAUTHORIZED, context),

  NotFound: (resource: string, context = {}) =>
    new AppError(`${resource} not found`, 404, ERROR_CODES.NOT_FOUND, context),

  ImageProcessingError: (context = {}) =>
    new AppError('Failed to process image', 500, ERROR_CODES.ERR_IMG_PROCESS, context),

  RecipeMatchError: (context = {}) =>
    new AppError('Failed to match recipes', 500, ERROR_CODES.ERR_RECIPE_MATCH, context),

  SyncError: (context = {}) =>
    new AppError('Failed to synchronize data', 500, ERROR_CODES.ERR_SYNC_FAIL, context),
};
