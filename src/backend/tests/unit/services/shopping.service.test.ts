// @version jest ^29.0.0
// @version mongoose ^6.0.0

/**
 * HUMAN TASKS:
 * 1. Ensure a test Redis instance is available if these unit tests are later promoted to
 *    integration (currently CacheService is fully mocked, so no live Redis is required here).
 * 2. Confirm the iOS `isPurchased` <-> backend `checked` field mapping is exercised at the iOS
 *    layer (out of scope for this unit suite, which asserts the canonical `checked` boolean).
 * 3. Verify pantry category alignment so the generate() inventory-exclusion matching stays
 *    accurate for the deployment's ingredient taxonomy.
 */

import { ShoppingService } from '../../../src/services/shopping.service';
import { CacheService } from '../../../src/services/cache.service';
import { PantryService } from '../../../src/services/pantry.service';
import { ShoppingModel } from '../../../src/models/shopping.model';
import { RecipeModel } from '../../../src/models/recipe.model';
import { IngredientModel } from '../../../src/models/ingredient.model';
import {
    IShoppingList,
    IShoppingListItem,
    IShoppingListGenerationOptions
} from '../../../src/interfaces/shopping.interface';
import { Pantry, PantryItem, StorageLocation } from '../../../src/interfaces/pantry.interface';
import { AppError } from '../../../src/utils/errors';

// Mock dependencies — ALL collaborators are mocked: no real Redis, Mongo, network, or queue.
// `logger` is mocked because the AppError constructor calls logger.error internally; mocking it
// keeps the test output free of error-level noise during the not-found assertions.
jest.mock('../../../src/services/cache.service');
jest.mock('../../../src/models/shopping.model');
jest.mock('../../../src/utils/logger');

// PantryService is mocked via an explicit factory (rather than the default auto-mock) so the real
// implementation file is never loaded or transformed at runtime. The System Under Test imports
// PantryService and, because the backend compiles with `emitDecoratorMetadata`, the constructor
// parameter type is emitted as a runtime value reference — which would otherwise pull the real
// pantry.service.ts (and transitively pantry.model.ts) into the ts-jest transform. Those committed
// files carry pre-existing type errors (custom Mongoose statics not declared on the Model type)
// that are out of scope for this task. The factory keeps PantryService fully mocked while avoiding
// them; the SUT still receives a hand-built jest.Mocked<PantryService> through constructor
// injection in beforeEach, so behavior under test is unaffected.
jest.mock('../../../src/services/pantry.service', () => ({
    PantryService: jest.fn()
}));

// RecipeModel and IngredientModel are mocked with EXPLICIT factories (NOT auto-mock) for the
// same reason as PantryService above: their committed source files carry pre-existing,
// out-of-scope type errors (custom Mongoose statics not declared on the Model type). An
// auto-mock would force jest to load + ts-jest-transform those real files at runtime to derive
// their shape, surfacing the unrelated errors and failing this suite. The factories expose only
// the single static the System Under Test consumes — find() — as a jest.fn(), so generate()
// performs a fully-mocked, no-real-DB recipe/ingredient lookup while the dirty model files stay
// unloaded. The recipe-driven generation specs below drive these finds.
jest.mock('../../../src/models/recipe.model', () => ({
    RecipeModel: { find: jest.fn() }
}));
jest.mock('../../../src/models/ingredient.model', () => ({
    IngredientModel: { find: jest.fn() }
}));

