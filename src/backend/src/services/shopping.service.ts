// @version mongoose ^6.0.0

/**
 * HUMAN TASKS:
 * 1. Confirm Redis/cache monitoring (eviction policy, hit-rate dashboards, alerts)
 *    covers the `shopping:` keyspace used by this service.
 * 2. Verify the iOS `isPurchased` <-> `checked` field mapping is reconciled in the iOS
 *    serialization layer so cross-device sync payloads remain contract-consistent.
 * 3. Confirm pantry/recipe identifier alignment: both recipe ingredient lines and
 *    pantry items key on the canonical `ingredientId`, which `generate()` uses for
 *    duplicate merging and inventory exclusion. Verify the ingredient master
 *    collection is seeded so referenced ingredient ids resolve to name/category.
 */

import { injectable } from 'tsyringe';
import { ShoppingModel } from '../models/shopping.model';
import { RecipeModel } from '../models/recipe.model';
import { IngredientModel } from '../models/ingredient.model';
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
 * Default number of shopping lists returned per page when a caller does not
 * specify a limit. Keeps cold-cache `getLists` reads bounded (R10 performance
 * budget) instead of loading a user's entire collection in one unbounded query.
 */
const DEFAULT_PAGE_SIZE = 50;

/**
 * Hard upper bound on the page size a caller may request, so a client cannot
 * defeat the pagination cap by passing an arbitrarily large `limit`.
 */
const MAX_PAGE_SIZE = 100;

/**
 * Strict 24-hex-character MongoDB ObjectId pattern. Used by {@link ShoppingService.sanitizeItems}
 * to decide whether a client-supplied item id is a real server-assigned subdocument id (which is
 * then preserved across a PUT full-replace for item-identity stability) versus a value that must
 * be ignored so Mongoose mints a fresh id (a new item, an empty placeholder, or a non-ObjectId
 * client id such as a web `crypto.randomUUID()`).
 */
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

/**
 * Internal pairing of a generated shopping-list item with the canonical ingredient
 * id it was sourced from.
 *
 * The ingredient key (never the human-readable display name) is the identity used
 * for duplicate merging and pantry inventory exclusion, so both operations stay
 * accurate regardless of how an ingredient is named. The key is carried alongside
 * the item only during generation and is not persisted.
 */
interface GenerationCandidate {
  ingredientKey: string;
  item: IShoppingListItem;
}

/**
 * Internal write-shape for a shopping-list item being persisted on create/update.
 *
 * Identical to the client-editable content fields of {@link IShoppingListItem}, but the identity
 * field is the Mongo-native optional `_id` (NOT the `id` virtual, which Mongoose ignores on
 * write): when a client re-sends an item that already carries its server-assigned ObjectId, that
 * id is carried through as `_id` so Mongoose REUSES the existing subdocument identity on a PUT
 * full-replace instead of minting a new one (fixes item-id churn across updates). When `_id` is
 * omitted (a new item, or a non-ObjectId client id), Mongoose assigns a fresh `_id`. Identity
 * stays server-controlled (only a well-formed ObjectId is honored) and list-local (items are
 * embedded subdocuments of an owner-scoped list), so a client can neither forge a new identity
 * nor reference another user's data.
 */
interface ShoppingItemWriteModel {
  _id?: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
  notes: string;
  recipeId: string;
  recipeName: string;
}

/**
 * Allow-listed, Mongo-ready shape produced by {@link ShoppingService.sanitizeListData} for the
 * create/update write paths: only the editable list `name` and the allow-listed `items` survive,
 * with each item reduced to {@link ShoppingItemWriteModel}.
 */
