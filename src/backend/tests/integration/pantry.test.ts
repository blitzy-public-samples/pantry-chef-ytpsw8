// @version jest ^29.0.0
// @version mongodb-memory-server ^8.0.0
// @version supertest ^6.0.0

/**
 * HUMAN TASKS:
 * 1. Configure test environment variables in .env.test
 * 2. Set up test data seeding scripts for consistent test data
 * 3. Configure MongoDB memory server settings for optimal test performance
 * 4. Set up test coverage reporting thresholds
 * 5. Configure test retry policies for flaky tests
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { PantryService } from '../../src/services/pantry.service';
import { CacheService } from '../../src/services/cache.service';
import { PantryModel } from '../../src/models/pantry.model';
import { Pantry, PantryItem, StorageLocation } from '../../src/interfaces/pantry.interface';
import { QueueService } from '../../src/services/queue.service';
import { NotificationService } from '../../src/services/notification.service';

describe('Pantry Integration Tests', () => {
    let mongoServer: MongoMemoryServer;
    let pantryService: PantryService;
    let cacheService: CacheService;
    let queueService: QueueService;
    let notificationService: NotificationService;

    // Test data
    const testUserId = 'test-user-123';
    const testPantryName = 'Test Pantry';
    
    const testPantryItem: PantryItem = {
        ingredientId: 'test-ingredient-123',
        quantity: 2,
        unit: 'units',
        location: StorageLocation.PANTRY,
        purchaseDate: new Date(),
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        notes: 'Test notes'
    };

    beforeAll(async () => {
        // Addresses requirement: Test environment setup
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        
        await mongoose.connect(mongoUri);
        
        // Initialize services
        cacheService = new CacheService();
        queueService = new QueueService();
        notificationService = new NotificationService();
        pantryService = new PantryService(cacheService, queueService, notificationService);
    });

    afterAll(async () => {
        // Cleanup test environment
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        // Clear test data before each test
        await PantryModel.deleteMany({});
        await cacheService.clear('pantry:*');
        jest.clearAllMocks();
    });

    describe('createPantry', () => {
        // Addresses requirement: Digital Pantry Management - User pantry creation
        it('should create a new pantry successfully', async () => {
            const pantry = await pantryService.createPantry(testUserId, testPantryName);

            expect(pantry).toBeDefined();
            expect(pantry.userId).toBe(testUserId);
            expect(pantry.name).toBe(testPantryName);
            expect(pantry.items).toHaveLength(0);
            expect(pantry.locations).toEqual(Object.values(StorageLocation));

            // Verify cache update
            const cachedPantry = await cacheService.get<Pantry>(`pantry:${testUserId}`);
            expect(cachedPantry).toBeDefined();
            expect(cachedPantry?.id).toBe(pantry.id);
        });

        it('should throw error when creating pantry with invalid data', async () => {
            await expect(pantryService.createPantry('', '')).rejects.toThrow();
        });
    });

    describe('getPantry', () => {
        // Addresses requirement: Digital Pantry Management - Pantry data retrieval
        it('should retrieve pantry from cache if available', async () => {
            const pantry = await pantryService.createPantry(testUserId, testPantryName);
            const retrievedPantry = await pantryService.getPantry(testUserId);

            expect(retrievedPantry).toBeDefined();
            expect(retrievedPantry.id).toBe(pantry.id);
        });

        it('should retrieve pantry from database if not in cache', async () => {
            const pantry = await pantryService.createPantry(testUserId, testPantryName);
            await cacheService.clear('pantry:*');

            const retrievedPantry = await pantryService.getPantry(testUserId);
            expect(retrievedPantry).toBeDefined();
            expect(retrievedPantry.id).toBe(pantry.id);
        });

        it('should throw error when pantry not found', async () => {
            await expect(pantryService.getPantry('non-existent')).rejects.toThrow();
        });
    });

    describe('addItem', () => {
        // Addresses requirements: Inventory Management - Item addition
        it('should add item to pantry successfully', async () => {
            await pantryService.createPantry(testUserId, testPantryName);
            await pantryService.addItem(testUserId, testPantryItem);

            const pantry = await pantryService.getPantry(testUserId);
            expect(pantry.items).toHaveLength(1);
            expect(pantry.items[0].ingredientId).toBe(testPantryItem.ingredientId);
            expect(pantry.items[0].quantity).toBe(testPantryItem.quantity);
        });

        it('should update existing item quantity', async () => {
            await pantryService.createPantry(testUserId, testPantryName);
            await pantryService.addItem(testUserId, testPantryItem);

            const updatedItem = { ...testPantryItem, quantity: 5 };
            await pantryService.addItem(testUserId, updatedItem);

            const pantry = await pantryService.getPantry(testUserId);
            expect(pantry.items).toHaveLength(1);
            expect(pantry.items[0].quantity).toBe(5);
        });

        it('should throw error when adding item with invalid data', async () => {
            await pantryService.createPantry(testUserId, testPantryName);
            const invalidItem = { ...testPantryItem, quantity: -1 };
            
            await expect(pantryService.addItem(testUserId, invalidItem)).rejects.toThrow();
        });
    });

    describe('removeItem', () => {
        // Addresses requirement: Inventory Management - Item removal
        it('should remove item from pantry successfully', async () => {
            await pantryService.createPantry(testUserId, testPantryName);
            await pantryService.addItem(testUserId, testPantryItem);

            await pantryService.removeItem(testUserId, testPantryItem.ingredientId);

            const pantry = await pantryService.getPantry(testUserId);
            expect(pantry.items).toHaveLength(0);
        });

        it('should not throw error when removing non-existent item', async () => {
            await pantryService.createPantry(testUserId, testPantryName);
            
            await expect(pantryService.removeItem(testUserId, 'non-existent')).resolves.not.toThrow();
        });
    });

    describe('updateItemQuantity', () => {
        // Addresses requirement: Inventory Management - Quantity updates
        it('should update item quantity successfully', async () => {
            await pantryService.createPantry(testUserId, testPantryName);
            await pantryService.addItem(testUserId, testPantryItem);

            const newQuantity = 10;
            await pantryService.updateItemQuantity(testUserId, testPantryItem.ingredientId, newQuantity);

            const pantry = await pantryService.getPantry(testUserId);
            expect(pantry.items[0].quantity).toBe(newQuantity);
        });

        it('should throw error when updating with invalid quantity', async () => {
            await pantryService.createPantry(testUserId, testPantryName);
            await pantryService.addItem(testUserId, testPantryItem);

            await expect(
                pantryService.updateItemQuantity(testUserId, testPantryItem.ingredientId, -1)
            ).rejects.toThrow();
        });
    });

    describe('checkExpiringItems', () => {
        // Addresses requirement: Expiration Tracking - Expiration monitoring
        it('should detect items nearing expiration', async () => {
            await pantryService.createPantry(testUserId, testPantryName);
            
            const expiringItem = {
                ...testPantryItem,
                expirationDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
            };
            await pantryService.addItem(testUserId, expiringItem);

            const expiringItems = await pantryService.checkExpiringItems(testUserId);
            expect(expiringItems).toHaveLength(1);
            expect(expiringItems[0].ingredientId).toBe(expiringItem.ingredientId);
        });

        it('should not include already expired items', async () => {
            await pantryService.createPantry(testUserId, testPantryName);
            
            const expiredItem = {
                ...testPantryItem,
                expirationDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
            };
            await pantryService.addItem(testUserId, expiredItem);

            const expiringItems = await pantryService.checkExpiringItems(testUserId);
            expect(expiringItems).toHaveLength(0);
        });
    });

    describe('getPantryStats', () => {
        // Addresses requirement: Digital Pantry Management - Inventory analytics
        it('should calculate pantry statistics correctly', async () => {
            await pantryService.createPantry(testUserId, testPantryName);
            await pantryService.addItem(testUserId, testPantryItem);

            const stats = await pantryService.getPantryStats(testUserId);
            
            expect(stats.totalItems).toBe(1);
            expect(stats.itemsByLocation.get(StorageLocation.PANTRY)).toBe(1);
        });

        it('should return zero counts for empty pantry', async () => {
            await pantryService.createPantry(testUserId, testPantryName);

            const stats = await pantryService.getPantryStats(testUserId);
            
            expect(stats.totalItems).toBe(0);
            expect(stats.expiringItems).toBe(0);
            expect(stats.lowStockItems).toBe(0);
        });
    });
});