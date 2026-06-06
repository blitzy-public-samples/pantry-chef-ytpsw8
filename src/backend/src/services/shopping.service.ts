// @version mongoose ^6.0.0

/**
 * HUMAN TASKS:
 * 1. Confirm Redis/cache monitoring (eviction policy, hit-rate dashboards, alerts)
 *    covers the `shopping:` keyspace used by this service.
 * 2. Verify the iOS `isPurchased` <-> `checked` field mapping is reconciled in the iOS
 *    serialization layer so cross-device sync payloads remain contract-consistent.
 * 3. Confirm pantry category/identifier alignment (pantry items key on `ingredientId`,
 *    shopping items key on `name`) so the inventory-exclusion match in `generate()` is
 *    accurate for the deployment's ingredient taxonomy.
 */

import { injectable } from 'tsyringe';
import { ShoppingModel } from '../models/shopping.model';
import { CacheService } from './cache.service';
import { PantryService } from './pantry.service';
import {
  IShoppingList,
  IShoppingListItem,
  IShoppingListGenerationOptions,
} from '../interfaces/shopping.interface';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Service layer for the server-authoritative shopping-list domain (Feature 1 —
 * Shopping List Backend Route and Cross-Device Sync).
 *
 * Provides user-scoped CRUD, recipe-driven generation (with optional pantry
 * inventory exclusion and duplicate merging), and per-item toggle operations over
 * the `ShoppingModel`. Per-user list collections are cached through the shared
 * `CacheService`; every cache write deliberately omits an explicit TTL so the
 * `CacheService` default of 3600s (1 hour) applies, and every mutation invalidates
 * the per-user cache entry to keep reads consistent.
 *
 * Marked `@injectable()` so it is resolvable via the tsyringe container
 * (`container.resolve(ShoppingController)` wires this service in through
 * constructor injection), mirroring the pantry/notification service conventions.
 *
 * Addresses requirement: Shopping List Management - Server-authoritative,
 * user-scoped shopping lists with cross-device synchronization.
 */
@injectable()
export class ShoppingService {
  /**
   * Cache key prefix for per-user shopping-list collections. Combined with the
   * user id to form the cache key (`shopping:<userId>`). No cache-TTL field is
   * declared: cache writes intentionally rely on the `CacheService` 3600s default.
   */
  private readonly CACHE_PREFIX = 'shopping:';

  constructor(private cacheService: CacheService, private pantryService: PantryService) {}