interface SanitizedListData {
  name?: string;
  items?: ShoppingItemWriteModel[];
}

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
   * Retrieves a bounded page of shopping lists owned by a user, cache-first.
   *
   * The query is paginated and sorted most-recently-updated-first to honor the
   * platform performance budget (R10): an unbounded `find({ userId })` could grow
   * without limit on a cold cache, so the result set is capped at `limit`
   * (defaulting to {@link DEFAULT_PAGE_SIZE}, hard-capped at {@link MAX_PAGE_SIZE})
   * and offset by `page`. The cache key embeds the pagination window
   * (`shopping:<userId>:<page>:<limit>`) so each window is cached independently;
   * on a hit the cached page is returned directly, on a miss the page is loaded,
   * written back to the cache (default 1-hour TTL), and returned.
   *
   * Addresses requirement: Shopping List Management - User-scoped, paginated list
   * retrieval with caching for fast repeated reads.
   */
  public async getLists(
    userId: string,
    page = 1,
    limit = DEFAULT_PAGE_SIZE
  ): Promise<IShoppingList[]> {
    // Clamp pagination inputs to safe bounds: page >= 1, 1 <= limit <= MAX_PAGE_SIZE.
    const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
    const safeLimit =
      Number.isFinite(limit) && limit >= 1
        ? Math.min(Math.floor(limit), MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE;
    const skip = (safePage - 1) * safeLimit;

    // Cache key embeds the pagination window so distinct pages never collide.
    const key = `${this.CACHE_PREFIX}${userId}:${safePage}:${safeLimit}`;
    try {
      // Check cache first for this pagination window of the user's collection.
      const cached = await this.cacheService.get<IShoppingList[]>(key);
      if (cached) {
        return cached;
      }

      // Cache miss: load a bounded, most-recently-updated-first page scoped to
      // this user. The filter always includes `userId` for ownership isolation.
      const lists = await ShoppingModel.find({ userId }, null, {
        sort: { updatedAt: -1 },
        skip,
        limit: safeLimit,
      });

      // Populate the cache (no TTL argument -> CacheService default of 3600s).
      await this.cacheService.set(key, lists);

      logger.info('Shopping lists retrieved successfully', {
        userId,
        page: safePage,
        limit: safeLimit,
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
   * Creates a new shopping list for a user from client-supplied data.
   *
   * The payload is first reduced to an allow-list of client-editable fields
   * (`name` and `items`, each item itself allow-listed) via {@link sanitizeListData},
   * and the authenticated `userId` is applied LAST so a client-supplied `userId`
   * (or `_id`/timestamps/Mongo operators) can never override ownership — closing
   * the create-time ownership-drift vector (R3 user scoping). The per-user list
   * cache is invalidated so a subsequent `getLists` reflects the new list.
   *
   * Addresses requirement: Shopping List Management - User-scoped list creation.
   */
  public async create(userId: string, data: Partial<IShoppingList>): Promise<IShoppingList> {
    try {
      // Allow-list client-editable fields, then set userId LAST so neither the
      // spread nor any client-supplied `userId` can overwrite the authenticated owner.
      const sanitized = this.sanitizeListData(data);
      const list = await ShoppingModel.create({ ...sanitized, userId });

      // Invalidate every cached page of the user's collection after the mutation.
      await this.invalidateUserCache(userId);

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
   * non-owned list yields not-found (404). The client payload is reduced to an
   * allow-listed `$set` of editable fields (`name`/`items`) via
   * {@link sanitizeListData} so `userId`, `_id`, timestamps, and raw Mongo
   * operators cannot be smuggled through `findOneAndUpdate`; `runValidators` is
   * enabled so schema constraints (e.g. item `quantity >= 0`) are enforced on
   * update as they are on create. The per-user cache is invalidated on success.
   *
   * Addresses requirement: Shopping List Management - Ownership-scoped list update.
   */
  public async update(
    userId: string,
    id: string,
    data: Partial<IShoppingList>
  ): Promise<IShoppingList> {
    try {
      // Reduce the payload to an allow-listed $set so a caller cannot reassign
      // ownership or inject server-managed fields/operators; enforce schema
      // validators on the update path.
      const sanitized = this.sanitizeListData(data);
      const list = await ShoppingModel.findOneAndUpdate(
        { _id: id, userId },
        { $set: sanitized },
        { new: true, runValidators: true }
      );
      if (!list) {
        throw new AppError('Shopping list not found', 404, 'SHOPPING_LIST_NOT_FOUND');
      }

      // Invalidate every cached page of the user's collection after the mutation.
      await this.invalidateUserCache(userId);

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
    try {
      const list = await ShoppingModel.findOneAndDelete({ _id: id, userId });
      if (!list) {
        throw new AppError('Shopping list not found', 404, 'SHOPPING_LIST_NOT_FOUND');
      }

      // Invalidate every cached page of the user's collection after the mutation.
      await this.invalidateUserCache(userId);

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
   * Generates a shopping list for a user by aggregating the ingredients of the
   * referenced recipes.
   *
   * The referenced recipes (`options.recipeIds`) are loaded from the trusted
   * `RecipeModel`, and their ingredient lines are resolved against the
   * `IngredientModel` master collection to obtain each ingredient's real name and
   * category. For every recipe ingredient, a candidate item is produced with its
   * quantity scaled by the ratio of the requested `options.servings` to the
   * recipe's base servings, carrying the originating `recipeId`/`recipeName`. A
   * referenced id that does not resolve to a trusted recipe/ingredient record is
   * skipped (and logged) rather than echoed into a persisted item name — this both
   * keeps generation recipe-driven and prevents client-controlled identifiers from
   * being stored as item content (CWE-20/CWE-79).
   *
   * When `options.mergeDuplicates` is true, candidates sharing an ingredient id and
   * unit are merged by summing quantities. When `options.excludeInventoryItems` is
   * true, the user's pantry is read via `PantryService.getPantry` and matching
   * on-hand quantities (matched by ingredient id) are subtracted from the
   * candidates. The generation options are echoed onto the persisted list, and the
   * per-user cache is invalidated.
   *
   * Addresses requirement: Shopping List Generation - Recipe-driven, customizable
   * list generation with pantry inventory exclusion.
   */
  public async generate(
    userId: string,
    options: IShoppingListGenerationOptions
  ): Promise<IShoppingList> {
    try {
      // Recipe-driven generation: candidate items are derived from the TRUSTED
      // recipe and ingredient records referenced by `options.recipeIds`, never from
      // the client-supplied ids themselves. This is what makes the result a real
      // recipe-sourced shopping list (AAP F1 generation) and simultaneously closes
      // the stored-data/XSS vector (CWE-20/CWE-79): an unresolvable client id is
      // skipped and logged rather than echoed into a persisted item name.
      const recipeIds = Array.isArray(options.recipeIds) ? options.recipeIds : [];
      const targetServings = options.servings > 0 ? options.servings : 1;

      // Load the referenced recipes in a single bounded query (R10 budget). With no
      // recipe ids there is nothing to aggregate.
      const recipes =
        recipeIds.length > 0 ? await RecipeModel.find({ _id: { $in: recipeIds } }) : [];

      // Collect every distinct ingredient id referenced across all recipes so the
      // ingredient master records can be resolved in one follow-up query.
      const ingredientIdSet = new Set<string>();
      for (const recipe of recipes) {
        for (const recipeIngredient of recipe.ingredients) {
          ingredientIdSet.add(String(recipeIngredient.ingredientId));
        }
      }

      // Resolve ingredient master records -> trusted name + category, keyed by id.
      // A Map (not a plain object) is used so dynamic id keys cannot raise
      // object-injection / prototype-pollution concerns.
      const ingredientMaster = new Map<string, { name: string; category: string }>();
      if (ingredientIdSet.size > 0) {
        const ingredientDocs = await IngredientModel.find({
          _id: { $in: Array.from(ingredientIdSet) },
        });
        for (const ingredientDoc of ingredientDocs) {
          ingredientMaster.set(String(ingredientDoc.id), {
            name: ingredientDoc.name,
            category: String(ingredientDoc.category),
          });
        }
      }

      // Build scaled candidates from recipe ingredient lines, carrying each item's
      // originating recipe association. Quantities are scaled by the ratio of the
      // requested servings to the recipe's base servings.
      let candidates: GenerationCandidate[] = [];
      for (const recipe of recipes) {
        const baseServings = recipe.servings > 0 ? recipe.servings : 1;
        const scale = targetServings / baseServings;
        for (const recipeIngredient of recipe.ingredients) {
          const ingredientKey = String(recipeIngredient.ingredientId);
          const master = ingredientMaster.get(ingredientKey);
          if (master === undefined) {
            // No trusted ingredient record resolved for this reference: skip it
            // rather than echoing an unverified id into a persisted item name.
            logger.warn('Skipping recipe ingredient with no resolvable master record', {
              userId,
              recipeId: String(recipe.id),
              ingredientId: ingredientKey,
              timestamp: new Date().toISOString(),
            });
            continue;
          }

          candidates.push({
            ingredientKey,
            item: {
              id: this.buildGeneratedItemId(candidates.length),
              name: master.name,
              quantity: recipeIngredient.quantity * scale,
              unit: recipeIngredient.unit,
              category: master.category,
              checked: false,
              notes: '',
              recipeId: String(recipe.id),
              recipeName: recipe.name,
            },
          });
        }
      }

      // Optionally merge duplicate ingredients (same ingredient + unit) by summing
      // quantities, so the same item sourced from multiple recipes appears once.
      if (options.mergeDuplicates === true) {
        candidates = this.mergeDuplicateCandidates(candidates);
      }

      // Optionally subtract on-hand pantry inventory. Matching is by the canonical
      // ingredient id (NOT display name), so exclusion is accurate regardless of
      // naming. getPantry is invoked ONLY within this branch.
      if (options.excludeInventoryItems === true) {
        try {
          const pantry = await this.pantryService.getPantry(userId);

          // Build an on-hand index keyed by ingredient id.
          const onHand = new Map<string, number>();
          for (const pantryItem of pantry.items) {
            const pantryKey = String(pantryItem.ingredientId);
            const current = onHand.get(pantryKey) ?? 0;
            onHand.set(pantryKey, current + pantryItem.quantity);
          }

          candidates = this.applyInventoryExclusion(candidates, onHand);
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

      // Project the candidates down to the persisted item shape.
      const candidateItems: IShoppingListItem[] = candidates.map(
        (candidate): IShoppingListItem => candidate.item
      );

      // Persist the generated list, echoing the options into generationOptions.
      const list = await ShoppingModel.create({
        userId,
        name: 'Generated Shopping List',
        items: candidateItems,
        generationOptions: options,
      });

      // Invalidate every cached page of the user's collection so subsequent
      // getLists reads are consistent.
      await this.invalidateUserCache(userId);

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

      // Invalidate every cached page of the user's collection after the mutation.
      await this.invalidateUserCache(userId);

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
   * Merges duplicate candidates by summing their quantities.
   *
   * Candidate identity is the canonical ingredient id combined with the normalized
   * unit, so the same ingredient sourced from multiple recipes (in the same unit)
   * collapses into a single line. The first occurrence's non-quantity fields
   * (including its originating recipe association) are preserved.
   */
  private mergeDuplicateCandidates(candidates: GenerationCandidate[]): GenerationCandidate[] {
    const merged = new Map<string, GenerationCandidate>();
    for (const candidate of candidates) {
      const mergeKey = `${candidate.ingredientKey}::${candidate.item.unit.trim().toLowerCase()}`;
      const existing = merged.get(mergeKey);
      if (existing) {
        merged.set(mergeKey, {
          ...existing,
          item: {
            ...existing.item,
            quantity: existing.item.quantity + candidate.item.quantity,
          },
        });
      } else {
        merged.set(mergeKey, {
          ingredientKey: candidate.ingredientKey,
          item: { ...candidate.item },
        });
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Subtracts on-hand pantry inventory from candidates (best-effort).
   *
   * Candidates are matched against the on-hand index by canonical ingredient id
   * (the same identifier pantry items are keyed on), so exclusion is accurate
   * regardless of ingredient naming. The matched on-hand quantity is consumed: if
   * it fully covers a candidate the item is dropped, otherwise the remaining
   * quantity is retained. The on-hand index is decremented as quantities are
   * consumed so duplicate candidates do not each subtract the full on-hand amount.
   */
  private applyInventoryExclusion(
    candidates: GenerationCandidate[],
    onHand: Map<string, number>
  ): GenerationCandidate[] {
    const result: GenerationCandidate[] = [];
    for (const candidate of candidates) {
      const available = onHand.get(candidate.ingredientKey) ?? 0;

      if (available <= 0) {
        // Nothing on hand for this ingredient: keep the full candidate quantity.
        result.push(candidate);
        continue;
      }

      const consumed = available >= candidate.item.quantity ? candidate.item.quantity : available;
      onHand.set(candidate.ingredientKey, available - consumed);

      const remaining = candidate.item.quantity - consumed;
      if (remaining > 0) {
        // Partially covered by inventory: retain the outstanding quantity.
        result.push({
          ...candidate,
          item: { ...candidate.item, quantity: remaining },
        });
      }
      // Fully covered (remaining <= 0): drop the item from the generated list.
    }

    return result;
  }

  /**
   * Invalidates every cached page of a user's shopping-list collection.
   *
   * List reads are cached per pagination window under keys shaped
   * `shopping:<userId>:<page>:<limit>`, so a single-key delete would leave stale
   * pages behind. Clearing by the `shopping:<userId>:*` glob removes all cached
   * windows for the user after any mutation. The trailing `:` anchors the glob so
   * one user's keys never match another's (e.g. `shopping:u1:*` excludes
   * `shopping:u12:*`).
   */
  private async invalidateUserCache(userId: string): Promise<void> {
    await this.cacheService.clear(`${this.CACHE_PREFIX}${userId}:*`);
  }

  /**
   * Reduces client-supplied list data to an allow-list of editable fields.
   *
   * Only `name` and `items` survive; every server-managed or unknown field —
   * `userId`, `_id`/`id`, `createdAt`/`updatedAt`, `generationOptions`, and any
   * raw Mongo update operators (e.g. `$set`, `$inc`) a caller might smuggle into
   * the request body — is dropped because it is simply not copied. This is the
   * authoritative defense that prevents create/update ownership drift even if a
   * caller bypasses the controller DTO and passes a raw request body (R3 user
   * scoping; security/ownership-isolation findings).
   */
  private sanitizeListData(data: Partial<IShoppingList>): SanitizedListData {
    const clean: SanitizedListData = {};
    if (typeof data.name === 'string') {
      clean.name = data.name;
    }
    if (Array.isArray(data.items)) {
      clean.items = this.sanitizeItems(data.items);
    }
    return clean;
  }

  /**
   * Allow-lists each shopping-list item to the client-editable content fields, mapping it onto the
   * Mongo-ready {@link ShoppingItemWriteModel}.
   *
   * Item identity is preserved across a PUT full-replace: when the client re-sends an item that
   * carries its server-assigned ObjectId, that id is forwarded as `_id` so Mongoose REUSES the
   * existing subdocument identity instead of minting a new one (fixes the item-id churn reported in
   * QA finding 1.4-B). Only a well-formed 24-hex ObjectId is honored — a new item, an empty
   * placeholder, or a non-ObjectId client id (e.g. a web `crypto.randomUUID()`) leaves `_id` unset
   * so Mongoose assigns a fresh authoritative id; a client therefore can never forge a chosen
   * identity for a new item. The eight content fields are copied through verbatim — invalid values
   * (e.g. a negative `quantity`, or a missing required field) are intentionally NOT coerced here so
   * the schema validators (`runValidators` on update, and `create`'s implicit validation) reject
   * them, surfacing a validation error rather than silently persisting bad data.
   */
  private sanitizeItems(items: IShoppingListItem[]): ShoppingItemWriteModel[] {
    return items.map((item): ShoppingItemWriteModel => {
      const writeItem: ShoppingItemWriteModel = {
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        checked: item.checked,
        notes: item.notes,
        recipeId: item.recipeId,
        recipeName: item.recipeName,
      };
      // Preserve an existing server-assigned ObjectId so a PUT full-replace keeps item identity
      // stable; ignore any non-ObjectId id (new item / web crypto.randomUUID() / empty placeholder)
      // so Mongoose mints a fresh subdocument id.
      if (typeof item.id === 'string' && OBJECT_ID_PATTERN.test(item.id)) {
        writeItem._id = item.id;
      }
      return writeItem;
    });
  }
}
