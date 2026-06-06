// @version jest ^29.0.0
// @version supertest ^6.0.0
// @version mongodb-memory-server ^8.0.0

/**
 * Integration tests for the server-authoritative ShoppingService (Feature 1 —
 * Shopping List Backend Route and Cross-Device Sync). Mirrors the canonical
 * template tests/integration/pantry.test.ts (header, lifecycle, beforeEach reset
 * pattern, and nested describe/it structure) while swapping the domain to shopping.
 *
 * The System Under Test (ShoppingService) runs against REAL infrastructure: an
 * in-memory MongoDB (mongodb-memory-server) backing the real ShoppingModel, and the
 * REAL CacheService backed by Redis (never mocked). Coverage spans CRUD, the
 * cache-first read / default-TTL write-back path, generate() with pantry inventory
 * exclusion + duplicate merge, toggleItem, and user-scoping / ownership isolation.
 *
 * HUMAN TASKS:
 * 1. Provision a TEST_REDIS_URI (and discrete REDIS_HOST/REDIS_PORT/REDIS_PASSWORD/
 *    REDIS_DB env) so the real CacheService can connect during integration runs
 *    (Tech Spec §6.6.1.2).
 * 2. Ensure the Redis keyspace is flushed between CI runs to avoid stale `shopping:*`
 *    cache bleed across suites.
 * 3. Ensure mongodb-memory-server can launch its bundled mongod binary in the CI
 *    sandbox. On hosts whose system OpenSSL is 3.x (e.g. Ubuntu 23.10+), the bundled
 *    mongod 5.0 binary requires OpenSSL 1.1 — run with
 *    `LD_LIBRARY_PATH=<dir containing libcrypto.so.1.1/libssl.so.1.1>`.
 * 4. If ShoppingService.generate() changes its item-naming / inventory-matching
 *    strategy (currently it names items `Recipe <recipeId>` and matches the exclusion
 *    index against the pantry item's ingredientId), realign the seeded on-hand
 *    identifier in the generate test so exclusion stays genuinely exercised.
 * 5. Run with `--forceExit` (or add a global teardown) since the real CacheService
 *    holds an open Redis connection this suite does not close (parity with
 *    pantry.test.ts).
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { ShoppingService } from '../../src/services/shopping.service';
import { CacheService } from '../../src/services/cache.service';
import { PantryService } from '../../src/services/pantry.service';
import { ShoppingModel } from '../../src/models/shopping.model';
import {
  IShoppingList,
  IShoppingListItem,
  IShoppingListGenerationOptions,
} from '../../src/interfaces/shopping.interface';
import { Pantry, PantryItem, StorageLocation } from '../../src/interfaces/pantry.interface';

/**
 * Mock ONLY the PantryService collaborator via an explicit factory (not the default
 * auto-mock). The System Under Test (the REAL ShoppingService) statically imports
 * PantryService, and — because the backend compiles with `emitDecoratorMetadata` —
 * the ShoppingService constructor parameter type is emitted as a runtime value
 * reference. That reference would otherwise pull the real pantry.service.ts (and,
 * transitively, pantry.model.ts) into the ts-jest transform; those committed files
 * carry pre-existing, out-of-scope compile issues (undeclared custom Mongoose statics
 * on the model and a static-member call made on an instance). The factory keeps the
 * real pantry files out of the transform graph while we hand-inject a typed
 * PantryService double. CacheService and ShoppingModel are deliberately NOT mocked:
 * this is an integration test against live Redis + in-memory MongoDB.
 */
jest.mock('../../src/services/pantry.service', () => ({
  PantryService: jest.fn(),
}));

