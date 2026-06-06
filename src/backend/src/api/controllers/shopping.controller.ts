// @version express ^4.18.0
// @version express-validator ^6.14.0
// @version tsyringe ^4.7.0

/**
 * HUMAN TASKS:
 * 1. Configure rate-limiting thresholds for the shopping-list mutation endpoints
 *    (create / update / generate / toggle) in line with the platform abuse-prevention policy.
 * 2. Set up CloudWatch alarms for shopping-endpoint response time against the
 *    sub-200ms API budget (NFR-P8); the per-handler `responseTime` metric below feeds this.
 * 3. Confirm cache hit-rate monitoring/alerting covers the `shopping:` keyspace used by
 *    ShoppingService so degraded cache performance is observable in production.
 * 4. Verify the iOS `isPurchased` <-> `checked` field mapping is reconciled in the iOS
 *    serialization layer so cross-device sync payloads stay contract-consistent.
 * 5. Set up alerts for elevated 404 (ownership-isolation) rates on shopping routes to
 *    surface potential list enumeration attempts or client-contract drift.
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { injectable } from 'tsyringe';
import { ShoppingService } from '../../services/shopping.service';
import { logger } from '../../utils/logger';
import {
  IShoppingList,
  IShoppingListItem,
  IShoppingListGenerationOptions,
} from '../../interfaces/shopping.interface';

/**
 * Controller exposing the server-authoritative shopping-list HTTP endpoints
 * (Feature 1 - Shopping List Backend Route and Cross-Device Sync).
 *
 * Exposes exactly the six request handlers backing the user-specified route contract -
 * `getLists`, `create`, `update`, `delete`, `generate`, and `toggleItem` - each of which
 * delegates to the injected `ShoppingService` and returns the project's unified
 * success/error response envelope.
 *
 * Design notes:
 * - DI shape mirrors the pantry controller (`@injectable()` + constructor injection) so the
 *   routes module can resolve it via `container.resolve(ShoppingController)`. There is no
 *   central container registration; resolution is by reflection and the single
 *   `ShoppingService` dependency (itself `@injectable()`) is auto-resolved.
 * - Response and error behavior mirrors the recipe controller: every handler is typed
 *   `(req, res, next): Promise<void>`, records a `responseTime`, emits the
 *   `{ success, data, metadata }` success body, and forwards any thrown error to the global
 *   `errorHandler` via `next(error)` (never an inline 500 body, never returning the Response).
 * - Not-found (404) and ownership isolation are owned by `ShoppingService`, which throws
 *   `AppError('Shopping list not found', 404, 'SHOPPING_LIST_NOT_FOUND')` for missing or
 *   cross-user lists; the controller simply propagates it so the unified error envelope is
 *   rendered (a foreign list yields 404, never a leak).
 * - Every operation is scoped to the authenticated user (`req.user.id`, populated by the
 *   `authenticate` middleware the routes sit behind).
 *
 * Addresses requirement: Shopping List Management - Server-authoritative, user-scoped
 * shopping lists with cross-device synchronization.
 */
@injectable()
export class ShoppingController {
  constructor(private shoppingService: ShoppingService) {}

