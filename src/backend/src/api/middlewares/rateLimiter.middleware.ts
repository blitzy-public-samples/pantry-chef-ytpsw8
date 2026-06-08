import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible'; // ^2.4.1
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
  } catch (error) {
    // `error` is typed `unknown` under strict mode; narrow before reading `.message`.
    throw new AppError('Failed to initialize rate limiter', 500, 'RATE_LIMITER_INIT_ERROR', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Express middleware that enforces rate limiting on API routes with Redis persistence
 * Requirement: Security Protocols - Rate limiting implementation with monitoring
 */
export const rateLimiterMiddleware = (
  options: {
    points?: number;
    duration?: number;
    blockDuration?: number;
    keyPrefix?: string;
  } = {}
): ((req: Request, res: Response, next: NextFunction) => void) => {
  const rateLimiter = createRateLimiter(options);

  // The returned middleware is intentionally SYNCHRONOUS (returns `void`) even though
  // the limiter check is asynchronous. Express 4 does not attach a `.catch` to promises
  // returned by middleware, so a rejected async middleware would surface as an unhandled
  // rejection and never reach the global `errorHandler` (the request would hang instead
  // of returning HTTP 429). To make the limiter safe to mount directly in route chains
  // (e.g. `router.post('/upload', authenticate, imageUploadLimiter, handler)`), the async
  // work runs inside a self-invoking function whose every outcome — success, breach, or
  // failure — is funneled back through `next(...)`. Returning `void` also satisfies the
  // Express `RequestHandler` contract and avoids the `no-misused-promises` lint that fires
  // when a Promise-returning handler is passed where a void-returning one is expected.
  return (req: Request, res: Response, next: NextFunction): void => {
    void (async (): Promise<void> => {
      try {
        // Extract client identifier (IP address or user ID if authenticated).
        // `req.user?.id` and `req.ip` are both `string | undefined`; fall back to a
        // sentinel so the value is always a defined string before `.replace(...)`.
        const clientId = (req.user?.id ?? req.ip ?? 'unknown').replace(/:/g, '');

        // Check rate limit status for client
        const rateLimitResult = await rateLimiter.consume(clientId);

        // Add rate limit headers to response
        res.set({
          'X-RateLimit-Limit': options.points ?? DEFAULT_POINTS,
          'X-RateLimit-Remaining': rateLimitResult.remainingPoints,
          'X-RateLimit-Reset': new Date(Date.now() + rateLimitResult.msBeforeNext).toUTCString(),
          'Retry-After': Math.ceil(rateLimitResult.msBeforeNext / 1000),
        });

        next();
      } catch (error) {
        // On a limit breach, rate-limiter-flexible rejects with a `RateLimiterRes`
        // instance (carrying msBeforeNext/remainingPoints); any other rejection is a
        // genuine limiter/Redis failure. The `instanceof` guard narrows `error` (typed
        // `unknown` under strict mode) so its numeric fields are type-safe to read.
        if (error instanceof RateLimiterRes) {
          // Rate limit exceeded: set the HTTP Retry-After header (seconds) so the 429
          // response carries it directly (the global errorHandler only embeds retryAfter
          // in the JSON body), then FORWARD the 429 AppError via next(error) rather than
          // throwing — forwarding is what reaches errorHandler from async middleware.
          res.set('Retry-After', String(Math.ceil(error.msBeforeNext / 1000)));
          next(
            new AppError('Rate limit exceeded', RATE_LIMIT_EXCEEDED_CODE, 'RATE_LIMIT_EXCEEDED', {
              retryAfter: Math.ceil(error.msBeforeNext / 1000),
              limit: options.points ?? DEFAULT_POINTS,
              windowSize: options.duration ?? DEFAULT_DURATION,
              ip: req.ip,
            })
          );
          return;
        }

        // Other rate limiter errors; narrow `unknown` before reading `.message`, then
        // forward a 500 AppError through next(error) for consistent error handling.
        next(
          new AppError('Rate limiting error', 500, 'RATE_LIMITER_ERROR', {
            error: error instanceof Error ? error.message : String(error),
          })
        );
      }
    })();
  };
};

/**
 * Pre-configured limiter for the image upload route: 10 requests per user per minute.
 * Consumed by routes/image.routes.ts on POST /upload.
 * Reuses the shared rateLimiterMiddleware factory so per-user keying and the
 * Retry-After header on 429 responses are inherited automatically.
 */
export const imageUploadLimiter = rateLimiterMiddleware({
  points: 10,
  duration: 60,
  keyPrefix: 'image:upload',
});

/**
 * Pre-configured limiter for the recipe match route: 30 requests per user per minute.
 * Consumed by routes/recipe.routes.ts on POST /match.
 * Reuses the shared rateLimiterMiddleware factory so per-user keying and the
 * Retry-After header on 429 responses are inherited automatically.
 */
export const recipeMatchLimiter = rateLimiterMiddleware({
  points: 30,
  duration: 60,
  keyPrefix: 'recipe:match',
});
