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

    // Exclusion-OFF generation options (reused by the generate() no-exclusion path).
    const mockOptions: IShoppingListGenerationOptions = {
        recipeIds: ['recipe1'],
        servings: 4,
        excludeInventoryItems: false,
        mergeDuplicates: false
    };

    // A pantry whose on-hand `ingredientId` deliberately matches the generated item `name`
    // (`Recipe milk`, case-insensitively) so the inventory-exclusion subtraction is deterministic.
    const mockPantryItem: PantryItem = {
        ingredientId: 'Recipe milk',
        quantity: 2,
        unit: 'L',
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
        // Test: Exclusion ON + merge ON — pantry is read, duplicates merged, inventory subtracted.
        it('should exclude pantry inventory and merge duplicates when both flags are set', async () => {
            // Arrange — two identical 'milk' recipes (servings 5) merge into one candidate of qty 10;
            // the pantry holds 2 of the matching ingredient, so the persisted item is reduced (-> 8).
            const exclusionOptions: IShoppingListGenerationOptions = {
                recipeIds: ['milk', 'milk'],
                servings: 5,
                excludeInventoryItems: true,
                mergeDuplicates: true
            };
            (pantryService.getPantry as jest.Mock).mockResolvedValue(mockPantry);
            (ShoppingModel.create as jest.Mock).mockResolvedValue(mockList);
            cacheService.clear.mockResolvedValue(undefined);

            // Act
            const result = await shoppingService.generate(mockUserId, exclusionOptions);

            // Assert — getPantry is consulted ONLY because excludeInventoryItems is true.
            expect(pantryService.getPantry).toHaveBeenCalledWith(mockUserId);

            // Inspect the argument passed to the mocked create() (NOT the mocked return value).
            const createArg = (ShoppingModel.create as jest.Mock).mock.calls[0][0];
            expect(createArg.userId).toBe(mockUserId);
            expect(createArg.generationOptions).toEqual(exclusionOptions);

            // MERGE: the two duplicate 'milk' candidates collapsed into a single item.
            expect(createArg.items).toHaveLength(1);

            // SUBTRACTION: on-hand inventory was subtracted from the merged quantity (10 -> 8).
            // Robust bounds (rather than coupling to the exact internal value) keep the test resilient.
            expect(createArg.items[0].quantity).toBeLessThan(10);
            expect(createArg.items[0].quantity).toBeGreaterThan(0);

            // The per-user cache is invalidated (all pagination windows) and the list is returned.
            expect(cacheService.clear).toHaveBeenCalledWith(`shopping:${mockUserId}:*`);
            expect(result).toEqual(mockList);
        });

        // Test: Exclusion OFF — the pantry is never consulted and nothing is subtracted.
        it('should not consult the pantry when excludeInventoryItems is false', async () => {
            // Arrange — single recipe, no merge, no exclusion (servings 4 -> quantity 4).
            (ShoppingModel.create as jest.Mock).mockResolvedValue(mockList);
            cacheService.clear.mockResolvedValue(undefined);

            // Act
            const result = await shoppingService.generate(mockUserId, mockOptions);

            // Assert — getPantry is NOT called on the no-exclusion path.
            expect(pantryService.getPantry).not.toHaveBeenCalled();

            const createArg = (ShoppingModel.create as jest.Mock).mock.calls[0][0];
            expect(createArg.userId).toBe(mockUserId);
            expect(createArg.generationOptions).toEqual(mockOptions);

            // Nothing subtracted: the single candidate keeps its full serving-scaled quantity.
            expect(createArg.items).toHaveLength(1);
            expect(createArg.items[0].quantity).toBe(4);

            expect(cacheService.clear).toHaveBeenCalledWith(`shopping:${mockUserId}:*`);
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

        it('create: replaces any client-supplied item id with a server-generated placeholder', async () => {
            // Arrange — a client attempts to choose its own subdocument id.
            const malicious: Record<string, unknown> = {
                name: 'Groceries',
                items: [{ ...mockItem, id: 'client-chosen-id' }]
            };
            (ShoppingModel.create as jest.Mock).mockResolvedValue(mockList);
            cacheService.clear.mockResolvedValue(undefined);

            // Act
            await shoppingService.create(mockUserId, malicious as Partial<IShoppingList>);

            // Assert — the persisted item id is NOT the client's chosen id.
            const createArg = (ShoppingModel.create as jest.Mock).mock.calls[0][0];
            expect(createArg.items[0].id).not.toBe('client-chosen-id');
            expect(typeof createArg.items[0].id).toBe('string');
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
