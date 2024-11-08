/**
 * HUMAN TASKS:
 * 1. Configure rate limiting thresholds for pantry endpoints
 * 2. Set up monitoring alerts for critical pantry operations
 * 3. Review and update storage location options periodically
 * 4. Configure backup procedures for pantry data
 * 5. Set up validation error tracking in monitoring system
 */

import { Router } from 'express'; // ^4.17.1
import { Request, Response } from 'express';
import { PantryController } from '../controllers/pantry.controller';
import { authenticate } from '../middlewares/auth.middleware';
import {
  createPantryValidation,
  updatePantryValidation,
  addItemValidation,
  updateItemValidation,
} from '../validators/pantry.validator';
import { container } from 'tsyringe';

/**
 * Initializes and configures all pantry-related routes with authentication,
 * validation, and proper error handling.
 *
 * Addresses requirements:
 * - Digital Pantry Management (1.2 Scope/Core Capabilities)
 * - Inventory Management (1.1 System Overview/Core Capabilities)
 * - Expiration Tracking (1.2 Scope/System Boundaries)
 * - Authentication Security (9.1 Authentication and Authorization/9.1.1 Authentication Flow)
 */
const router: Router = Router();
const pantryController = container.resolve(PantryController);

// Apply authentication middleware to protect all pantry routes
router.use(authenticate);

/**
 * POST /api/pantry/create
 * Creates a new pantry for the authenticated user
 * Requirement: Digital Pantry Management - Pantry creation
 */
router.post('/create', createPantryValidation, (req: Request, res: Response) => {
  pantryController.createPantry(req, res);
});

/**
 * GET /api/pantry
 * Retrieves the authenticated user's pantry data
 * Requirement: Digital Pantry Management - Pantry data retrieval
 */
router.get('/', (req: Request, res: Response) => {
  pantryController.getPantry(req, res);
});

/**
 * POST /api/pantry/items
 * Adds a new item to the user's pantry
 * Requirements:
 * - Inventory Management - Item addition
 * - Expiration Tracking - Item expiration monitoring
 */
router.post('/items', addItemValidation, (req: Request, res: Response) => {
  pantryController.addItem(req, res);
});

/**
 * DELETE /api/pantry/items/:id
 * Removes an item from the user's pantry
 * Requirement: Inventory Management - Item removal
 */
router.delete('/items/:id', (req: Request, res: Response) => {
  pantryController.removeItem(req, res);
});

/**
 * PUT /api/pantry/items/:id
 * Updates the quantity of a pantry item
 * Requirement: Inventory Management - Quantity updates
 */
router.put('/items/:id', updateItemValidation, (req: Request, res: Response) => {
  pantryController.updateItemQuantity(req, res);
});

/**
 * GET /api/pantry/expiring
 * Retrieves items that are nearing expiration
 * Requirement: Expiration Tracking - Expiration monitoring
 */
router.get('/expiring', (req: Request, res: Response) => {
  pantryController.getExpiringItems(req, res);
});

/**
 * GET /api/pantry/stats
 * Retrieves pantry statistics and metrics
 * Requirement: Digital Pantry Management - Inventory analytics
 */
router.get('/stats', (req: Request, res: Response) => {
  pantryController.getPantryStats(req, res);
});

export { router };