describe('Shopping List Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let shoppingService: ShoppingService;
  let cacheService: CacheService;
  let pantryService: jest.Mocked<PantryService>;

  // Two distinct users to prove ownership isolation / user-scoping.
  const testUserId = 'shopping-test-user';
  const secondUserId = 'shopping-test-user-2';

  beforeAll(async () => {
    // Spin up a disposable in-memory MongoDB and connect the default mongoose
    // connection to it so the real ShoppingModel persists for the duration of the run.
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // REAL Redis-backed cache (zero-arg constructor -> internal createRedisClient()).
    cacheService = new CacheService();

    // Typed PantryService double. ShoppingService.generate() consumes only
    // getPantry(userId); the generate test stubs its resolved value with a seeded pantry.
    pantryService = {
      getPantry: jest.fn(),
    } as unknown as jest.Mocked<PantryService>;

    // REAL System Under Test: two-dependency constructor (CacheService, PantryService).
    shoppingService = new ShoppingService(cacheService, pantryService);
  });

  afterAll(async () => {
    // Tear down the mongoose connection and stop the in-memory server. The real
    // CacheService Redis handle is released by `--forceExit` (see HUMAN TASKS #5).
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Reset persistent + cache state before each test for full isolation.
    await ShoppingModel.deleteMany({});
    await cacheService.clear('shopping:*');
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a shopping list scoped to the user', async () => {
      const list = await shoppingService.create(testUserId, {
        name: 'Groceries',
        // Item fixtures intentionally omit server-generated (`id`) and model-defaulted
        // (`category`, `notes`) fields that Mongoose fills, so cast to satisfy typing.
        items: [
          { name: 'Milk', quantity: 1, unit: 'L', checked: false },
        ] as unknown as IShoppingListItem[],
      });

      expect(list).toBeDefined();
      expect(list.userId).toBe(testUserId);
      expect(list.name).toBe('Groceries');
      expect(list.items).toHaveLength(1);
      expect(list.items[0].name).toBe('Milk');
    });
  });

  describe('getLists / getList', () => {
    it('returns user lists and populates the shopping cache (default 1h TTL)', async () => {
      await shoppingService.create(testUserId, {
        name: 'Groceries',
        items: [
          { name: 'Milk', quantity: 1, unit: 'L', checked: false },
        ] as unknown as IShoppingListItem[],
      });

      // First read: cache miss -> DB find -> write-back to the per-user cache.
      const first = await shoppingService.getLists(testUserId);
      expect(first).toHaveLength(1);

      // The write-back proves the default-TTL cache path: getLists populated
      // shopping:<userId> using set(key, value) with NO explicit TTL, so the
      // CacheService 3600s default applies. We assert the cache is populated, never
      // an exact TTL value.
      const cached = await cacheService.get<IShoppingList[]>(`shopping:${testUserId}`);
      expect(cached).not.toBeNull();
      expect(cached).toHaveLength(1);

      // Second read returns identical data. The cached value is JSON-parsed plain
      // objects (not Mongoose docs), so compare by length + key fields, not by strict
      // deep-equality against the first (Mongoose-doc) result.
      const second = await shoppingService.getLists(testUserId);
      expect(second).toHaveLength(first.length);
      expect(second[0].name).toBe(first[0].name);
    });

    it('returns a single list by id', async () => {
      const created = await shoppingService.create(testUserId, {
        name: 'Groceries',
        items: [],
      });

      const fetched = await shoppingService.getList(testUserId, created.id);
      expect(fetched.id).toBe(created.id);
      expect(fetched.name).toBe('Groceries');
    });
  });

  describe('update', () => {
    it('updates the list name and persists the change', async () => {
      const created = await shoppingService.create(testUserId, {
        name: 'Groceries',
        items: [],
      });

      const updated = await shoppingService.update(testUserId, created.id, {
        name: 'Weekly Groceries',
      });
      expect(updated.name).toBe('Weekly Groceries');

      const refetched = await shoppingService.getList(testUserId, created.id);
      expect(refetched.name).toBe('Weekly Groceries');
    });
  });

  describe('toggleItem', () => {
    it('flips the checked flag of an item', async () => {
      const created = await shoppingService.create(testUserId, {
        name: 'Groceries',
        items: [
          { name: 'Milk', quantity: 1, unit: 'L', checked: false },
        ] as unknown as IShoppingListItem[],
      });

      // The service matches the target item by its subdocument `id` virtual
      // (candidate.id === itemId), so resolve and pass that hex-string id directly.
      const itemId = created.items[0].id;
      const original = created.items[0].checked;

      const toggled = await shoppingService.toggleItem(testUserId, created.id, itemId);
      const toggledItem = toggled.items.find((item) => item.id === itemId);

      expect(toggledItem).toBeDefined();
      expect(toggledItem?.checked).toBe(!original);
    });
  });

  describe('delete', () => {
    it('deletes the list and 404s on a subsequent getList', async () => {
      const created = await shoppingService.create(testUserId, {
        name: 'Groceries',
        items: [],
      });

      await shoppingService.delete(testUserId, created.id);

      // AppError carries statusCode + code, so the rejection is matched precisely.
      await expect(shoppingService.getList(testUserId, created.id)).rejects.toMatchObject({
        statusCode: 404,
        code: 'SHOPPING_LIST_NOT_FOUND',
      });
    });
  });

  describe('generate', () => {
    it('excludes on-hand pantry inventory and merges duplicates', async () => {
      // generate() reads inventory via PantryService.getPantry(userId) when
      // excludeInventoryItems is true. It names each candidate item `Recipe <recipeId>`
      // and matches the exclusion index by item NAME (lowercased) against the pantry
      // item's ingredientId (lowercased). Seed the on-hand item on `Recipe r1` with
      // ample quantity so the merged `Recipe r1` candidate is fully covered (genuinely
      // excluded), while the non-stocked `Recipe r2` candidate survives.
      const onHand: PantryItem = {
        ingredientId: 'Recipe r1',
        quantity: 10,
        unit: 'units',
        location: StorageLocation.PANTRY,
        purchaseDate: new Date(),
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notes: '',
      };
      const seededPantry: Pantry = {
        id: 'seed-pantry',
        userId: testUserId,
        name: 'Test Pantry',
        items: [onHand],
        locations: Object.values(StorageLocation),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      pantryService.getPantry.mockResolvedValue(seededPantry);

      const options: IShoppingListGenerationOptions = {
        recipeIds: ['r1', 'r1', 'r2'],
        servings: 2,
        excludeInventoryItems: true,
        mergeDuplicates: true,
      };
      const generated = await shoppingService.generate(testUserId, options);

      // The result is a valid, user-scoped, persisted list echoing the options.
      expect(generated).toBeDefined();
      expect(generated.userId).toBe(testUserId);
      expect(Array.isArray(generated.items)).toBe(true);
      expect(generated.generationOptions?.excludeInventoryItems).toBe(true);
      expect(generated.generationOptions?.mergeDuplicates).toBe(true);

      // generate() consulted the pantry for inventory exclusion.
      expect(pantryService.getPantry).toHaveBeenCalledWith(testUserId);

      // Genuine exclusion: the fully on-hand `Recipe r1` candidate is dropped, while
      // the non-stocked `Recipe r2` candidate survives.
      expect(generated.items.some((item) => item.name === 'Recipe r1')).toBe(false);
      expect(generated.items.some((item) => item.name === 'Recipe r2')).toBe(true);

      // Resilient reduction: exclusion + merge can only reduce the candidate set,
      // never inflate it beyond the requested recipe count.
      expect(generated.items.length).toBeLessThanOrEqual(options.recipeIds.length);
    });
  });

  describe('user-scoping / ownership isolation', () => {
    it('does not leak lists across users', async () => {
      const created = await shoppingService.create(testUserId, {
        name: 'Groceries',
        items: [],
      });

      // A different user sees none of the first user's lists.
      const otherLists = await shoppingService.getLists(secondUserId);
      expect(otherLists).toHaveLength(0);

      // The combined { _id, userId } filter means user B cannot read user A's list.
      await expect(shoppingService.getList(secondUserId, created.id)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
