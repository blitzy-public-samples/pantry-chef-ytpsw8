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

import { Router } from 'express';
import { container } from 'tsyringe';
import { ShoppingController } from '../controllers/shopping.controller';
import { authenticate } from '../middlewares/auth.middleware';
import {
  createShoppingListValidation,
  updateShoppingListValidation,
  generateShoppingListValidation,
  toggleItemValidation,
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
// never leaves a floating rejection. Express ignores a middleware's return value, making the
// no-misused-promises warning a false-positive for this safe, established registration pattern.
// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.use(authenticate);

/**
 * Each handler delegates to the resolved `ShoppingController`, forwarding `(req, res, next)`
 * so thrown errors reach the unified error middleware via the controller's `next(error)`.
 * The returned promise is intentionally discarded with the `void` operator: the controller
 * owns its own async lifecycle (it catches and forwards errors internally), so the route layer
 * must not surface a floating/misused promise to Express's void-returning handler contract.
 */

// GET /api/v1/shopping-lists/shopping-lists — list the authenticated user's shopping lists
router.get('/shopping-lists', (req, res, next) => void shoppingController.getLists(req, res, next));

// POST /api/v1/shopping-lists — create a new shopping list
router.post(
  '/',
  createShoppingListValidation,
  (req, res, next) => void shoppingController.create(req, res, next)
);

// PUT /api/v1/shopping-lists/:id — update a shopping list
router.put(
  '/:id',
  updateShoppingListValidation,
  (req, res, next) => void shoppingController.update(req, res, next)
);

// DELETE /api/v1/shopping-lists/:id — delete a shopping list
router.delete('/:id', (req, res, next) => void shoppingController.delete(req, res, next));

// POST /api/v1/shopping-lists/:id/generate — generate list items (pantry inventory exclusion)
router.post(
  '/:id/generate',
  generateShoppingListValidation,
  (req, res, next) => void shoppingController.generate(req, res, next)
);

// PATCH /api/v1/shopping-lists/:id/items/:itemId/toggle — toggle a single item's checked state
router.patch(
  '/:id/items/:itemId/toggle',
  toggleItemValidation,
  (req, res, next) => void shoppingController.toggleItem(req, res, next)
);

export default router;