  /**
   * Retrieves all shopping lists owned by a user, cache-first.
   *
   * On a cache hit the cached collection is returned directly; on a miss the lists
   * are loaded from the database, written back to the cache (default 1-hour TTL),
   * and returned.
   *
   * Addresses requirement: Shopping List Management - User-scoped list retrieval
   * with caching for fast repeated reads.
   */
  public async getLists(userId: string): Promise<IShoppingList[]> {
    const key = `${this.CACHE_PREFIX}${userId}`;
    try {
      // Check cache first for the user's list collection.
      const cached = await this.cacheService.get<IShoppingList[]>(key);
      if (cached) {
        return cached;
      }

      // Cache miss: load all lists scoped to this user from the database.
      const lists = await ShoppingModel.find({ userId });

      // Populate the cache (no TTL argument -> CacheService default of 3600s).
      await this.cacheService.set(key, lists);

      logger.info('Shopping lists retrieved successfully', {
        userId,
        count: lists.length,
        timestamp: new Date().toISOString(),
      });

      return lists;
    } catch (error) {
      logger.error('Failed to retrieve shopping lists', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Retrieves a single shopping list owned by a user.
   *
   * The `{ _id, userId }` filter performs lookup and ownership isolation in one
   * query: a list owned by another user yields not-found (404).
   *
   * Addresses requirement: Shopping List Management - Ownership-scoped single-list
   * retrieval.
   */
  public async getList(userId: string, id: string): Promise<IShoppingList> {
    try {
      const list = await ShoppingModel.findOne({ _id: id, userId });
      if (!list) {
        throw new AppError('Shopping list not found', 404, 'SHOPPING_LIST_NOT_FOUND');
      }

      return list;
    } catch (error) {
      logger.error('Failed to retrieve shopping list', {
        userId,
        listId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Creates a new shopping list for a user.
   *
   * The new document is always scoped to the authenticated user, and the per-user
   * list cache is invalidated so a subsequent `getLists` reflects the new list.
   *
   * Addresses requirement: Shopping List Management - User-scoped list creation.
   */
  public async create(userId: string, data: Partial<IShoppingList>): Promise<IShoppingList> {
    const key = `${this.CACHE_PREFIX}${userId}`;
    try {
      const list = await ShoppingModel.create({ userId, ...data });

      // Invalidate the per-user list cache after the mutation.
      await this.cacheService.delete(key);

      logger.info('Shopping list created successfully', {
        userId,
        listId: String(list.id),
        timestamp: new Date().toISOString(),
      });

      return list;
    } catch (error) {
      logger.error('Failed to create shopping list', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Updates an existing shopping list owned by a user.
   *
   * The `{ _id, userId }` filter enforces ownership isolation; a missing or
   * non-owned list yields not-found (404). The per-user cache is invalidated on
   * success.
   *
   * Addresses requirement: Shopping List Management - Ownership-scoped list update.
   */
  public async update(
    userId: string,
    id: string,
    data: Partial<IShoppingList>
  ): Promise<IShoppingList> {
    const key = `${this.CACHE_PREFIX}${userId}`;
    try {
      const list = await ShoppingModel.findOneAndUpdate({ _id: id, userId }, data, { new: true });
      if (!list) {
        throw new AppError('Shopping list not found', 404, 'SHOPPING_LIST_NOT_FOUND');
      }

      // Invalidate the per-user list cache after the mutation.
      await this.cacheService.delete(key);

      logger.info('Shopping list updated successfully', {
        userId,
        listId: id,
        timestamp: new Date().toISOString(),
      });

      return list;
    } catch (error) {
      logger.error('Failed to update shopping list', {
        userId,
        listId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Deletes a shopping list owned by a user.
   *
   * The `{ _id, userId }` filter enforces ownership isolation; a missing or
   * non-owned list yields not-found (404). The per-user cache is invalidated on
   * success.
   *
   * Addresses requirement: Shopping List Management - Ownership-scoped list deletion.
   */
  public async delete(userId: string, id: string): Promise<void> {
    const key = `${this.CACHE_PREFIX}${userId}`;
    try {
      const list = await ShoppingModel.findOneAndDelete({ _id: id, userId });
      if (!list) {
        throw new AppError('Shopping list not found', 404, 'SHOPPING_LIST_NOT_FOUND');
      }

      // Invalidate the per-user list cache after the mutation.
      await this.cacheService.delete(key);

      logger.info('Shopping list deleted successfully', {
        userId,
        listId: id,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to delete shopping list', {
        userId,
        listId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Generates a shopping list for a user from recipe-generation options.
   *
   * Candidate items are derived from `options.recipeIds` alone (no recipe service
   * is injected): one item is produced per recipe id, with its quantity scaled by
   * `options.servings` and the originating `recipeId` carried through. When
   * `options.mergeDuplicates` is true, duplicate items are merged by summing their
   * quantities. When `options.excludeInventoryItems` is true, the user's pantry is
   * read via `PantryService.getPantry` and matching on-hand quantities are
   * subtracted from the candidates (best-effort match). The generation options are
   * echoed onto the persisted list, and the per-user cache is invalidated.
   *
   * Addresses requirement: Shopping List Generation - Recipe-driven, customizable
   * list generation with pantry inventory exclusion.
   */
  public async generate(
    userId: string,
    options: IShoppingListGenerationOptions
  ): Promise<IShoppingList> {
    const key = `${this.CACHE_PREFIX}${userId}`;
    try {
      // Derive candidate items from the generation options alone. There is no
      // recipe service or recipe model available here, so each requested recipe id
      // contributes a single quantity-scaled placeholder item carrying its
      // recipe association. Mongoose assigns the authoritative subdocument `_id`
      // on persistence; the generated `id` below only satisfies the typed shape.
      const recipeIds = Array.isArray(options.recipeIds) ? options.recipeIds : [];
      const servings = options.servings > 0 ? options.servings : 1;

      let candidateItems: IShoppingListItem[] = recipeIds.map(
        (recipeId, index): IShoppingListItem => ({
          id: this.buildGeneratedItemId(index),
          name: `Recipe ${recipeId}`,
          quantity: servings,
          unit: '',
          category: '',
          checked: false,
          notes: '',
          recipeId,
          recipeName: '',
        })
      );

      // Optionally merge duplicate items (same identity) by summing quantities.
      if (options.mergeDuplicates === true) {
        candidateItems = this.mergeDuplicateItems(candidateItems);
      }

      // Optionally subtract on-hand pantry inventory from the candidate items.
      // getPantry is invoked ONLY within this branch.
      if (options.excludeInventoryItems === true) {
        try {
          const pantry = await this.pantryService.getPantry(userId);

          // Build an on-hand index keyed by normalized ingredient identifier.
          const onHand = new Map<string, number>();
          for (const pantryItem of pantry.items) {
            const indexKey = pantryItem.ingredientId.trim().toLowerCase();
            const current = onHand.get(indexKey) ?? 0;
            onHand.set(indexKey, current + pantryItem.quantity);
          }

          candidateItems = this.applyInventoryExclusion(candidateItems, onHand);
        } catch (pantryError) {
          // A user without a provisioned pantry should still be able to generate
          // a list: treat a missing pantry (404) as "no inventory to exclude"
          // rather than failing generation. Re-throw anything that is not a 404.
          if (pantryError instanceof AppError && pantryError.statusCode === 404) {
            logger.warn(
              'No pantry found during shopping list generation; skipping inventory exclusion',
              {
                userId,
                timestamp: new Date().toISOString(),
              }
            );
          } else {
            throw pantryError;
          }
        }
      }

      // Persist the generated list, echoing the options into generationOptions.
      const list = await ShoppingModel.create({
        userId,
        name: 'Generated Shopping List',
        items: candidateItems,
        generationOptions: options,
      });

      // Invalidate the per-user list cache so subsequent getLists is consistent.
      await this.cacheService.delete(key);

      logger.info('Shopping list generated successfully', {
        userId,
        listId: String(list.id),
        itemCount: candidateItems.length,
        timestamp: new Date().toISOString(),
      });

      return list;
    } catch (error) {
      logger.error('Failed to generate shopping list', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Toggles the `checked` state of a single item within a user's shopping list.
   *
   * The list is loaded with ownership isolation (`{ _id, userId }`); a missing or
   * non-owned list yields not-found (404). The target item is located by its
   * subdocument id; a missing item also yields not-found (404). The canonical
   * boolean field is `checked` (the iOS `isPurchased` divergence is reconciled in
   * the iOS layer). The per-user cache is invalidated on success.
   *
   * Addresses requirement: Shopping List Management - Per-item checked toggling
   * with cross-device synchronization.
   */
  public async toggleItem(userId: string, listId: string, itemId: string): Promise<IShoppingList> {
    const key = `${this.CACHE_PREFIX}${userId}`;
    try {
      const list = await ShoppingModel.findOne({ _id: listId, userId });
      if (!list) {
        throw new AppError('Shopping list not found', 404, 'SHOPPING_LIST_NOT_FOUND');
      }

      // Locate the target item by its subdocument id.
      const item = list.items.find((candidate): boolean => candidate.id === itemId);
      if (!item) {
        throw new AppError('Shopping list item not found', 404, 'SHOPPING_LIST_ITEM_NOT_FOUND');
      }

      // Flip the canonical `checked` boolean and persist the document.
      item.checked = !item.checked;
      await list.save();

      // Invalidate the per-user list cache after the mutation.
      await this.cacheService.delete(key);

      logger.info('Shopping list item toggled successfully', {
        userId,
        listId,
        itemId,
        checked: item.checked,
        timestamp: new Date().toISOString(),
      });

      return list;
    } catch (error) {
      logger.error('Failed to toggle shopping list item', {
        userId,
        listId,
        itemId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Builds a deterministic, dependency-free identifier for a generated item.
   *
   * This value only satisfies the typed `IShoppingListItem` shape prior to
   * persistence; Mongoose assigns the authoritative subdocument `_id` (and the
   * `id` virtual) when the parent list is created.
   */
  private buildGeneratedItemId(index: number): string {
    return `generated-${Date.now().toString(36)}-${index}`;
  }

  /**
   * Merges duplicate items by summing their quantities.
   *
   * Item identity is the normalized combination of `name` and `unit`. The first
   * occurrence's non-quantity fields are preserved.
   */
  private mergeDuplicateItems(items: IShoppingListItem[]): IShoppingListItem[] {
    const merged = new Map<string, IShoppingListItem>();
    for (const item of items) {
      const mergeKey = `${item.name.trim().toLowerCase()}::${item.unit.trim().toLowerCase()}`;
      const existing = merged.get(mergeKey);
      if (existing) {
        merged.set(mergeKey, {
          ...existing,
          quantity: existing.quantity + item.quantity,
        });
      } else {
        merged.set(mergeKey, { ...item });
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Subtracts on-hand pantry inventory from candidate items (best-effort).
   *
   * Candidate items are matched against the on-hand index by normalized `name`.
   * The matched on-hand quantity is consumed: if it fully covers a candidate the
   * item is dropped, otherwise the remaining quantity is retained. The on-hand
   * index is decremented as quantities are consumed so duplicate candidates do not
   * each subtract the full on-hand amount.
   */
  private applyInventoryExclusion(
    items: IShoppingListItem[],
    onHand: Map<string, number>
  ): IShoppingListItem[] {
    const result: IShoppingListItem[] = [];
    for (const item of items) {
      const lookupKey = item.name.trim().toLowerCase();
      const available = onHand.get(lookupKey) ?? 0;

      if (available <= 0) {
        // Nothing on hand for this item: keep the full candidate quantity.
        result.push(item);
        continue;
      }

      const consumed = available >= item.quantity ? item.quantity : available;
      onHand.set(lookupKey, available - consumed);

      const remaining = item.quantity - consumed;
      if (remaining > 0) {
        // Partially covered by inventory: retain the outstanding quantity.
        result.push({ ...item, quantity: remaining });
      }
      // Fully covered (remaining <= 0): drop the item from the generated list.
    }

    return result;
  }
}
