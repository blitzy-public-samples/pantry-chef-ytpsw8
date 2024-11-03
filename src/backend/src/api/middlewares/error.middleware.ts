import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import { error as logError, logError as logErrorWithContext } from '../../utils/logger';
import { AppError, ValidationError } from '../../utils/errors';
import { ERROR_CODES, HTTP_STATUS } from '../../utils/constants';

/*
HUMAN TASKS:
1. Configure CloudWatch alerts for error monitoring:
   - Set up alert thresholds for error rates
   - Configure notification channels for critical errors
2. Set up error tracking in production environment:
   - Configure error reporting service integration
   - Set up error aggregation dashboards
3. Configure error log retention policies in CloudWatch
4. Set up automated error analysis and reporting
5. Configure error notification routing for different severity levels
*/

// Requirement: Error Handling - Format error response with monitoring metadata
function formatErrorResponse(error: Error, req: Request): Record<string, any> {
    const baseResponse = {
        success: false,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        requestId: (req as any).correlationId,
    };

    // Handle AppError instances with specific error codes and status
    if (error instanceof AppError) {
        return {
            ...baseResponse,
            error: {
                code: error.code,
                message: error.message,
                context: error.context,
                statusCode: error.statusCode,
                ...(error instanceof ValidationError && {
                    validationErrors: error.validationErrors
                })
            }
        };
    }

    // Handle unknown errors with generic internal server error
    return {
        ...baseResponse,
        error: {
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: 'An unexpected error occurred',
            statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
            ...(process.env.NODE_ENV === 'development' && {
                stack: error.stack,
                originalMessage: error.message
            })
        }
    };
}

// Requirement: Error Handling - Express error handling middleware with monitoring integration
export const errorHandler = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Log error with request context for monitoring
    logErrorWithContext(error, {
        path: req.path,
        method: req.method,
        requestId: (req as any).correlationId,
        userId: (req as any).user?.id,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });

    // Format error response
    const errorResponse = formatErrorResponse(error, req);
    const statusCode = errorResponse.error.statusCode;

    // Track error metrics in CloudWatch if in production
    if (process.env.NODE_ENV === 'production') {
        // Requirement: System Monitoring - Track error metrics with CloudWatch
        logError('API Error Metrics', {
            errorCode: errorResponse.error.code,
            statusCode,
            path: req.path,
            method: req.method,
            timestamp: errorResponse.timestamp,
            environment: process.env.NODE_ENV,
            service: 'api',
            correlationId: (req as any).correlationId
        });

        // Track critical errors separately
        if (statusCode >= 500) {
            logError('Critical System Error', {
                error: errorResponse.error,
                request: {
                    headers: req.headers,
                    query: req.query,
                    params: req.params,
                    body: req.body
                },
                user: (req as any).user
            });
        }

        // Track validation errors for API quality monitoring
        if (error instanceof ValidationError) {
            logError('Validation Error Metrics', {
                endpoint: req.path,
                validationErrors: error.validationErrors,
                requestBody: req.body
            });
        }
    }

    // Send error response to client
    res.status(statusCode).json(errorResponse);
};

// Export error handler as default
export default errorHandler;