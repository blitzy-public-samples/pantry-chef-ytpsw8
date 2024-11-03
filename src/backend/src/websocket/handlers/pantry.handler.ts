/**
 * HUMAN TASKS:
 * 1. Configure WebSocket event names in environment variables
 * 2. Set up monitoring for WebSocket connections in CloudWatch
 * 3. Configure room-based scaling limits for WebSocket connections
 * 4. Verify WebSocket security settings and token validation
 */

import { Socket } from 'socket.io'; // ^4.5.0
import { Pantry, PantryItem } from '../../interfaces/pantry.interface';
import { PantryService } from '../../services/pantry.service';
import { logger } from '../../utils/logger';

/**
 * Handler class for managing real-time pantry operations through WebSocket connections
 * Addresses requirements:
 * - Real-time WebSocket Connections - Live updates
 * - Digital Pantry Management - Inventory tracking
 * - Inventory Management - Core microservice functionality
 */
export class PantryWebSocketHandler {
    constructor(private pantryService: PantryService) {}

    /**
     * Handles initial pantry synchronization when client connects
     * Addresses requirement: Real-time WebSocket Connections - Initial sync
     */
    public async handlePantrySync(socket: Socket, userId: string): Promise<void> {
        try {
            logger.info('Starting pantry sync', {
                userId,
                socketId: socket.id,
                timestamp: new Date().toISOString()
            });

            // Join user-specific room for targeted updates
            socket.join(`pantry:${userId}`);

            // Get user's pantry data
            const pantry: Pantry = await this.pantryService.getPantry(userId);

            // Check for expiring items
            const expiringItems = await this.pantryService.checkExpiringItems(userId);

            // Emit pantry data to connected client
            socket.emit('pantry:synced', {
                pantry,
                timestamp: new Date().toISOString()
            });

            // Emit expiring items alert if any
            if (expiringItems.length > 0) {
                socket.emit('pantry:expiring-items', {
                    items: expiringItems,
                    timestamp: new Date().toISOString()
                });
            }

            logger.info('Pantry sync completed', {
                userId,
                socketId: socket.id,
                itemCount: pantry.items.length,
                expiringCount: expiringItems.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Pantry sync failed', {
                userId,
                socketId: socket.id,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });

            socket.emit('pantry:sync-error', {
                message: 'Failed to synchronize pantry data',
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Handles real-time pantry item updates
     * Addresses requirements:
     * - Real-time WebSocket Connections - Live inventory updates
     * - Digital Pantry Management - Item tracking
     */
    public async handleItemUpdate(
        socket: Socket,
        userId: string,
        item: PantryItem,
        action: 'add' | 'remove'
    ): Promise<void> {
        try {
            logger.info('Processing pantry item update', {
                userId,
                socketId: socket.id,
                action,
                itemId: item.ingredientId,
                timestamp: new Date().toISOString()
            });

            // Process update based on action type
            if (action === 'add') {
                await this.pantryService.addItem(userId, item);
            } else {
                await this.pantryService.removeItem(userId, item.ingredientId);
            }

            // Broadcast update to all connected clients in room
            socket.to(`pantry:${userId}`).emit('pantry:item-updated', {
                action,
                item,
                timestamp: new Date().toISOString()
            });

            logger.info('Pantry item update completed', {
                userId,
                socketId: socket.id,
                action,
                itemId: item.ingredientId,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Pantry item update failed', {
                userId,
                socketId: socket.id,
                action,
                item,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });

            socket.emit('pantry:update-error', {
                message: 'Failed to update pantry item',
                action,
                itemId: item.ingredientId,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Handles real-time updates to item quantities
     * Addresses requirements:
     * - Real-time WebSocket Connections - Quantity updates
     * - Inventory Management - Stock tracking
     */
    public async handleQuantityUpdate(
        socket: Socket,
        userId: string,
        itemId: string,
        quantity: number
    ): Promise<void> {
        try {
            logger.info('Processing quantity update', {
                userId,
                socketId: socket.id,
                itemId,
                quantity,
                timestamp: new Date().toISOString()
            });

            // Validate quantity value
            if (quantity < 0) {
                throw new Error('Invalid quantity value');
            }

            // Update item quantity
            await this.pantryService.updateItemQuantity(userId, itemId, quantity);

            // Broadcast quantity change to connected clients in room
            socket.to(`pantry:${userId}`).emit('pantry:quantity-updated', {
                itemId,
                quantity,
                timestamp: new Date().toISOString()
            });

            logger.info('Quantity update completed', {
                userId,
                socketId: socket.id,
                itemId,
                quantity,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Quantity update failed', {
                userId,
                socketId: socket.id,
                itemId,
                quantity,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });

            socket.emit('pantry:quantity-error', {
                message: 'Failed to update item quantity',
                itemId,
                timestamp: new Date().toISOString()
            });
        }
    }
}