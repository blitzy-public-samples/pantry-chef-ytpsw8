/**
 * HUMAN TASKS:
 * 1. Configure rate limiting thresholds for pantry operations
 * 2. Set up monitoring alerts for critical pantry operations
 * 3. Configure validation error tracking in monitoring system
 * 4. Review and update storage location options periodically
 * 5. Set up backup procedures for pantry data
 */

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { injectable } from 'tsyringe';
import { PantryService } from '../../services/pantry.service';
import { Pantry, PantryItem } from '../../interfaces/pantry.interface';
import { logger } from '../../utils/logger';
import {
    createPantryValidation,
    updatePantryValidation,
    addItemValidation,
    updateItemValidation
} from '../validators/pantry.validator';

@injectable()
export class PantryController {
    constructor(private pantryService: PantryService) {}

    /**
     * Creates a new pantry for a user
     * Addresses requirement: Digital Pantry Management - User pantry creation
     */
    public async createPantry(req: Request, res: Response): Promise<Response> {
        try {
            // Validate request data
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                logger.warn('Pantry creation validation failed', {
                    errors: errors.array(),
                    userId: req.user?.id
                });
                return res.status(400).json({ errors: errors.array() });
            }

            const { name } = req.body;
            const userId = req.user?.id;

            // Create pantry using service
            const pantry = await this.pantryService.createPantry(userId, name);

            logger.info('Pantry created successfully', {
                userId,
                pantryId: pantry.id,
                timestamp: new Date().toISOString()
            });

            return res.status(201).json(pantry);
        } catch (error) {
            logger.error('Pantry creation failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: req.user?.id,
                timestamp: new Date().toISOString()
            });
            return res.status(500).json({ 
                error: 'Failed to create pantry',
                details: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }

    /**
     * Retrieves a user's pantry data
     * Addresses requirement: Digital Pantry Management - Pantry data retrieval
     */
    public async getPantry(req: Request, res: Response): Promise<Response> {
        try {
            const userId = req.user?.id;

            // Retrieve pantry data using service
            const pantry = await this.pantryService.getPantry(userId);

            logger.info('Pantry retrieved successfully', {
                userId,
                pantryId: pantry.id,
                timestamp: new Date().toISOString()
            });

            return res.status(200).json(pantry);
        } catch (error) {
            logger.error('Pantry retrieval failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: req.user?.id,
                timestamp: new Date().toISOString()
            });

            if (error instanceof Error && error.message === 'Pantry not found') {
                return res.status(404).json({ error: 'Pantry not found' });
            }

            return res.status(500).json({ 
                error: 'Failed to retrieve pantry',
                details: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }

    /**
     * Adds a new item to the pantry
     * Addresses requirements:
     * - Inventory Management - Item addition
     * - Expiration Tracking - Item expiration monitoring
     */
    public async addItem(req: Request, res: Response): Promise<Response> {
        try {
            // Validate request data
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                logger.warn('Add item validation failed', {
                    errors: errors.array(),
                    userId: req.user?.id
                });
                return res.status(400).json({ errors: errors.array() });
            }

            const userId = req.user?.id;
            const item: PantryItem = {
                ingredientId: req.body.ingredientId,
                quantity: req.body.quantity,
                unit: req.body.unit,
                location: req.body.location,
                purchaseDate: new Date(),
                expirationDate: new Date(req.body.expirationDate),
                notes: req.body.notes || ''
            };

            // Add item using service
            await this.pantryService.addItem(userId, item);

            logger.info('Item added to pantry successfully', {
                userId,
                itemId: item.ingredientId,
                timestamp: new Date().toISOString()
            });

            return res.status(201).json({ message: 'Item added successfully' });
        } catch (error) {
            logger.error('Add item failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: req.user?.id,
                timestamp: new Date().toISOString()
            });
            return res.status(500).json({ 
                error: 'Failed to add item',
                details: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }

    /**
     * Removes an item from the pantry
     * Addresses requirement: Inventory Management - Item removal
     */
    public async removeItem(req: Request, res: Response): Promise<Response> {
        try {
            const userId = req.user?.id;
            const { itemId } = req.params;

            if (!itemId) {
                return res.status(400).json({ error: 'Item ID is required' });
            }

            // Remove item using service
            await this.pantryService.removeItem(userId, itemId);

            logger.info('Item removed from pantry successfully', {
                userId,
                itemId,
                timestamp: new Date().toISOString()
            });

            return res.status(200).json({ message: 'Item removed successfully' });
        } catch (error) {
            logger.error('Remove item failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: req.user?.id,
                timestamp: new Date().toISOString()
            });
            return res.status(500).json({ 
                error: 'Failed to remove item',
                details: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }

    /**
     * Updates the quantity of a pantry item
     * Addresses requirement: Inventory Management - Quantity updates
     */
    public async updateItemQuantity(req: Request, res: Response): Promise<Response> {
        try {
            // Validate request data
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                logger.warn('Update quantity validation failed', {
                    errors: errors.array(),
                    userId: req.user?.id
                });
                return res.status(400).json({ errors: errors.array() });
            }

            const userId = req.user?.id;
            const { itemId } = req.params;
            const { quantity } = req.body;

            // Update quantity using service
            await this.pantryService.updateItemQuantity(userId, itemId, quantity);

            logger.info('Item quantity updated successfully', {
                userId,
                itemId,
                quantity,
                timestamp: new Date().toISOString()
            });

            return res.status(200).json({ message: 'Quantity updated successfully' });
        } catch (error) {
            logger.error('Update quantity failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: req.user?.id,
                timestamp: new Date().toISOString()
            });
            return res.status(500).json({ 
                error: 'Failed to update quantity',
                details: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }

    /**
     * Retrieves items nearing expiration
     * Addresses requirement: Expiration Tracking - Expiration monitoring
     */
    public async getExpiringItems(req: Request, res: Response): Promise<Response> {
        try {
            const userId = req.user?.id;

            // Get expiring items using service
            const expiringItems = await this.pantryService.checkExpiringItems(userId);

            logger.info('Expiring items retrieved successfully', {
                userId,
                itemCount: expiringItems.length,
                timestamp: new Date().toISOString()
            });

            return res.status(200).json(expiringItems);
        } catch (error) {
            logger.error('Get expiring items failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: req.user?.id,
                timestamp: new Date().toISOString()
            });
            return res.status(500).json({ 
                error: 'Failed to retrieve expiring items',
                details: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }

    /**
     * Retrieves pantry statistics and metrics
     * Addresses requirement: Digital Pantry Management - Inventory analytics
     */
    public async getPantryStats(req: Request, res: Response): Promise<Response> {
        try {
            const userId = req.user?.id;

            // Get pantry stats using service
            const stats = await this.pantryService.getPantryStats(userId);

            logger.info('Pantry stats retrieved successfully', {
                userId,
                timestamp: new Date().toISOString()
            });

            return res.status(200).json(stats);
        } catch (error) {
            logger.error('Get pantry stats failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: req.user?.id,
                timestamp: new Date().toISOString()
            });
            return res.status(500).json({ 
                error: 'Failed to retrieve pantry statistics',
                details: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }
}