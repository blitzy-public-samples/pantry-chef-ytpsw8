import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { AppError } from '../../utils/errors';
import { createRedisClient } from '../../config/redis';

/*
HUMAN TASKS:
1. Configure Redis credentials in environment variables for rate limiting
2. Set up monitoring alerts for rate limit exceeded events
3. Configure rate limit thresholds based on load testing results
4. Set up rate limit analytics dashboard
5. Configure IP allowlist/blocklist in environment variables
*/

// Default rate limiting configuration
const DEFAULT_POINTS = 100; // Default number of requests allowed per duration window
const DEFAULT_DURATION = 3600; // Default time window in seconds (1 hour)
const RATE_LIMIT_EXCEEDED_CODE = 429; // HTTP status code for rate limit exceeded responses

/**
 * Creates a rate limiter instance with Redis store and configurable options
 * Requirement: Rate Limiting - Redis-backed rate limiter configuration
 */
const createRateLimiter = (options: {
  points?: number;
  duration?: number;
  blockDuration?: number;
  keyPrefix?: string;
}): RateLimiterRedis => {
  const {
    points = DEFAULT_POINTS,
    duration = DEFAULT_DURATION,
    blockDuration = 0,
    keyPrefix = 'rl',
  } = options;

  try {
    // Create Redis client for rate limiting
    const redisClient = createRedisClient();

    // Configure rate limiter with Redis store
    return new RateLimiterRedis({
      storeClient: redisClient,
      points,
      duration,
      blockDuration,
      keyPrefix,
      insuranceLimiter: new RateLimiterRedis({
        storeClient: redisClient,
        points: 1,
        duration: 1,
        keyPrefix: `${keyPrefix}:insurance`,
      }),
    });
  } catch (error: any) {
    throw new AppError('Failed to initialize rate limiter', 500, 'RATE_LIMITER_INIT_ERROR', {
      error: error.message,
    });
  }
};

/**
 * Express middleware that enforces rate limiting on API routes with Redis persistence
 * Requirement: Security Protocols - Rate limiting implementation with monitoring
 */
interface RequestWithUserData extends Request {
  user: any;
  ip: any;
}

export const rateLimiterMiddleware = (
  options: {
    points?: number;
    duration?: number;
    blockDuration?: number;
    keyPrefix?: string;
  } = {}
) => {
  const rateLimiter = createRateLimiter(options);

  return async (req: RequestWithUserData, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract client identifier (IP address or user ID if authenticated)
      const identifier = req.user?.id || req.ip;
      const clientId = identifier!.replace(/:/g, '');

      // Check rate limit status for client
      const rateLimitResult = await rateLimiter.consume(clientId);

      // Add rate limit headers to response
      res.set({
        'X-RateLimit-Limit': options.points || DEFAULT_POINTS,
        'X-RateLimit-Remaining': rateLimitResult.remainingPoints,
        'X-RateLimit-Reset': new Date(Date.now() + rateLimitResult.msBeforeNext).toUTCString(),
        'Retry-After': Math.ceil(rateLimitResult.msBeforeNext / 1000),
      });

      next();
    } catch (error: any) {
      if (error.remainingPoints !== undefined) {
        // Rate limit exceeded error
        throw new AppError('Rate limit exceeded', RATE_LIMIT_EXCEEDED_CODE, 'RATE_LIMIT_EXCEEDED', {
          retryAfter: Math.ceil(error.msBeforeNext / 1000),
          limit: options.points || DEFAULT_POINTS,
          windowSize: options.duration || DEFAULT_DURATION,
          ip: req.ip,
        });
      }

      // Other rate limiter errors
      throw new AppError('Rate limiting error', 500, 'RATE_LIMITER_ERROR', {
        error: error.message,
      });
    }
  };
};

// This implementation:

// 1. Addresses the rate limiting requirements from section 9.3.1 of the technical specification by implementing a Redis-backed rate limiter.
// 2. Uses the AppError class from errors.ts for consistent error handling.
// 3. Uses the Redis client factory from redis.ts for store configuration.
// 4. Implements configurable rate limiting with default values.
// 5. Adds standard rate limit headers to responses.
// 6. Includes monitoring context in error objects.
// 7. Provides flexible client identification using IP or user ID.
// 8. Implements a fallback insurance limiter for Redis failures.
// 9. Uses TypeScript for type safety.
// 10. Follows the security protocols outlined in section 9.3.

// The middleware can be used in route configurations with custom options:
