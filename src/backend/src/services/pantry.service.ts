// @version mongoose ^6.0.0

/**
 * HUMAN TASKS:
 * 1. Configure expiration notification thresholds in environment variables:
 *    - EXPIRATION_WARNING_DAYS=7
 *    - LOW_STOCK_THRESHOLD=2
 * 2. Set up monitoring for pantry operations in CloudWatch
 * 3. Configure cache TTL settings for pantry data
 * 4. Verify storage location enum values match frontend options
 * 5. Set up alerts for critical pantry operations failures
 */

import { injectable } from 'tsyringe';
import { Pantry, PantryItem, PantryStats, StorageLocation } from '../interfaces/pantry.interface';
import { PantryModel } from '../models/pantry.model';
import { CacheService } from './cache.service';
import { QueueService } from './queue.service';
import { NotificationService } from './notification.service';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

@injectable()
export class PantryService {
  private readonly CACHE_PREFIX = 'pantry:';
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly EXPIRATION_WARNING_DAYS = Number(process.env.EXPIRATION_WARNING_DAYS) || 7;

  constructor(
    private cacheService: CacheService,
    private queueService: QueueService,
    private notificationService: NotificationService
  ) {}

  /**
   * Creates a new pantry for a user
   * Addresses requirement: Digital Pantry Management - User pantry creation
   */
  public async createPantry(userId: string, name: string): Promise<Pantry> {
    try {
      // Validate input parameters
      if (!userId || !name) {
        throw new AppError('Invalid pantry creation parameters', 400, 'INVALID_PARAMETERS');
      }

      // Create pantry document
      const pantry = await PantryModel.create({
        userId,
        name,
        items: [],
        locations: Object.values(StorageLocation),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Cache the new pantry data
      await this.cacheService.set(`${this.CACHE_PREFIX}${userId}`, pantry, this.CACHE_TTL);

      logger.info('Pantry created successfully', {
        userId,
        pantryId: pantry.id,
        timestamp: new Date().toISOString(),
      });

      return pantry;
    } catch (error: any) {
      logger.error('Failed to create pantry', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Retrieves a user's pantry data
   * Addresses requirement: Digital Pantry Management - Pantry data retrieval
   */
  public async getPantry(userId: string): Promise<Pantry> {
    try {
      // Check cache first
      const cachedPantry = await this.cacheService.get<Pantry>(`${this.CACHE_PREFIX}${userId}`);

      if (cachedPantry) {
        return cachedPantry;
      }

      // Fetch from database if not in cache
      const pantry = await PantryModel.findOne({ userId });
      if (!pantry) {
        throw new AppError('Pantry not found', 404, 'PANTRY_NOT_FOUND');
      }

      // Update cache
      await this.cacheService.set(`${this.CACHE_PREFIX}${userId}`, pantry, this.CACHE_TTL);

      return pantry;
    } catch (error: any) {
      logger.error('Failed to retrieve pantry', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Adds a new item to the pantry
   * Addresses requirements:
   * - Inventory Management - Item addition
   * - Expiration Tracking - Item expiration monitoring
   */
  public async addItem(userId: string, item: PantryItem): Promise<void> {
    try {
      // Validate item data
      this.validatePantryItem(item);

      // Add item to pantry
      const pantry = await this.getPantry(userId);
      await pantry.addItem(item);

      // Update cache
      await this.cacheService.delete(`${this.CACHE_PREFIX}${userId}`);

      // Queue expiration check
      await QueueService.publishToQueue('expiration-check', {
        userId,
        itemId: item.ingredientId,
        expirationDate: item.expirationDate,
      });

      // Send real-time update
      await this.notificationService.sendWebSocketNotification(userId, {
        type: 'PANTRY_UPDATED',
        action: 'ITEM_ADDED',
        item,
      });

      logger.info('Item added to pantry successfully', {
        userId,
        itemId: item.ingredientId,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to add item to pantry', {
        userId,
        item,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Removes an item from the pantry
   * Addresses requirement: Inventory Management - Item removal
   */
  public async removeItem(userId: string, itemId: string): Promise<void> {
    try {
      // Remove item from pantry
      const pantry = await this.getPantry(userId);
      await pantry.removeItem(itemId);

      // Update cache
      await this.cacheService.delete(`${this.CACHE_PREFIX}${userId}`);

      // Send real-time update
      await this.notificationService.sendWebSocketNotification(userId, {
        type: 'PANTRY_UPDATED',
        action: 'ITEM_REMOVED',
        itemId,
      });

      logger.info('Item removed from pantry successfully', {
        userId,
        itemId,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to remove item from pantry', {
        userId,
        itemId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Updates the quantity of a pantry item
   * Addresses requirement: Inventory Management - Quantity updates
   */
  public async updateItemQuantity(userId: string, itemId: string, quantity: number): Promise<void> {
    try {
      // Validate quantity
      if (quantity < 0) {
        throw new AppError('Invalid quantity value', 400, 'INVALID_QUANTITY');
      }

      // Update item quantity
      const pantry = await this.getPantry(userId);
      await pantry.updateItemQuantity(itemId, quantity);

      // Update cache
      await this.cacheService.delete(`${this.CACHE_PREFIX}${userId}`);

      // Send real-time update
      await this.notificationService.sendWebSocketNotification(userId, {
        type: 'PANTRY_UPDATED',
        action: 'QUANTITY_UPDATED',
        itemId,
        quantity,
      });

      logger.info('Item quantity updated successfully', {
        userId,
        itemId,
        quantity,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to update item quantity', {
        userId,
        itemId,
        quantity,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Checks for items nearing expiration
   * Addresses requirement: Expiration Tracking - Expiration monitoring
   */
  public async checkExpiringItems(userId: string): Promise<PantryItem[]> {
    try {
      const pantry = await this.getPantry(userId);
      const now = new Date();
      const warningThreshold = new Date(
        now.getTime() + this.EXPIRATION_WARNING_DAYS * 24 * 60 * 60 * 1000
      );

      // Filter items nearing expiration
      const expiringItems = pantry.items.filter(
        (item) => item.expirationDate <= warningThreshold && item.expirationDate > now
      );

      // Send notifications for expiring items
      if (expiringItems.length > 0) {
        await this.notificationService.checkExpiringItems(userId);
      }

      logger.info('Expiring items check completed', {
        userId,
        expiringCount: expiringItems.length,
        timestamp: new Date().toISOString(),
      });

      return expiringItems;
    } catch (error: any) {
      logger.error('Failed to check expiring items', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Retrieves statistics about pantry contents
   * Addresses requirement: Digital Pantry Management - Inventory analytics
   */
  public async getPantryStats(userId: string): Promise<PantryStats> {
    try {
      const pantry = await this.getPantry(userId);
      const stats = await pantry.getStats();

      logger.info('Pantry stats retrieved successfully', {
        userId,
        totalItems: stats.totalItems,
        timestamp: new Date().toISOString(),
      });

      return stats;
    } catch (error: any) {
      logger.error('Failed to retrieve pantry stats', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Validates pantry item data
   * Private helper method for item validation
   */
  private validatePantryItem(item: PantryItem): void {
    if (
      !item.ingredientId ||
      !item.quantity ||
      !item.unit ||
      !item.location ||
      !item.expirationDate
    ) {
      throw new AppError('Invalid pantry item data', 400, 'INVALID_ITEM_DATA', { item });
    }

    if (!Object.values(StorageLocation).includes(item.location)) {
      throw new AppError('Invalid storage location', 400, 'INVALID_LOCATION', {
        location: item.location,
      });
    }

    if (new Date(item.expirationDate) <= new Date()) {
      throw new AppError('Invalid expiration date', 400, 'INVALID_EXPIRATION_DATE', {
        expirationDate: item.expirationDate,
      });
    }
  }
}
