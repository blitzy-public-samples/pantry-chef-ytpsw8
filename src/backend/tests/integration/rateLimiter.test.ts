// @version jest ^29.0.0
// @version supertest ^6.0.0

/**
 * HUMAN TASKS:
 * 1. Provision an isolated TEST_REDIS_URI database (and discrete REDIS_HOST/REDIS_PORT/REDIS_PASSWORD/REDIS_DB env)
 *    so limiter counters never collide with other suites (Tech Spec §6.6.1.2).
 * 2. Ensure the Redis keyspace is FLUSHED between CI runs — the limiter `keyPrefix` becomes part of the Redis key,
 *    so stale counters from a prior run could otherwise pre-consume the budget.
 * 3. Tune limiter thresholds here if the product limits in rateLimiter.middleware.ts change
 *    (currently 10/min upload, 30/min match).
 * 4. Run this suite with `--forceExit` (or add a global teardown) since the real CacheService/limiter hold open
 *    Redis connections that this suite does not close (parity with pantry.test.ts).
 */

/**
 * Feature 3 — Rate Limiting integration test (PROMPT-MANDATED, AAP §0.2.4 / §0.4.1 Group 3 / §0.5.1).
 *
 * Proves end-to-end that the two Redis-backed, per-user/per-minute limiters exported by
 * `rateLimiter.middleware.ts` enforce their boundaries and, on breach, return:
 *   - HTTP 429,
 *   - a positive numeric `Retry-After` header (set by the middleware before it throws), and
 *   - the unified `{ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', ... } }` envelope
 *     rendered by the global `errorHandler`.
 *
 * Design notes (see the inline comments for the full rationale):
 *   - Integration tier: the limiter store is built from the real `createRedisClient()`, so a live Redis is
 *     REQUIRED. Redis is NOT mocked.
 *   - A minimal, self-contained Express harness is used instead of the real app: the bare `app` export does not
 *     have `configureRoutes()` applied, and the image router is not mounted (AAP §0.5.2). The harness mounts the
 *     EXACT exported limiter instances, so the assertions exercise the same middleware the production routes use.
 *   - `forwardAsync` is mandatory on Express 4: the limiter throws inside an async function and Express 4 does not
 *     auto-forward a rejected async-middleware promise to the error handler (no `express-async-errors` in repo).
 */

import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { imageUploadLimiter, recipeMatchLimiter } from '../../src/api/middlewares/rateLimiter.middleware';
import { errorHandler } from '../../src/api/middlewares/error.middleware';
import { CacheService } from '../../src/services/cache.service';

describe('Rate Limiter Integration Tests', () => {
    // The limiters and CacheService are backed solely by Redis; this suite deliberately does NOT
    // start MongoDB (mongodb-memory-server). The limiters never touch Mongo, and an in-process
    // mongod adds a brittle dependency on a host OpenSSL 1.1 runtime that is unnecessary here.

    // Real CacheService (zero-arg constructor → internal createRedisClient()). Used purely to perform a
    // best-effort keyspace reset between scenarios via clear(<keyPrefix>*); the limiter's own store shares the
    // same Redis instance, so clearing by prefix isolates each scenario's counter bucket.
    let cacheService: CacheService;

    // Per-run nonce baked into the stubbed user ids. Fixed within a single run so every probe in a scenario counts
    // against the SAME per-user bucket, but unique across runs so a non-flushed Redis still starts from a fresh
    // bucket within the 60s window (documented as a HUMAN TASK above).
    const RUN = Date.now();
    const IMAGE_USER = `rl-image-user-${RUN}`;
    const MATCH_USER = `rl-match-user-${RUN}`;

    /**
     * Forwards a rejected async-middleware promise to Express's `next(err)` so the breach reaches the REAL
     * `errorHandler` and produces the 429 envelope. This is exactly what `express-async-errors`/Express 5 do
     * automatically; here it is implemented locally with zero new dependencies. The wrapped middleware is the
     * unmodified, exported limiter instance — only its invocation is wrapped. The success path (next()) is
     * unaffected.
     */
    const forwardAsync = (mw: any) =>
        (req: Request, res: Response, next: NextFunction) => Promise.resolve(mw(req, res, next)).catch(next);

    /**
     * Builds one self-contained Express harness per limiter:
     *   1. JSON body parsing (parity with the real app pipeline),
     *   2. an auth stub that pins `req.user.id` so the limiter keys deterministically per user,
     *   3. POST /probe guarded by the (async-forwarded) limiter and a trivial 200 success handler,
     *   4. the REAL `errorHandler` registered LAST so a breach renders the unified 429 envelope.
     */
    const makeHarness = (limiter: any, userId: string) => {
        const harness = express();
        harness.use(express.json());
        harness.use((req: Request, _res: Response, next: NextFunction) => {
            (req as any).user = { id: userId }; // stable per-user key for the limiter
            next();
        });
        harness.post(
            '/probe',
            forwardAsync(limiter),
            (_req: Request, res: Response) => res.status(200).json({ success: true })
        );
        harness.use(errorHandler); // REAL error middleware → unified 429 envelope
        return harness;
    };

    beforeAll(() => {
        // Only the Redis-backed CacheService is needed (used for best-effort keyspace resets).
        // The limiter instances open their own Redis connections internally via createRedisClient().
        cacheService = new CacheService();
    });

    // No afterAll: CacheService/the limiters expose no public disconnect, so their Redis handles
    // are released by `--forceExit` (the mandated command), per the HUMAN TASKS note above.

    beforeEach(async () => {
        // Best-effort reset so counters do not bleed between the two scenarios. The limiter `keyPrefix` is part of
        // the Redis key, so clearing by prefix isolates each scenario's bucket (mirrors the template's clear pattern).
        await cacheService.clear('image:upload*');
        await cacheService.clear('recipe:match*');
        jest.clearAllMocks();
    });

    describe('imageUploadLimiter (10 requests/user/minute)', () => {
        it('allows the first 10 requests, then returns 429 with a Retry-After header on the 11th', async () => {
            const harness = makeHarness(imageUploadLimiter, IMAGE_USER);

            // Sequential awaits (NEVER Promise.all): racing the shared bucket yields nondeterministic counts.
            for (let i = 0; i < 10; i++) {
                const res = await request(harness).post('/probe');
                expect(res.status).toBe(200);
            }

            const blocked = await request(harness).post('/probe'); // the 11th within the 60s window
            expect(blocked.status).toBe(429);
            expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
            expect(blocked.body.success).toBe(false);
            expect(blocked.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
        });
    });

    describe('recipeMatchLimiter (30 requests/user/minute)', () => {
        it('allows the first 30 requests, then returns 429 with a Retry-After header on the 31st', async () => {
            await cacheService.clear('recipe:match*'); // explicit reset before this scenario
            const harness = makeHarness(recipeMatchLimiter, MATCH_USER);

            // Sequential awaits (NEVER Promise.all) so the count against the per-user bucket is deterministic.
            for (let i = 0; i < 30; i++) {
                const res = await request(harness).post('/probe');
                expect(res.status).toBe(200);
            }

            const blocked = await request(harness).post('/probe'); // the 31st within the window
            expect(blocked.status).toBe(429);
            expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
            expect(blocked.body.success).toBe(false);
            expect(blocked.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
        });
    });
});
