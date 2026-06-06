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
 * in-memory MongoDB (mongodb-memory-server) backing the real ShoppingModel + PantryModel,
 * and the REAL CacheService backed by Redis (never mocked). Coverage spans CRUD, the
 * cache-first read / default-TTL write-back path, RECIPE-DRIVEN generate() (ingredient
 * aggregation + serving scaling + duplicate merge) with REAL-pantry inventory exclusion
 * matched by ingredient id, toggleItem, and user-scoping / ownership isolation. Only the
 * recipe + ingredient INPUT models are factory-mocked (their committed files are
 * out-of-scope-dirty); the exclusion path they feed runs through the real PantryService.
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
 * 4. ShoppingService.generate() is RECIPE-DRIVEN: it resolves the referenced recipes
 *    (RecipeModel) and their ingredient master records (IngredientModel) to build items,
 *    names each item from the trusted ingredient master (never the client recipe id),
 *    scales quantities by (targetServings / recipe.servings), merges duplicate ingredients
 *    (by ingredient id + unit), and excludes on-hand pantry inventory matched by INGREDIENT
 *    ID. recipe.model/ingredient.model are factory-mocked here (their real files are
 *    out-of-scope-dirty); if the generation algorithm changes (different scaling, merge, or
 *    exclusion keying), realign the recipe/ingredient fixtures and the seeded pantry
 *    ingredient id below so exclusion stays genuinely exercised against the REAL PantryModel.
 * 5. Run with `--forceExit` (or add a global teardown) since the real CacheService
 *    holds an open Redis connection this suite does not close (parity with
 *    pantry.test.ts).
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { ShoppingService } from '../../src/services/shopping.service';
import { CacheService } from '../../src/services/cache.service';
import { PantryService } from '../../src/services/pantry.service';
import { QueueService } from '../../src/services/queue.service';
import { NotificationService } from '../../src/services/notification.service';
import { ShoppingModel } from '../../src/models/shopping.model';
import { PantryModel } from '../../src/models/pantry.model';
import { RecipeModel } from '../../src/models/recipe.model';
import { IngredientModel } from '../../src/models/ingredient.model';
import {
  IShoppingList,
  IShoppingListItem,
  IShoppingListGenerationOptions,
} from '../../src/interfaces/shopping.interface';
import { PantryItem, StorageLocation } from '../../src/interfaces/pantry.interface';

/**
 * Integration realism: the REAL PantryService is exercised end-to-end (no PantryService
 * double). `ShoppingService.generate()` reads inventory through the actual
 * `PantryService.getPantry()` -> real `PantryModel` -> in-memory MongoDB path, so pantry
 * inventory exclusion is validated against a genuinely seeded pantry (not a stub).
 *
 * Only the PantryService's transitive *external* collaborators are factory-mocked:
 * `QueueService` and `NotificationService`. The real PantryService statically imports both,
 * and — because the backend compiles with `emitDecoratorMetadata` — those constructor
 * parameter types are emitted as runtime value references that would pull the real
 * queue.service.ts / notification.service.ts into the ts-jest transform. Those two committed
 * files carry pre-existing, out-of-scope compile issues (RabbitMQ/Firebase/email typings) and
 * open real AMQP/Firebase connections on construction. Factory-mocking them keeps the dirty
 * files out of the transform graph AND avoids opening external connections, while the pantry
 * read path (`getPantry`) — which touches only CacheService + PantryModel — runs for real.
 * `getPantry` never calls queue/notification, so empty mock instances fully satisfy the
 * PantryService constructor. CacheService, ShoppingModel, and PantryModel are NOT mocked:
 * this is an integration test against live Redis + in-memory MongoDB.
 */
jest.mock('../../src/services/queue.service', () => ({
  QueueService: jest.fn(),
}));
jest.mock('../../src/services/notification.service', () => ({
  NotificationService: jest.fn(),
}));

