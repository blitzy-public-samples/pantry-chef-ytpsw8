// @version jest ^29.0.0
// @version supertest ^6.0.0
// @version mongodb-memory-server ^8.0.0

/**
 * End-to-end tests for the Shopping List API (Feature 1 — cross-device sync).
 * Exercises all six routes, authenticate gating (401), and ownership isolation (404).
 *
 * HUMAN TASKS:
 * 1. Ensure a Redis instance is reachable for the test run (REDIS_HOST/REDIS_PORT or
 *    TEST_REDIS_URI); the shopping service uses CacheService for every operation.
 * 2. Ensure MongoMemoryServer can download/spin up the Mongo binary in the CI sandbox.
 * 3. Keep NODE_ENV=test so src/app.ts does not auto-start an HTTP/WebSocket server.
 * 4. If the shopping controller's success/error envelope changes, update the envelope
 *    assertions; re-confirm the cross-user `generate` behavior (creates a new list → 201).
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { Application } from 'express';
// NOTE: src/app.ts exports a BARE `app` (no routes) plus the async factory
// `initializeApp()` that wires routes/db/redis and RETURNS the configured app.
// We import and exercise ONLY the configured app produced by initializeApp().
import { initializeApp } from '../../src/app';
// The authenticate middleware's verifyToken requires a JWT payload containing
// userId + email + roles[]; register/login responses do NOT yield such a token,
// so we mint one directly with generateToken (HS256, same jwtConfig.secret).
import { generateToken } from '../../src/utils/security';

// ---------------------------------------------------------------------------
// Module-level state shared across the suite lifecycle hooks and specs.
// ---------------------------------------------------------------------------
let mongoServer: MongoMemoryServer;
let configuredApp: Application;
let authToken: string;
let secondAuthToken: string;
let testUserId: string;
let secondUserId: string;
let testListId: string;
let testItemId: string;

// Router is mounted at /api/v1/shopping-lists. The GET list handler is registered
// as `router.get('/shopping-lists', ...)`, so the effective list path is DOUBLED.
// There is intentionally NO GET-by-id route — ownership isolation is exercised
// through PUT / DELETE / PATCH(toggle) instead.
const BASE = '/api/v1/shopping-lists';
const LIST_PATH = `${BASE}/shopping-lists`; // VERBATIM doubled path (the registered GET route)

// IDs serialize as `_id` (the shopping model uses { timestamps: true } with no
// toJSON virtual/transform), so the Mongoose `id` virtual is not present in JSON.
// Capture `id || _id` for both lists and embedded item subdocuments.
const extractId = (obj: any): string =>
  obj && (obj.id || obj._id) ? String(obj.id || obj._id) : '';

// Builds a create payload that satisfies createShoppingListValidation:
// `name` is 1–100 chars; each item has a non-empty `name` and a float `quantity` >= 0.
const buildListPayload = (overrides: Record<string, any> = {}) => ({
  name: 'Weekly Groceries',
  items: [
    { name: 'Milk', quantity: 2, unit: 'liters', category: 'Dairy', checked: false, notes: 'Organic' },
  ],
  ...overrides,
});

// Satisfies generateShoppingListValidation: `recipeIds` is a non-empty string array,
// `servings` is an integer >= 1, and the booleans are optional. `excludeInventoryItems`
// is kept false so generate() does not require pantry data; generate derives items
// from `recipeIds` alone (no recipe seeding required).
const generateOptions = {
  recipeIds: ['recipe-1'],
  servings: 2,
  excludeInventoryItems: false,
  mergeDuplicates: true,
};

// ---------------------------------------------------------------------------
// Lifecycle hooks
// ---------------------------------------------------------------------------
beforeAll(async () => {
  // Keep NODE_ENV=test so the bottom-of-file auto-start in src/app.ts stays disabled.
  process.env.NODE_ENV = 'test';

  // Spin up a disposable in-memory MongoDB and point the app's connectDatabase() at it.
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  // Honor an external Redis if provided (otherwise CacheService defaults to localhost:6379).
  // e.g. if (process.env.TEST_REDIS_URI) { /* parse into REDIS_HOST/REDIS_PORT if desired */ }

  // initializeApp() connects mongoose to MONGODB_URI (set above) AND configures routes.
  // It does NOT start an HTTP/WS server (that is the separate startServer()).
  configuredApp = await initializeApp();

  const emailA = 'user.a.e2e@example.com';
  const emailB = 'user.b.e2e@example.com';
  // Meets the password policy: upper + lower + number + special, no 3 repeating chars.
  const password = 'Shop@List9xQ';

  // Register both users to mirror the template bootstrap. We derive each userId
  // defensively from the register response and fall back to a fresh ObjectId; the
  // minted token works regardless of register's exact response shape because the
  // shopping routes scope by the token's userId and never look the user up in the DB.
  const regA = await request(configuredApp)
    .post('/api/v1/auth/register')
    .send({ email: emailA, password, firstName: 'Test', lastName: 'UserA' });
  testUserId = extractId(regA.body?.data?.user) || new mongoose.Types.ObjectId().toString();

  const regB = await request(configuredApp)
    .post('/api/v1/auth/register')
    .send({ email: emailB, password, firstName: 'Test', lastName: 'UserB' });
  secondUserId = extractId(regB.body?.data?.user) || new mongoose.Types.ObjectId().toString();

  // Mint authenticating bearer tokens (await — generateToken is async).
  authToken = await generateToken({ userId: testUserId, email: emailA, roles: [] });
  secondAuthToken = await generateToken({ userId: secondUserId, email: emailB, roles: [] });
}, 60000); // generous timeout: MongoMemoryServer binary spin-up may exceed the 30s default

