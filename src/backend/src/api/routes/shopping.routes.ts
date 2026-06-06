/**
 * HUMAN TASKS:
 * 1. Configure rate-limiting thresholds for the shopping-list mutation endpoints
 *    (create / update / generate / toggle) in line with the platform abuse-prevention policy.
 * 2. Set up monitoring alerts for shopping-endpoint latency against the sub-200ms API budget (NFR-P8).
 * 3. Review the verbatim route contract (notably the literal `GET /shopping-lists` sub-path) with
 *    the web and iOS client owners so cross-device sync stays contract-consistent.
 * 4. Confirm ownership-isolation (404) alerting covers the shopping routes to surface
 *    potential list-enumeration attempts.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { ShoppingController } from '../controllers/shopping.controller';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth.middleware';
import {
  createShoppingListValidation,
  updateShoppingListValidation,
  generateShoppingListValidation,
  toggleItemValidation,
  deleteShoppingListValidation,
} from '../validators/shopping.validator';

/**
 * Initializes and configures the server-authoritative shopping-list routes
 * (Feature 1 - Shopping List Backend Route and Cross-Device Sync).
 *
 * Mirrors the functional, module-level pattern of `pantry.routes.ts`: a single module-scoped
 * `Router`, the `ShoppingController` resolved through the tsyringe DI container, and a single
 * global `authenticate` guard applied ahead of every route registration so all shopping-list
 * operations are scoped to the authenticated user (`req.user`).
 *
 * The six routes below are mounted at `/api/v1/shopping-lists` (in `routes/index.ts`) and
 * reproduce the user-specified route contract verbatim.
 *
 * Addresses requirements:
 * - Shopping List Management (server-authoritative, user-scoped lists with cross-device sync)
 * - Authentication Security (9.1 Authentication and Authorization) - all routes gated by `authenticate`
 */
const router = Router();
const shoppingController = container.resolve(ShoppingController);

// Apply authentication middleware to protect all shopping list routes.
// `authenticate` is an async middleware that fully manages its own lifecycle: it calls
// `next()` on success and `next(error)` on every failure path (see auth.middleware.ts), so it
// never leaves a floating rejection. It is wrapped in a synchronous, void-returning middleware
// so its promise is explicitly discarded — this satisfies Express's void-returning
// RequestHandler contract (the async function's `Promise<void>` return does not match the
// `router.use` overload directly) and avoids the no-misused-promises lint without a suppression.
router.use((req: Request, res: Response, next: NextFunction): void => {
  // `authenticate` is typed against `AuthenticatedRequest` (Request + the optional `user`/
  // `tokenPayload` it populates). A plain `Request` is not structurally assignable to that
  // type, and the wrapper param must stay `Request` to satisfy `router.use`'s RequestHandler
  // contract (contravariant req position), so the request is upcast at the call site.
  void authenticate(req as AuthenticatedRequest, res, next);
});

/**
 * Each handler delegates to the resolved `ShoppingController`, forwarding `(req, res, next)`
 * so thrown errors reach the unified error middleware via the controller's `next(error)`.
 * The returned promise is intentionally discarded with the `void` operator: the controller
 * owns its own async lifecycle (it catches and forwards errors internally), so the route layer
 * must not surface a floating/misused promise to Express's void-returning handler contract.
 */

// GET /api/v1/shopping-lists/shopping-lists — list the authenticated user's shopping lists.
// The user-specified route contract defines the collection GET at the router-relative
// sub-path '/shopping-lists' (verbatim, R4). Because routes/index.ts mounts this router at
// '/api/v1/shopping-lists', the intentional effective URL is the DOUBLED segment
// GET /api/v1/shopping-lists/shopping-lists. The web service, the e2e suite, and the iOS
// client all target this exact doubled path so cross-device sync stays contract-consistent (R8).
router.get(
  '/shopping-lists',
  (req: Request, res: Response, next: NextFunction) =>
    void shoppingController.getLists(req, res, next)
);

// POST /api/v1/shopping-lists — create a new shopping list
router.post(
  '/',
  createShoppingListValidation,
  (req: Request, res: Response, next: NextFunction) =>
    void shoppingController.create(req, res, next)
);

// PUT /api/v1/shopping-lists/:id — update a shopping list
router.put(
  '/:id',
  updateShoppingListValidation,
  (req: Request, res: Response, next: NextFunction) =>
    void shoppingController.update(req, res, next)
);

// DELETE /api/v1/shopping-lists/:id — delete a shopping list.
// The delete validator enforces a well-formed ObjectId on :id so an invalid id is rejected
// with a 400 (matching the other mutating routes) instead of reaching Mongoose as a CastError.
router.delete(
  '/:id',
  deleteShoppingListValidation,
  (req: Request, res: Response, next: NextFunction) =>
    void shoppingController.delete(req, res, next)
);

// POST /api/v1/shopping-lists/:id/generate — generate list items (pantry inventory exclusion)
router.post(
  '/:id/generate',
  generateShoppingListValidation,
  (req: Request, res: Response, next: NextFunction) =>
    void shoppingController.generate(req, res, next)
);

// PATCH /api/v1/shopping-lists/:id/items/:itemId/toggle — toggle a single item's checked state
router.patch(
  '/:id/items/:itemId/toggle',
  toggleItemValidation,
  (req: Request, res: Response, next: NextFunction) =>
    void shoppingController.toggleItem(req, res, next)
);

export default router;
