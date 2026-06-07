// @ts-check
import express, { Router, Request, Response, NextFunction } from 'express'; // ^4.18.0
import { authenticate, authorize, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import { 
    UserActivityMetrics, 
    SystemPerformanceMetrics, 
    RecipeAnalytics, 
    AnalyticsTimeframe 
} from '../../interfaces/analytics.interface';

/*
HUMAN TASKS:
1. Configure analytics data retention policies in production environment
2. Set up monitoring alerts for system performance thresholds
3. Configure analytics data export schedules
4. Set up analytics dashboard access controls
5. Configure analytics data backup policies
*/

/**
 * Initialize analytics routes with authentication and validation
 * Requirement: Analytics and Reporting - Implementation of analytics microservice endpoints
 */
/**
 * Synchronous, void-returning wrappers around the auth middlewares. `authenticate` and the
 * middleware returned by `authorize(...)` are typed against `AuthenticatedRequest` and return a
 * Promise; Express's `RequestHandler` expects a plain `Request` (contravariant position) and a
 * `void` return. These wrappers upcast the request and discard the promise so the middlewares
 * satisfy the route-registration overloads without a floating rejection.
 */
const authGuard = (req: Request, res: Response, next: NextFunction): void => {
    void authenticate(req as AuthenticatedRequest, res, next);
};
const requireRoles = (roles: string[]) => (req: Request, res: Response, next: NextFunction): void => {
    void authorize(roles)(req as AuthenticatedRequest, res, next);
};

function initializeAnalyticsRoutes(): Router {
    const router = express.Router();

    // User activity metrics endpoint
    // Requirement: Usage Tracking - Routes for analytics service functionality
    router.get('/user-activity',
        authGuard,
        requireRoles(['admin']),
        validateRequest,
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const { userId, timeframe } = req.query;
                const metrics: UserActivityMetrics[] = await getUserActivityMetrics(
                    timeframe as AnalyticsTimeframe,
                    userId as string
                );
                res.json({
                    success: true,
                    data: metrics
                });
            } catch (error) {
                next(error);
            }
        }
    );

    // System performance metrics endpoint
    // Requirement: System Metrics - API routes for tracking performance metrics
    router.get('/system-performance',
        authGuard,
        requireRoles(['admin']),
        validateRequest,
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const { timeframe } = req.query;
                const metrics: SystemPerformanceMetrics[] = await getSystemPerformanceMetrics(
                    timeframe as AnalyticsTimeframe
                );
                
                // Validate against system performance thresholds
                validateSystemMetrics(metrics);

                res.json({
                    success: true,
                    data: metrics,
                    thresholds: {
                        apiResponseTime: 200, // ms
                        imageProcessingTime: 3000, // ms
                        cpuUsage: 70, // %
                        memoryUsage: 80 // %
                    }
                });
            } catch (error) {
                next(error);
            }
        }
    );

    // Recipe analytics endpoint
    // Requirement: Analytics and Reporting - Comprehensive system monitoring
    router.get('/recipe-analytics',
        authGuard,
        requireRoles(['admin']),
        validateRequest,
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const { recipeId, timeframe } = req.query;
                const analytics: RecipeAnalytics[] = await getRecipeAnalytics(
                    timeframe as AnalyticsTimeframe,
                    recipeId as string
                );
                res.json({
                    success: true,
                    data: analytics
                });
            } catch (error) {
                next(error);
            }
        }
    );

    return router;
}

/**
 * Retrieves user activity metrics with optional filtering
 * Requirement: Usage Tracking - User engagement metrics
 */
async function getUserActivityMetrics(
    timeframe: AnalyticsTimeframe,
    userId?: string
): Promise<UserActivityMetrics[]> {
    // Implementation would be handled by analytics service
    return [] as UserActivityMetrics[];
}

/**
 * Retrieves system performance metrics for specified timeframe
 * Requirement: System Metrics - Performance monitoring
 */
async function getSystemPerformanceMetrics(
    timeframe: AnalyticsTimeframe
): Promise<SystemPerformanceMetrics[]> {
    // Implementation would be handled by analytics service
    return [] as SystemPerformanceMetrics[];
}

/**
 * Retrieves recipe interaction analytics with optional filtering
 * Requirement: Analytics and Reporting - Recipe engagement tracking
 */
async function getRecipeAnalytics(
    timeframe: AnalyticsTimeframe,
    recipeId?: string
): Promise<RecipeAnalytics[]> {
    // Implementation would be handled by analytics service
    return [] as RecipeAnalytics[];
}

/**
 * Validates system metrics against defined thresholds
 * Requirement: System Metrics - Performance thresholds validation
 */
function validateSystemMetrics(metrics: SystemPerformanceMetrics[]): void {
    metrics.forEach(metric => {
        if (metric.apiResponseTime > 200) {
            console.warn(`API response time exceeded threshold: ${metric.apiResponseTime}ms`);
        }
        if (metric.imageProcessingTime > 3000) {
            console.warn(`Image processing time exceeded threshold: ${metric.imageProcessingTime}ms`);
        }
        if (metric.cpuUsage > 70) {
            console.warn(`CPU usage exceeded threshold: ${metric.cpuUsage}%`);
        }
        if (metric.memoryUsage > 80) {
            console.warn(`Memory usage exceeded threshold: ${metric.memoryUsage}%`);
        }
    });
}

// Export configured router
export default initializeAnalyticsRoutes();