/**
 * recipe.model.ts and ingredient.model.ts are factory-mocked for the SAME reason as the two
 * services above: ShoppingService.generate() now statically imports both models (recipe-driven
 * aggregation), and those committed model files carry pre-existing, out-of-scope Mongoose-typing
 * errors (ObjectId-ref on a string-typed field) that ts-jest would surface at transform time —
 * failing the suite before any assertion runs — if their real files entered the transform graph.
 * The factories expose only the single static generate() consumes — find() — as a jest.fn(), so
 * the recipe + ingredient INPUTS are controlled fixtures. The inventory-exclusion path those
 * fixtures feed remains fully REAL: the seeded PantryModel is read through the actual
 * PantryService.getPantry() -> PantryModel -> in-memory MongoDB path, so exclusion-by-ingredient-id
 * is validated against genuinely persisted inventory (not a stub). ShoppingModel, PantryModel, and
 * CacheService are NEVER mocked.
 */
jest.mock('../../src/models/recipe.model', () => ({
  RecipeModel: { find: jest.fn() },
}));
jest.mock('../../src/models/ingredient.model', () => ({
  IngredientModel: { find: jest.fn() },
}));

describe('Shopping List Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let shoppingService: ShoppingService;
  let cacheService: CacheService;
  // REAL PantryService (not a double): generate() reads inventory through its actual path.
  let pantryService: PantryService;

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

    // REAL PantryService wired with the SAME real CacheService and stand-in external
    // collaborators (QueueService / NotificationService). The two modules are jest.mock'd with
    // factories above so their dirty real files are never transformed; the collaborators are
    // built as empty `{}` casts (rather than `new`) so the test never depends on those
    // constructors' signatures. getPantry — the only method generate() consumes — touches
    // CacheService + PantryModel only and never calls queue/notification, so empty doubles fully
    // satisfy the three-arg PantryService constructor.
    const queueService = {} as jest.Mocked<QueueService>;
    const notificationService = {} as jest.Mocked<NotificationService>;
    pantryService = new PantryService(cacheService, queueService, notificationService);

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
    // Reset persistent + cache state before each test for full isolation. Both the shopping
    // and pantry collections + their cache namespaces are cleared because generate() now reads
    // a REAL seeded pantry through PantryService/PantryModel.
    await ShoppingModel.deleteMany({});
    await PantryModel.deleteMany({});
    await cacheService.clear('shopping:*');
    await cacheService.clear('pantry:*');
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

      // The write-back proves the default-TTL cache path: getLists populated the per-user,
      // per-page cache key shopping:<userId>:<page>:<limit> (default window page 1 / limit 50)
      // using set(key, value) with NO explicit TTL, so the CacheService 3600s default applies.
      // We assert the cache is populated, never an exact TTL value.
      const cached = await cacheService.get<IShoppingList[]>(`shopping:${testUserId}:1:50`);
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
    // Canonical, opaque ingredient ids. Pantry exclusion and duplicate merging key on THESE ids,
    // NEVER the display name — the seeded pantry below proves id-based (not name-based) matching.
    const ING_FLOUR = 'ing_flour_int_01';
    const ING_MILK = 'ing_milk_int_02';

    // Trusted ingredient master records resolved by IngredientModel.find -> item name + category.
    const ingredientMasters = [
      { id: ING_FLOUR, name: 'Flour', category: 'Baking' },
      { id: ING_MILK, name: 'Milk', category: 'Dairy' },
    ];

    // Two recipes resolved by RecipeModel.find. Both reference Milk in the SAME unit so, with
    // mergeDuplicates, their serving-scaled Milk lines collapse into one. Flour is unique to r1.
    const recipeOne = {
      id: 'recipe_int_r1',
      name: 'Pancakes',
      servings: 2,
      ingredients: [
        { ingredientId: ING_FLOUR, quantity: 2, unit: 'cup', notes: '' },
        { ingredientId: ING_MILK, quantity: 1, unit: 'cup', notes: '' },
      ],
    };
    const recipeTwo = {
      id: 'recipe_int_r2',
      name: 'Smoothie',
      servings: 2,
      ingredients: [{ ingredientId: ING_MILK, quantity: 1, unit: 'cup', notes: '' }],
    };

    it('aggregates recipe ingredients, propagates recipe metadata, and excludes pantry inventory by ingredient id', async () => {
      // Resolve the recipe + ingredient master fixtures through the (factory-mocked) models.
      (RecipeModel.find as jest.Mock).mockResolvedValue([recipeOne, recipeTwo]);
      (IngredientModel.find as jest.Mock).mockResolvedValue(ingredientMasters);

      // Seed a REAL pantry document (in-memory MongoDB) holding ample Milk on hand, keyed by the
      // canonical INGREDIENT ID (ING_MILK) — NOT a display name. getPantry() reads this through
      // the genuine PantryService -> PantryModel path, so exclusion runs against real inventory.
      await PantryModel.create({
        userId: testUserId,
        name: 'Test Pantry',
        items: [
          {
            ingredientId: ING_MILK,
            quantity: 100,
            unit: 'cup',
            location: StorageLocation.PANTRY,
            purchaseDate: new Date(),
            expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            notes: '',
          } as PantryItem,
        ],
        locations: Object.values(StorageLocation),
      });

      // Spy on the REAL getPantry to assert it is consulted (jest.spyOn calls through by default,
      // so the seeded pantry is actually read from MongoDB).
      const getPantrySpy = jest.spyOn(pantryService, 'getPantry');

      const options: IShoppingListGenerationOptions = {
        recipeIds: [recipeOne.id, recipeTwo.id],
        servings: 2, // equal to each recipe's base servings -> scale 1
        excludeInventoryItems: true,
        mergeDuplicates: true,
      };
      const generated = await shoppingService.generate(testUserId, options);

      // A valid, user-scoped, persisted list echoing the options.
      expect(generated).toBeDefined();
      expect(generated.userId).toBe(testUserId);
      expect(Array.isArray(generated.items)).toBe(true);
      expect(generated.generationOptions?.excludeInventoryItems).toBe(true);
      expect(generated.generationOptions?.mergeDuplicates).toBe(true);

      // The REAL pantry service (and thus the seeded PantryModel) was consulted for exclusion.
      expect(getPantrySpy).toHaveBeenCalledWith(testUserId);

      // Items are sourced from the trusted ingredient MASTER names — never 'Recipe <id>' and never
      // a client-supplied recipe/ingredient id (recipe-driven generation; CWE-20/79 closed).
      for (const item of generated.items) {
        expect(item.name.startsWith('Recipe ')).toBe(false);
        expect(item.name).not.toBe(recipeOne.id);
        expect(item.name).not.toBe(recipeTwo.id);
      }

      // EXCLUSION by ingredient id: Milk is fully covered by the 100-cup on-hand pantry entry
      // (matched on ING_MILK), so it is dropped; Flour (not stocked) survives with its name.
      const names = generated.items.map((item) => item.name);
      expect(names).toContain('Flour');
      expect(names).not.toContain('Milk');

      // The surviving Flour line carries the originating recipe metadata (recipe-driven) and the
      // trusted master category — proving items come from recipe ingredients, not client echoes.
      const flour = generated.items.find((item) => item.name === 'Flour');
      expect(flour?.recipeId).toBe(recipeOne.id);
      expect(flour?.recipeName).toBe('Pancakes');
      expect(flour?.category).toBe('Baking');
    });

    it('keeps all recipe-derived items (serving-scaled) when no pantry inventory matches', async () => {
      // Single recipe; no pantry seeded -> getPantry rejects 404 -> generate() treats it as "no
      // inventory to exclude" and keeps every recipe-derived item.
      (RecipeModel.find as jest.Mock).mockResolvedValue([recipeOne]);
      (IngredientModel.find as jest.Mock).mockResolvedValue(ingredientMasters);

      // Use a DISTINCT user id so the prior test's cached pantry cannot leak in. CacheService.clear
      // (used by beforeEach) cannot purge keys written under the client's NODE_ENV keyPrefix, so a
      // shared user id would let the earlier seeded pantry survive in cache and wrongly exclude
      // Milk here. A unique user guarantees getPantry hits a genuine 404 (no pantry) for this spec.
      const noPantryUserId = 'shopping-gen-no-pantry-user';

      const options: IShoppingListGenerationOptions = {
        recipeIds: [recipeOne.id],
        servings: 4, // scale 2 over recipeOne's base servings of 2
        excludeInventoryItems: true,
        mergeDuplicates: false,
      };
      const generated = await shoppingService.generate(noPantryUserId, options);

      // Both recipe ingredients survive (nothing on hand), with serving-scaled quantities.
      const flour = generated.items.find((item) => item.name === 'Flour');
      const milk = generated.items.find((item) => item.name === 'Milk');
      expect(flour).toBeDefined();
      expect(milk).toBeDefined();
      expect(flour?.quantity).toBe(4); // 2 * (4 / 2)
      expect(milk?.quantity).toBe(2); // 1 * (4 / 2)
      expect(flour?.recipeName).toBe('Pancakes');
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

    it('rejects a cross-user update with 404 and leaves the list intact', async () => {
      const created = await shoppingService.create(testUserId, { name: 'Groceries', items: [] });

      // User B updating user A's list: the { _id, userId } filter yields not-found (404).
      await expect(
        shoppingService.update(secondUserId, created.id, { name: 'Hacked' })
      ).rejects.toMatchObject({ statusCode: 404, code: 'SHOPPING_LIST_NOT_FOUND' });

      // The list is unchanged for its real owner.
      const stillOwned = await shoppingService.getList(testUserId, created.id);
      expect(stillOwned.name).toBe('Groceries');
    });

    it('rejects a cross-user delete with 404 and leaves the list intact', async () => {
      const created = await shoppingService.create(testUserId, { name: 'Groceries', items: [] });

      await expect(shoppingService.delete(secondUserId, created.id)).rejects.toMatchObject({
        statusCode: 404,
        code: 'SHOPPING_LIST_NOT_FOUND',
      });

      // The owner can still read it (it was not deleted).
      const stillOwned = await shoppingService.getList(testUserId, created.id);
      expect(stillOwned.id).toBe(created.id);
    });

    it('rejects a cross-user toggleItem with 404 and leaves the item unchanged', async () => {
      const created = await shoppingService.create(testUserId, {
        name: 'Groceries',
        items: [
          { name: 'Milk', quantity: 1, unit: 'L', checked: false },
        ] as unknown as IShoppingListItem[],
      });
      const itemId = created.items[0].id;

      await expect(
        shoppingService.toggleItem(secondUserId, created.id, itemId)
      ).rejects.toMatchObject({ statusCode: 404, code: 'SHOPPING_LIST_NOT_FOUND' });

      // The item remains unchecked for the real owner.
      const ownerList = await shoppingService.getList(testUserId, created.id);
      const item = ownerList.items.find((candidate) => candidate.id === itemId);
      expect(item?.checked).toBe(false);
    });

    it('create: a client-supplied body userId cannot reassign ownership', async () => {
      // The body attempts to plant the list under a different user; the service must apply the
      // authenticated userId LAST and ignore the body value.
      const malicious: Record<string, unknown> = {
        name: 'Groceries',
        items: [],
        userId: secondUserId,
      };
      const created = await shoppingService.create(
        testUserId,
        malicious as Partial<IShoppingList>
      );

      // Persisted owner is the AUTHENTICATED user, never the body's userId.
      expect(created.userId).toBe(testUserId);

      // The impersonated user can neither read it nor see it in their collection.
      await expect(shoppingService.getList(secondUserId, created.id)).rejects.toMatchObject({
        statusCode: 404,
      });
      const victimLists = await shoppingService.getLists(secondUserId);
      expect(victimLists).toHaveLength(0);
    });

    it('update: a client-supplied body userId cannot transfer ownership', async () => {
      const created = await shoppingService.create(testUserId, { name: 'Groceries', items: [] });

      // The body attempts to hand the list to another user while renaming it.
      const malicious: Record<string, unknown> = {
        name: 'Renamed',
        userId: secondUserId,
      };
      const updated = await shoppingService.update(
        testUserId,
        created.id,
        malicious as Partial<IShoppingList>
      );

      // Ownership is unchanged; only the allow-listed `name` was applied.
      expect(updated.userId).toBe(testUserId);
      expect(updated.name).toBe('Renamed');

      // The impersonated user still cannot see the list.
      const victimLists = await shoppingService.getLists(secondUserId);
      expect(victimLists).toHaveLength(0);
    });
  });
});