afterAll(async () => {
  // Do NOT call mongoose.connect() anywhere in this suite — initializeApp() already
  // connected the default connection; here we simply tear it down and stop the server.
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  // Wipe all collections between specs for full isolation. Dropping users is harmless
  // because the minted tokens do not depend on a persisted user document.
  await mongoose.connection.dropDatabase();
});

beforeEach(async () => {
  // Seed a fresh list (with one item) owned by user A for the
  // update / delete / toggle / list scenarios in each spec.
  const res = await request(configuredApp)
    .post(`${BASE}/`)
    .set('Authorization', `Bearer ${authToken}`)
    .send(buildListPayload());
  testListId = extractId(res.body?.data);
  testItemId = extractId(res.body?.data?.items?.[0]);
});

// ---------------------------------------------------------------------------
// Specs — every success response is the unified envelope { success, data, metadata }.
// ---------------------------------------------------------------------------
describe('Shopping List API (e2e)', () => {
  describe('POST /api/v1/shopping-lists/ (create)', () => {
    it('creates a list → 201 + unified envelope', async () => {
      const res = await request(configuredApp)
        .post(`${BASE}/`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(buildListPayload({ name: 'Party Supplies' }));
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.metadata).toBeDefined();
      expect(extractId(res.body.data)).toBeTruthy();
    });

    it('401 without a bearer token', async () => {
      const res = await request(configuredApp).post(`${BASE}/`).send(buildListPayload());
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/shopping-lists/shopping-lists (list — doubled verbatim path)', () => {
    it('returns 200 + array', async () => {
      const res = await request(configuredApp)
        .get(LIST_PATH)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.metadata).toBeDefined();
    });

    it('401 without a bearer token', async () => {
      const res = await request(configuredApp).get(LIST_PATH);
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/shopping-lists/:id (update)', () => {
    it('updates → 200', async () => {
      const res = await request(configuredApp)
        .put(`${BASE}/${testListId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.metadata).toBeDefined();
    });

    it('401 without a bearer token', async () => {
      const res = await request(configuredApp).put(`${BASE}/${testListId}`).send({ name: 'X' });
      expect(res.status).toBe(401);
    });

    it('404 when user B updates user A\'s list (ownership isolation)', async () => {
      const res = await request(configuredApp)
        .put(`${BASE}/${testListId}`)
        .set('Authorization', `Bearer ${secondAuthToken}`)
        .send({ name: 'Hijack' });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/shopping-lists/:id/generate (generate)', () => {
    it('generates → 201', async () => {
      const res = await request(configuredApp)
        .post(`${BASE}/${testListId}/generate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(generateOptions);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.metadata).toBeDefined();
    });

    it('401 without a bearer token', async () => {
      const res = await request(configuredApp)
        .post(`${BASE}/${testListId}/generate`)
        .send(generateOptions);
      expect(res.status).toBe(401);
    });

    // VERIFIED: the controller calls shoppingService.generate(userId, req.body) with
    // EXACTLY two args, ignoring req.params.id; the service CREATES A NEW list for the
    // caller. Therefore a cross-user generate is 201 (B creates B's own list), NOT 404.
    // (Re-confirm against the real controller/service signature at runtime — HUMAN TASK
    // #4: if a future implementation passes req.params.id and enforces ownership, flip
    // this single case to expect 404.)
    it('cross-user generate creates the caller\'s own list → 201 (NOT 404)', async () => {
      const res = await request(configuredApp)
        .post(`${BASE}/${testListId}/generate`)
        .set('Authorization', `Bearer ${secondAuthToken}`)
        .send(generateOptions);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PATCH /api/v1/shopping-lists/:id/items/:itemId/toggle (toggle)', () => {
    it('toggles an item → 200', async () => {
      const res = await request(configuredApp)
        .patch(`${BASE}/${testListId}/items/${testItemId}/toggle`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.metadata).toBeDefined();
    });

    it('401 without a bearer token', async () => {
      const res = await request(configuredApp).patch(
        `${BASE}/${testListId}/items/${testItemId}/toggle`,
      );
      expect(res.status).toBe(401);
    });

    it('404 when user B toggles an item in user A\'s list (ownership isolation)', async () => {
      const res = await request(configuredApp)
        .patch(`${BASE}/${testListId}/items/${testItemId}/toggle`)
        .set('Authorization', `Bearer ${secondAuthToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/shopping-lists/:id (delete)', () => {
    it('deletes → 200 + message', async () => {
      const res = await request(configuredApp)
        .delete(`${BASE}/${testListId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.message).toBe('Shopping list deleted');
      expect(res.body.metadata).toBeDefined();
    });

    it('401 without a bearer token', async () => {
      const res = await request(configuredApp).delete(`${BASE}/${testListId}`);
      expect(res.status).toBe(401);
    });

    it('404 when user B deletes user A\'s list (ownership isolation)', async () => {
      const res = await request(configuredApp)
        .delete(`${BASE}/${testListId}`)
        .set('Authorization', `Bearer ${secondAuthToken}`);
      expect(res.status).toBe(404);
    });
  });
});