  /**
   * GET /shopping-lists - retrieves every shopping list owned by the authenticated user.
   *
   * Non-mutating: no `validationResult` guard is applied (no request body to validate).
   * Optional `page`/`limit` query parameters select a bounded pagination window; they are
   * forwarded to `ShoppingService.getLists` (cache-first), which clamps them to safe bounds
   * and defaults them when absent. Returns the collection page in the unified success
   * envelope with HTTP 200.
   *
   * Addresses requirement: Shopping List Management - User-scoped list retrieval.
   */
  public async getLists(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    try {
      const userId = req.user?.id as string;

      // Optional pagination query params. When absent (or non-numeric) the service applies
      // its safe defaults; the service also clamps page/limit to bounded ranges.
      const pageRaw = req.query.page;
      const limitRaw = req.query.limit;
      const page = typeof pageRaw === 'string' ? Number(pageRaw) : undefined;
      const limit = typeof limitRaw === 'string' ? Number(limitRaw) : undefined;

      const lists = await this.shoppingService.getLists(userId, page, limit);

      const responseTime = Date.now() - startTime;
      logger.info('Shopping lists retrieved', {
        userId,
        count: lists.length,
        responseTime,
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        data: lists,
        metadata: { responseTime },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST / - creates a new shopping list for the authenticated user.
   *
   * Mutating: runs the `validationResult` guard first and returns the unified 400 error body
   * on failure. Delegates to `ShoppingService.create(userId, data)` and returns the created
   * list in the unified success envelope with HTTP 201.
   *
   * Addresses requirement: Shopping List Management - User-scoped list creation.
   */
  public async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    try {
      const userId = req.user?.id as string;

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
        });
        return;
      }

      // Build an explicit allow-listed DTO from the request body rather than forwarding the
      // raw body: express-validator does not strip unknown fields, so a raw body could carry
      // server-managed fields (userId/_id/timestamps) or Mongo operators to the service.
      const data = this.buildListDto(req);
      const list = await this.shoppingService.create(userId, data);

      const responseTime = Date.now() - startTime;
      logger.info('Shopping list created', {
        userId,
        listId: list.id,
        responseTime,
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({
        success: true,
        data: list,
        metadata: { responseTime },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /:id - updates an existing shopping list owned by the authenticated user.
   *
   * Mutating: runs the `validationResult` guard first and returns the unified 400 error body
   * on failure. Delegates to `ShoppingService.update(userId, id, data)`; ownership isolation
   * and not-found (404) are enforced by the service. Returns the updated list in the unified
   * success envelope with HTTP 200.
   *
   * Addresses requirement: Shopping List Management - Ownership-scoped list update.
   */
  public async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    try {
      const userId = req.user?.id as string;

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
        });
        return;
      }

      // Allow-listed DTO (see create): never forward the raw body to the service.
      const data = this.buildListDto(req);
      const list = await this.shoppingService.update(userId, req.params.id, data);

      const responseTime = Date.now() - startTime;
      logger.info('Shopping list updated', {
        userId,
        listId: req.params.id,
        responseTime,
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        data: list,
        metadata: { responseTime },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /:id - deletes a shopping list owned by the authenticated user.
   *
   * Runs the `validationResult` guard first (the route attaches `deleteShoppingListValidation`,
   * which checks `:id` is a well-formed ObjectId) and returns the unified 400 error body on
   * failure, so an invalid id yields 400 rather than a Mongoose CastError/500. Delegates to
   * `ShoppingService.delete(userId, id)`, which returns `void` and enforces ownership isolation
   * and not-found (404). Because there is no resource to echo back, the success envelope carries
   * a confirmation message payload with HTTP 200.
   *
   * Addresses requirement: Shopping List Management - Ownership-scoped list deletion.
   */
  public async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    try {
      const userId = req.user?.id as string;

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
        });
        return;
      }

      await this.shoppingService.delete(userId, req.params.id);

      const responseTime = Date.now() - startTime;
      logger.info('Shopping list deleted', {
        userId,
        listId: req.params.id,
        responseTime,
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        data: { message: 'Shopping list deleted' },
        metadata: { responseTime },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /:id/generate - generates a shopping list for the authenticated user from
   * recipe-driven generation options (with optional pantry inventory exclusion and duplicate
   * merging, both handled by the service).
   *
   * Mutating: runs the `validationResult` guard first and returns the unified 400 error body
   * on failure. The route path carries an `:id` param, but the verified service signature is
   * `generate(userId, options)` - so exactly two arguments are passed and `req.params.id` is
   * intentionally NOT forwarded. Returns the generated list in the unified success envelope
   * with HTTP 201.
   *
   * Addresses requirement: Shopping List Generation - Recipe-driven, customizable list
   * generation with pantry inventory exclusion.
   */
  public async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    try {
      const userId = req.user?.id as string;

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
        });
        return;
      }

      const options = req.body as IShoppingListGenerationOptions;
      const list = await this.shoppingService.generate(userId, options);

      const responseTime = Date.now() - startTime;
      logger.info('Shopping list generated', {
        userId,
        listId: list.id,
        responseTime,
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({
        success: true,
        data: list,
        metadata: { responseTime },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /:id/items/:itemId/toggle - toggles the `checked` state of a single item within a
   * shopping list owned by the authenticated user.
   *
   * Mutating: runs the `validationResult` guard first and returns the unified 400 error body
   * on failure. Delegates to `ShoppingService.toggleItem(userId, listId, itemId)`, passing
   * `req.params.id` then `req.params.itemId`; ownership isolation, list-not-found, and
   * item-not-found (404) are enforced by the service. Returns the updated list in the unified
   * success envelope with HTTP 200.
   *
   * Addresses requirement: Shopping List Management - Per-item checked toggling with
   * cross-device synchronization.
   */
  public async toggleItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    try {
      const userId = req.user?.id as string;

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
        });
        return;
      }

      const list = await this.shoppingService.toggleItem(userId, req.params.id, req.params.itemId);

      const responseTime = Date.now() - startTime;
      logger.info('Shopping list item toggled', {
        userId,
        listId: req.params.id,
        itemId: req.params.itemId,
        responseTime,
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        data: list,
        metadata: { responseTime },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Builds an explicit, allow-listed shopping-list DTO from the raw request body.
   *
   * express-validator validates known fields but does NOT strip unknown ones, so a raw
   * `req.body` can still carry server-managed fields (`userId`, `_id`/`id`,
   * `createdAt`/`updatedAt`), `generationOptions`, or smuggled Mongo update operators
   * (`$set`, `$inc`, ...). This helper is the controller-boundary half of a defense-in-depth
   * allow-list (the authoritative second half is `ShoppingService.sanitizeListData`): it
   * copies through ONLY the two client-editable list fields - `name` and `items` - and, for
   * each item, ONLY the eight client-editable content fields plus the item `id`. The per-item
   * `id` is forwarded (not blanked) so the service can preserve an existing server-assigned
   * ObjectId across a PUT full-replace (item-identity stability); the service honors the id
   * ONLY when it is a well-formed ObjectId, so a client still cannot inject a chosen
   * subdocument identity for a new item.
   *
   * Item values are copied verbatim (not coerced): an invalid value such as a negative
   * `quantity` is intentionally preserved so the schema validators reject it with a
   * validation error rather than the controller silently dropping or "fixing" it.
   *
   * Addresses: Security / Ownership-isolation - prevents create/update ownership drift and
   * server-managed field injection (R3 user scoping).
   */
  private buildListDto(req: Request): Partial<IShoppingList> {
    const body = (req.body ?? {}) as Partial<IShoppingList>;
    const dto: Partial<IShoppingList> = {};

    if (typeof body.name === 'string') {
      dto.name = body.name;
    }

    if (Array.isArray(body.items)) {
      dto.items = body.items.map(
        (item): IShoppingListItem => ({
          // Pass the client-supplied item id through (when it is a string) rather than
          // blanking it: on a PUT full-replace the client re-sends items that already
          // carry their server-assigned ObjectId, and the service preserves that identity
          // (only a well-formed ObjectId is honored — see ShoppingService.sanitizeItems).
          // A new item with no id (or a non-ObjectId client id such as a web
          // crypto.randomUUID()) still yields a freshly-minted server id, so a client
          // cannot inject a chosen subdocument identity.
          id: typeof item.id === 'string' ? item.id : '',
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          checked: item.checked,
          notes: item.notes,
          recipeId: item.recipeId,
          recipeName: item.recipeName,
        })
      );
    }

    return dto;
  }
}