describe('ShoppingService', () => {
    let cacheService: jest.Mocked<CacheService>;
    let pantryService: jest.Mocked<PantryService>;
    let shoppingService: ShoppingService;

    // Test data
    const mockUserId = 'user123';
    const mockListId = 'list123';
    const mockItemId = 'item123';

    // A single canonical item — note the field is `checked` (NOT the iOS `isPurchased`).
    const mockItem: IShoppingListItem = {
        id: mockItemId,
        name: 'Milk',
        quantity: 1,
        unit: 'L',
        category: 'Dairy',
        checked: false,
        notes: '',
        recipeId: '',
        recipeName: ''
    };

    const mockList: IShoppingList = {
        id: mockListId,
        userId: mockUserId,
        name: 'My Shopping List',
        items: [mockItem],
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const mockLists: IShoppingList[] = [mockList];

    // -----------------------------------------------------------------------
    // Recipe-driven generation fixtures (Feature 1 generate()).
    // generate() is RECIPE-SOURCED: it loads the referenced recipes, resolves each recipe
    // ingredient line against the TRUSTED IngredientModel master collection to obtain the real
    // ingredient name + category, scales quantities by (targetServings / recipe.servings), and
    // (optionally) merges duplicates and subtracts pantry inventory. Client-supplied recipe ids
    // are NEVER echoed into item names.
    // -----------------------------------------------------------------------

    // Canonical, opaque ingredient ids. Pantry matching and duplicate merging key on THESE ids
    // (never the display name), which the exclusion + merge specs deliberately rely on.
    const ING_MILK = 'ing_milk_0001';
    const ING_FLOUR = 'ing_flour_0002';
    const ING_EGGS = 'ing_eggs_0003';

    // Trusted ingredient master records: id -> { name, category }. These are the ONLY source of
    // a generated item's persisted name/category (IngredientModel.find resolves to this set).
    const ingredientMasters = [
        { id: ING_MILK, name: 'Milk', category: 'Dairy' },
        { id: ING_FLOUR, name: 'Flour', category: 'Baking' },
        { id: ING_EGGS, name: 'Eggs', category: 'Dairy' }
    ];

    // Primary recipe (base servings 4). Ingredient lines reference ingredients by id only.
    const mockRecipeId = 'recipe_pancakes_01';
    const pancakesRecipe = {
        id: mockRecipeId,
        name: 'Pancakes',
        servings: 4,
        ingredients: [
            { ingredientId: ING_MILK, quantity: 2, unit: 'cup', notes: '' },
            { ingredientId: ING_FLOUR, quantity: 3, unit: 'cup', notes: '' },
            { ingredientId: ING_EGGS, quantity: 2, unit: 'unit', notes: '' }
        ]
    };

    // Secondary recipe (base servings 2) that ALSO uses Milk in the SAME unit ('cup'), so at a
    // target of 4 servings (scale 2 -> 2 cup) it merges with Pancakes' 2 cup -> 4 cup.
    const smoothieRecipe = {
        id: 'recipe_smoothie_02',
        name: 'Smoothie',
        servings: 2,
        ingredients: [{ ingredientId: ING_MILK, quantity: 1, unit: 'cup', notes: '' }]
    };

    // Recipe referencing an ingredient with NO master record, to prove unresolved ingredient
    // lines are SKIPPED (and logged) rather than echoed into item names (CWE-20/CWE-79).
    const mysteryRecipe = {
        id: 'recipe_mystery_03',
        name: 'Mystery',
        servings: 1,
        ingredients: [
            { ingredientId: 'ing_unknown_999', quantity: 1, unit: 'unit', notes: '' },
            { ingredientId: ING_EGGS, quantity: 1, unit: 'unit', notes: '' }
        ]
    };

    // Exclusion-OFF, single-recipe options (servings 8 over base 4 -> scale 2) used by the
    // aggregation/scaling spec.
    const mockOptions: IShoppingListGenerationOptions = {
        recipeIds: [mockRecipeId],
        servings: 8,
        excludeInventoryItems: false,
        mergeDuplicates: false
    };

    // A pantry whose on-hand item is keyed by the canonical INGREDIENT ID (ING_MILK), NOT the
    // display name — so exclusion correctness depends on id matching. Holds 2 cup of Milk,
    // exactly covering the (scale-1) Pancakes Milk line so it is dropped from the generated list.
    const mockPantryItem: PantryItem = {
        ingredientId: ING_MILK,
        quantity: 2,
        unit: 'cup',
        location: StorageLocation.PANTRY,
        purchaseDate: new Date(),
        expirationDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        notes: ''
    };

    const mockPantry: Pantry = {
        id: 'pantry123',
        userId: mockUserId,
        name: 'My Pantry',
        items: [mockPantryItem],
        locations: Object.values(StorageLocation),
        createdAt: new Date(),
        updatedAt: new Date()
    };

    beforeEach(() => {
        // Clear all mocks between tests for isolation.
        jest.clearAllMocks();

        // Initialize the mocked CacheService. Only the methods exercised by the SUT are stubbed;
        // the `as unknown as jest.Mocked<CacheService>` cast intentionally bypasses the full
        // structural surface (getRecipe/setRecipe are unused here).
        cacheService = {
            set: jest.fn(),
            get: jest.fn(),
            delete: jest.fn(),
            clear: jest.fn()
        } as unknown as jest.Mocked<CacheService>;

        // Initialize the mocked PantryService — only getPantry() is consumed by generate().
        pantryService = {
            getPantry: jest.fn()
        } as unknown as jest.Mocked<PantryService>;

        // ShoppingService takes EXACTLY TWO constructor args (NOT three like PantryService,
        // which additionally injects queue + notification services).
        shoppingService = new ShoppingService(cacheService, pantryService);
    });

    describe('getLists', () => {
        // Test: Cache hit scenario — cached collection returned without touching the database.
        it('should return lists from cache when available', async () => {
            // Arrange
            (cacheService.get as jest.Mock).mockResolvedValue(mockLists);

            // Act
            const result = await shoppingService.getLists(mockUserId);

            // Assert — default pagination window (page 1, limit 50) is embedded in the cache key.
            expect(result).toEqual(mockLists);
            expect(cacheService.get).toHaveBeenCalledWith(`shopping:${mockUserId}:1:50`);
            expect(ShoppingModel.find).not.toHaveBeenCalled();
        });

        // Test: Cache miss scenario — load from DB, then populate the cache with NO explicit TTL.
        it('should fetch from database and cache the result on cache miss', async () => {
            // Arrange
            (cacheService.get as jest.Mock).mockResolvedValue(null);
            (ShoppingModel.find as jest.Mock).mockResolvedValue(mockLists);
            cacheService.set.mockResolvedValue(undefined);

            // Act
            const result = await shoppingService.getLists(mockUserId);

            // Assert — user-scoped, bounded, most-recently-updated-first query and the cached value.
            // The cold-cache read is paginated (R10 performance budget): the find carries the
            // sort/skip/limit options and the default page-1/limit-50 window, and the cache key
            // embeds that window.
            expect(result).toEqual(mockLists);
            expect(ShoppingModel.find).toHaveBeenCalledWith(
                { userId: mockUserId },
                null,
                { sort: { updatedAt: -1 }, skip: 0, limit: 50 }
            );
            expect(cacheService.set).toHaveBeenCalledWith(`shopping:${mockUserId}:1:50`, mockLists);

            // ★ DIVERGENCE FROM pantry.test.ts: the cache write passes NO third TTL argument —
            // the service relies on the CacheService default one-hour TTL. Assert the call carried
            // EXACTLY two arguments (key, value); pantry.test.ts instead asserts an explicit TTL.
            expect(cacheService.set).toHaveBeenCalledWith(expect.any(String), expect.anything());
            expect((cacheService.set as jest.Mock).mock.calls[0].length).toBe(2);
        });
    });

    describe('getList', () => {
        // Test: Successful ownership-scoped single-list retrieval.
        it('should return a single list scoped to the user', async () => {
            // Arrange
            (ShoppingModel.findOne as jest.Mock).mockResolvedValue(mockList);

            // Act
            const result = await shoppingService.getList(mockUserId, mockListId);

            // Assert — the filter enforces both lookup and ownership isolation.
            expect(result).toEqual(mockList);
            expect(ShoppingModel.findOne).toHaveBeenCalledWith({
                _id: mockListId,
                userId: mockUserId
            });
        });

        // Test: Not found — a missing or non-owned list yields a 404 AppError.
        it('should throw AppError 404 when the list is not found', async () => {
            // Arrange
            (ShoppingModel.findOne as jest.Mock).mockResolvedValue(null);

            // Act & Assert
            await expect(shoppingService.getList(mockUserId, mockListId)).rejects.toThrow(AppError);
            await expect(shoppingService.getList(mockUserId, mockListId)).rejects.toMatchObject({
                statusCode: 404,
                code: 'SHOPPING_LIST_NOT_FOUND'
            });
        });
    });

    describe('create', () => {
        // Test: Successful user-scoped list creation with cache invalidation.
        it('should create a list scoped to the user and invalidate the cache', async () => {
            // Arrange
            const createData: Partial<IShoppingList> = { name: 'Groceries', items: [mockItem] };
            (ShoppingModel.create as jest.Mock).mockResolvedValue(mockList);
            cacheService.clear.mockResolvedValue(undefined);

            // Act
            const result = await shoppingService.create(mockUserId, createData);

            // Assert — the new document is always scoped to the authenticated user.
            expect(result).toEqual(mockList);
            expect(ShoppingModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ userId: mockUserId, name: 'Groceries' })
            );
            // Mutation invalidates EVERY cached pagination window for the user via the glob clear.
            expect(cacheService.clear).toHaveBeenCalledWith(`shopping:${mockUserId}:*`);
        });
    });

    describe('update', () => {
        // Test: Successful ownership-scoped update returning the new doc, with cache invalidation.
        it('should update an owned list and invalidate the cache', async () => {
            // Arrange
            const updateData: Partial<IShoppingList> = { name: 'Updated Shopping List' };
            (ShoppingModel.findOneAndUpdate as jest.Mock).mockResolvedValue(mockList);
            cacheService.clear.mockResolvedValue(undefined);

            // Act
            const result = await shoppingService.update(mockUserId, mockListId, updateData);

            // Assert — the filter enforces ownership; the payload is applied as an allow-listed
            // `$set` (so server-managed fields/operators cannot be smuggled in) and `runValidators`
            // enforces schema constraints on update; `{ new: true }` returns the updated doc.
            expect(result).toEqual(mockList);
            expect(ShoppingModel.findOneAndUpdate).toHaveBeenCalledWith(
                { _id: mockListId, userId: mockUserId },
                { $set: { name: 'Updated Shopping List' } },
                { new: true, runValidators: true }
            );
            // Mutation invalidates EVERY cached pagination window for the user via the glob clear.
            expect(cacheService.clear).toHaveBeenCalledWith(`shopping:${mockUserId}:*`);
        });

        // Test: Not found — updating a missing or non-owned list yields a 404 AppError.
        it('should throw AppError 404 when the list to update is not found', async () => {
            // Arrange
            (ShoppingModel.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

            // Act & Assert
            await expect(
                shoppingService.update(mockUserId, mockListId, { name: 'x' })
            ).rejects.toThrow(AppError);
            await expect(
                shoppingService.update(mockUserId, mockListId, { name: 'x' })
            ).rejects.toMatchObject({ statusCode: 404, code: 'SHOPPING_LIST_NOT_FOUND' });
        });
    });

    describe('delete', () => {
        // Test: Successful ownership-scoped deletion with cache invalidation.
        it('should delete an owned list and invalidate the cache', async () => {
            // Arrange
            (ShoppingModel.findOneAndDelete as jest.Mock).mockResolvedValue(mockList);
            cacheService.clear.mockResolvedValue(undefined);

            // Act & Assert — delete resolves to void on success.
            await expect(shoppingService.delete(mockUserId, mockListId)).resolves.toBeUndefined();
            expect(ShoppingModel.findOneAndDelete).toHaveBeenCalledWith({
                _id: mockListId,
                userId: mockUserId
            });
            // Mutation invalidates EVERY cached pagination window for the user via the glob clear.
            expect(cacheService.clear).toHaveBeenCalledWith(`shopping:${mockUserId}:*`);
        });

        // Test: Not found — deleting a missing or non-owned list yields a 404 AppError.
        it('should throw AppError 404 when the list to delete is not found', async () => {
            // Arrange
            (ShoppingModel.findOneAndDelete as jest.Mock).mockResolvedValue(null);

            // Act & Assert
            await expect(shoppingService.delete(mockUserId, mockListId)).rejects.toThrow(AppError);
            await expect(shoppingService.delete(mockUserId, mockListId)).rejects.toMatchObject({
                statusCode: 404,
                code: 'SHOPPING_LIST_NOT_FOUND'
            });
        });
    });

    describe('generate', () => {
        // Arrange helper: wire the recipe + ingredient model finds and the create/cache mocks.
        // Callers pass the recipe docs RecipeModel.find should resolve; the ingredient master set
        // is constant across specs. (RecipeModel/IngredientModel are the explicit-factory mocks.)
        const arrangeRecipes = (recipes: unknown[]): void => {
            (RecipeModel.find as jest.Mock).mockResolvedValue(recipes);
            (IngredientModel.find as jest.Mock).mockResolvedValue(ingredientMasters);
            (ShoppingModel.create as jest.Mock).mockResolvedValue(mockList);
            cacheService.clear.mockResolvedValue(undefined);
        };

        // Test: recipe-derived aggregation — items come from RESOLVED recipe ingredients (trusted
        // name/category), quantities are serving-scaled, and recipeId/recipeName are propagated.
        // The pantry is NOT consulted (exclusion off).
        it('derives items from recipe ingredients, scales by servings, and propagates recipe metadata', async () => {
            // Arrange — Pancakes (base servings 4) generated for 8 servings -> scale 2.
            arrangeRecipes([pancakesRecipe]);

            // Act
            const result = await shoppingService.generate(mockUserId, mockOptions);

            // Assert — the recipes AND their ingredient masters were both queried (recipe-sourced).
            expect(RecipeModel.find).toHaveBeenCalledWith({ _id: { $in: [mockRecipeId] } });
            expect(IngredientModel.find).toHaveBeenCalledWith({
                _id: { $in: expect.arrayContaining([ING_MILK, ING_FLOUR, ING_EGGS]) }
            });
            // Exclusion is OFF -> the pantry is never read.
            expect(pantryService.getPantry).not.toHaveBeenCalled();

            const createArg = (ShoppingModel.create as jest.Mock).mock.calls[0][0];
            expect(createArg.userId).toBe(mockUserId);
            expect(createArg.generationOptions).toEqual(mockOptions);

            // THREE items, one per resolved recipe ingredient line.
            const items = createArg.items as IShoppingListItem[];
            expect(items).toHaveLength(3);

            // Names/categories come from the trusted ingredient MASTER (never 'Recipe <id>'), and
            // NO item name contains a client-supplied recipe/ingredient id (CWE-20/79).
            const names = items.map((it) => it.name).sort();
            expect(names).toEqual(['Eggs', 'Flour', 'Milk']);
            for (const it of items) {
                expect(it.name.startsWith('Recipe ')).toBe(false);
                expect(it.name.includes(mockRecipeId)).toBe(false);
            }

            // Serving scaling: each quantity is the recipe line quantity * (8 / 4) = *2.
            const milk = items.find((it) => it.name === 'Milk');
            const flour = items.find((it) => it.name === 'Flour');
            const eggs = items.find((it) => it.name === 'Eggs');
            expect(milk?.quantity).toBe(4); // 2 * 2
            expect(flour?.quantity).toBe(6); // 3 * 2
            expect(eggs?.quantity).toBe(4); // 2 * 2

            // Category from the master record; unit preserved from the recipe line.
            expect(milk?.category).toBe('Dairy');
            expect(flour?.category).toBe('Baking');
            expect(milk?.unit).toBe('cup');

            // recipeId/recipeName propagated from the source recipe on every item.
            for (const it of items) {
                expect(it.recipeId).toBe(mockRecipeId);
                expect(it.recipeName).toBe('Pancakes');
            }

            // The per-user cache is invalidated (all pagination windows) and the list is returned.
            expect(cacheService.clear).toHaveBeenCalledWith(`shopping:${mockUserId}:*`);
            expect(result).toEqual(mockList);
        });

        // Test: duplicate ingredients (same ingredient id + unit) across recipes merge into a
        // single line whose quantity is the sum of the serving-scaled contributions.
        it('merges duplicate ingredients (same id + unit) across recipes when mergeDuplicates is set', async () => {
            // Arrange — Pancakes (servings 4) + Smoothie (servings 2), target 4 servings:
            //   Pancakes Milk: 2 cup * (4/4 = 1) -> 2 cup
            //   Smoothie Milk: 1 cup * (4/2 = 2) -> 2 cup   => merged Milk = 4 cup
            arrangeRecipes([pancakesRecipe, smoothieRecipe]);
            const mergeOptions: IShoppingListGenerationOptions = {
                recipeIds: [mockRecipeId, smoothieRecipe.id],
                servings: 4,
                excludeInventoryItems: false,
                mergeDuplicates: true
            };

            // Act
            await shoppingService.generate(mockUserId, mergeOptions);

            // Assert — Milk collapsed to ONE line (Flour + Eggs from Pancakes remain) -> 3 items.
            const createArg = (ShoppingModel.create as jest.Mock).mock.calls[0][0];
            const items = createArg.items as IShoppingListItem[];
            expect(items).toHaveLength(3);

            const milk = items.filter((it) => it.name === 'Milk');
            expect(milk).toHaveLength(1);
            expect(milk[0].quantity).toBe(4); // 2 + 2 summed across the two recipes
            // First-occurrence recipe association is preserved on the merged line.
            expect(milk[0].recipeName).toBe('Pancakes');
        });

        // Test: inventory exclusion subtracts on-hand pantry quantity matched by INGREDIENT ID
        // (not name); getPantry is consulted only because excludeInventoryItems is true.
        it('subtracts pantry inventory matched by ingredient id when excludeInventoryItems is set', async () => {
            // Arrange — Pancakes for 4 servings (scale 1): Milk 2 cup, Flour 3 cup, Eggs 2 unit.
            // Pantry holds 2 cup of Milk keyed by ING_MILK -> Milk fully covered -> dropped.
            arrangeRecipes([pancakesRecipe]);
            (pantryService.getPantry as jest.Mock).mockResolvedValue(mockPantry);
            const exclusionOptions: IShoppingListGenerationOptions = {
                recipeIds: [mockRecipeId],
                servings: 4,
                excludeInventoryItems: true,
                mergeDuplicates: false
            };

            // Act
            const result = await shoppingService.generate(mockUserId, exclusionOptions);

            // Assert — exclusion path read the pantry exactly once for this user.
            expect(pantryService.getPantry).toHaveBeenCalledWith(mockUserId);

            const createArg = (ShoppingModel.create as jest.Mock).mock.calls[0][0];
            const items = createArg.items as IShoppingListItem[];
            // Milk (2 cup) is fully covered by 2 cup on hand -> dropped; Flour + Eggs remain.
            const names = items.map((it) => it.name).sort();
            expect(names).toEqual(['Eggs', 'Flour']);
            expect(names).not.toContain('Milk');

            expect(cacheService.clear).toHaveBeenCalledWith(`shopping:${mockUserId}:*`);
            expect(result).toEqual(mockList);
        });

        // Test (security, CWE-20/CWE-79): a recipe ingredient line with no resolvable master record
        // is SKIPPED — never echoed into a persisted item name.
        it('skips recipe ingredients with no resolvable master record (no client id echo)', async () => {
            // Arrange — Mystery recipe references an unknown ingredient id plus Eggs.
            arrangeRecipes([mysteryRecipe]);
            const opts: IShoppingListGenerationOptions = {
                recipeIds: [mysteryRecipe.id],
                servings: 1,
                excludeInventoryItems: false,
                mergeDuplicates: false
            };

            // Act
            await shoppingService.generate(mockUserId, opts);

            // Assert — only the RESOLVABLE Eggs line survives; the unknown id never appears as a name.
            const createArg = (ShoppingModel.create as jest.Mock).mock.calls[0][0];
            const items = createArg.items as IShoppingListItem[];
            expect(items).toHaveLength(1);
            expect(items[0].name).toBe('Eggs');
            for (const it of items) {
                expect(it.name.includes('ing_unknown_999')).toBe(false);
            }
        });

        // Test: with no recipe ids the generator creates an empty (zero-item) list and never queries
        // recipes — confirming generation only includes recipe-sourced items.
        it('creates an empty list when no recipe ids are provided', async () => {
            // Arrange — empty recipe id set; nothing to query/aggregate.
            (ShoppingModel.create as jest.Mock).mockResolvedValue(mockList);
            cacheService.clear.mockResolvedValue(undefined);
            const emptyOpts: IShoppingListGenerationOptions = {
                recipeIds: [],
                servings: 2,
                excludeInventoryItems: false,
                mergeDuplicates: false
            };

            // Act
            const result = await shoppingService.generate(mockUserId, emptyOpts);

            // Assert — no recipe query was issued and zero items were persisted.
            expect(RecipeModel.find).not.toHaveBeenCalled();
            const createArg = (ShoppingModel.create as jest.Mock).mock.calls[0][0];
            expect(createArg.items).toHaveLength(0);
            expect(result).toEqual(mockList);
        });
    });

    describe('toggleItem', () => {
        // Test: Successful toggle — the canonical `checked` boolean flips and the doc is saved.
        it('should flip the item checked state, persist, and invalidate the cache', async () => {
            // Arrange — a document-like object whose item id matches and which exposes save().
            const listDoc = {
                _id: mockListId,
                userId: mockUserId,
                items: [
                    {
                        id: mockItemId,
                        name: 'Milk',
                        quantity: 1,
                        unit: 'L',
                        category: 'Dairy',
                        checked: false,
                        notes: '',
                        recipeId: '',
                        recipeName: ''
                    }
                ],
                save: jest.fn().mockResolvedValue(true)
            };
            (ShoppingModel.findOne as jest.Mock).mockResolvedValue(listDoc);
            cacheService.clear.mockResolvedValue(undefined);

            // Act
            const result = await shoppingService.toggleItem(mockUserId, mockListId, mockItemId);

            // Assert — user-scoped lookup, in-place flip (false -> true), persistence, invalidation.
            expect(ShoppingModel.findOne).toHaveBeenCalledWith({
                _id: mockListId,
                userId: mockUserId
            });
            expect(listDoc.items[0].checked).toBe(true);
            expect(listDoc.save).toHaveBeenCalled();
            expect(cacheService.clear).toHaveBeenCalledWith(`shopping:${mockUserId}:*`);
            expect(result).toBeDefined();
        });

        // Test: List not found — a missing or non-owned list yields a 404 AppError.
        it('should throw AppError 404 when the list is not found', async () => {
            // Arrange
            (ShoppingModel.findOne as jest.Mock).mockResolvedValue(null);

            // Act & Assert
            await expect(
                shoppingService.toggleItem(mockUserId, mockListId, mockItemId)
            ).rejects.toThrow(AppError);
            await expect(
                shoppingService.toggleItem(mockUserId, mockListId, mockItemId)
            ).rejects.toMatchObject({ statusCode: 404, code: 'SHOPPING_LIST_NOT_FOUND' });
        });

        // Test: Item not found — a valid list but unknown item id yields a distinct 404 AppError.
        it('should throw AppError 404 when the item is not found in the list', async () => {
            // Arrange — the list exists but contains no item with the requested id.
            const listDocNoItem = {
                _id: mockListId,
                userId: mockUserId,
                items: [] as IShoppingListItem[],
                save: jest.fn().mockResolvedValue(true)
            };
            (ShoppingModel.findOne as jest.Mock).mockResolvedValue(listDocNoItem);

            // Act & Assert — note the DISTINCT item-level error code.
            await expect(
                shoppingService.toggleItem(mockUserId, mockListId, 'missing-item')
            ).rejects.toMatchObject({ statusCode: 404, code: 'SHOPPING_LIST_ITEM_NOT_FOUND' });
            expect(listDocNoItem.save).not.toHaveBeenCalled();
        });
    });

    // Security / ownership-isolation. The service must never let a client-supplied body reassign
    // ownership or smuggle server-managed fields / Mongo operators into persistence. These tests
    // exercise the `sanitizeListData` allow-list (name + items only), the "userId applied LAST"
    // create rule, and the allow-listed `$set` on update — directly covering the create/update
    // ownership-drift findings (R3 user scoping) that the prior suite did not catch.
    describe('security / input sanitization', () => {
        // A hostile payload fragment carrying ownership, identity, audit, and operator fields.
        // Typed as Record<string, unknown> so server-managed / operator keys (not part of
        // IShoppingList) can be expressed, then cast to Partial<IShoppingList> at the call site.
        const maliciousFields: Record<string, unknown> = {
            userId: 'attacker-user',
            _id: 'attacker-id',
            id: 'attacker-id',
            createdAt: new Date('2000-01-01T00:00:00.000Z'),
            updatedAt: new Date('2000-01-01T00:00:00.000Z'),
            $set: { userId: 'attacker' },
            $inc: { hacked: 1 }
        };

        it('create: strips server-managed fields/operators and forces the authenticated userId', async () => {
            // Arrange — list payload laced with ownership/identity/audit/operator fields.
            const malicious: Record<string, unknown> = {
                name: 'Groceries',
                items: [mockItem],
                ...maliciousFields
            };
            (ShoppingModel.create as jest.Mock).mockResolvedValue(mockList);
            cacheService.clear.mockResolvedValue(undefined);

            // Act
            await shoppingService.create(mockUserId, malicious as Partial<IShoppingList>);

            // Assert — only the allow-listed list fields plus the AUTH userId reach the model.
            const createArg = (ShoppingModel.create as jest.Mock).mock.calls[0][0];
            expect(createArg.userId).toBe(mockUserId); // auth user wins, NOT 'attacker-user'
            expect(createArg._id).toBeUndefined();
            expect(createArg.createdAt).toBeUndefined();
            expect(createArg.updatedAt).toBeUndefined();
            expect(createArg.$set).toBeUndefined();
            expect(createArg.$inc).toBeUndefined();
            // Exactly the allow-listed surface: name, items, userId — nothing else persisted.
            expect(Object.keys(createArg).sort()).toEqual(['items', 'name', 'userId']);
        });

        it('create/update: ignores a non-ObjectId client item id (Mongoose mints a fresh _id) but preserves a valid ObjectId as _id for item-identity stability (Finding 1.4-B)', async () => {
            // Arrange — one item carries a NON-ObjectId client id (must be ignored so Mongoose
            // assigns a fresh authoritative _id, so a client cannot forge a chosen identity for a
            // new item), and one carries a well-formed 24-hex ObjectId (must be preserved as _id so
            // a PUT full-replace keeps item identity stable — the core of Finding 1.4-B).
            const validObjectId = '507f1f77bcf86cd799439011';
            const payload: Record<string, unknown> = {
                name: 'Groceries',
                items: [
                    { ...mockItem, id: 'client-chosen-id' },
                    { ...mockItem, id: validObjectId }
                ]
            };
            (ShoppingModel.create as jest.Mock).mockResolvedValue(mockList);
            cacheService.clear.mockResolvedValue(undefined);

            // Act
            await shoppingService.create(mockUserId, payload as Partial<IShoppingList>);

            // Assert — inspect the document handed to the (mocked) model.create, i.e. the sanitized
            // write shape BEFORE Mongoose assigns subdocument ids.
            const createArg = (ShoppingModel.create as jest.Mock).mock.calls[0][0];

            // The non-ObjectId client id is neither forwarded as `_id` nor echoed as `id`, so the
            // server never honors a forged identity for a new item; Mongoose mints a fresh _id.
            expect(createArg.items[0]._id).toBeUndefined();
            expect(createArg.items[0].id).toBeUndefined();

            // The well-formed ObjectId is preserved verbatim as `_id`, so re-sending an item on a
            // PUT full-replace reuses the existing subdocument identity (no item-id churn).
            expect(createArg.items[1]._id).toBe(validObjectId);
        });

        it('update: reduces the payload to an allow-listed $set, dropping userId/_id/timestamps/operators', async () => {
            // Arrange
            const malicious: Record<string, unknown> = {
                name: 'Renamed',
                ...maliciousFields
            };
            (ShoppingModel.findOneAndUpdate as jest.Mock).mockResolvedValue(mockList);
            cacheService.clear.mockResolvedValue(undefined);

            // Act
            await shoppingService.update(
                mockUserId,
                mockListId,
                malicious as Partial<IShoppingList>
            );

            // Assert — ownership filter intact; $set carries ONLY allow-listed fields; validators on.
            const call = (ShoppingModel.findOneAndUpdate as jest.Mock).mock.calls[0];
            const filter = call[0];
            const updateDoc = call[1];
            const opts = call[2];
            expect(filter).toEqual({ _id: mockListId, userId: mockUserId });
            expect(updateDoc).toEqual({ $set: { name: 'Renamed' } });
            expect(updateDoc.$set.userId).toBeUndefined();
            expect(updateDoc.$inc).toBeUndefined();
            expect(opts).toEqual({ new: true, runValidators: true });
        });

        it('create: passes an invalid item quantity through verbatim so schema validators reject it', async () => {
            // Arrange — a negative quantity must NOT be silently coerced/clamped by the service.
            const malicious: Record<string, unknown> = {
                name: 'Bad',
                items: [{ ...mockItem, quantity: -5 }]
            };
            (ShoppingModel.create as jest.Mock).mockResolvedValue(mockList);
            cacheService.clear.mockResolvedValue(undefined);

            // Act
            await shoppingService.create(mockUserId, malicious as Partial<IShoppingList>);

            // Assert — the value is preserved as-is; the Mongoose `min: 0` validator is the gate.
            const createArg = (ShoppingModel.create as jest.Mock).mock.calls[0][0];
            expect(createArg.items[0].quantity).toBe(-5);
        });
    });
});
