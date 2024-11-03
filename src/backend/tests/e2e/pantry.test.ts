// @version jest ^27.0.0
// @version supertest ^6.1.3
// @version mongodb-memory-server ^8.0.0

/**
 * HUMAN TASKS:
 * 1. Configure test environment variables in CI/CD pipeline
 * 2. Set up test data seeding scripts for consistent test scenarios
 * 3. Configure test coverage thresholds in jest.config.js
 * 4. Set up automated test reporting in CI pipeline
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../../src/app';
import { Pantry, PantryItem, StorageLocation } from '../../src/interfaces/pantry.interface';
import { PantryService } from '../../src/services/pantry.service';

describe('Pantry API E2E Tests', () => {
    let mongoServer: MongoMemoryServer;
    let testUserId: string;
    let testPantryId: string;
    let testItemId: string;
    let authToken: string;

    // Test data
    const testPantryName = 'Test Pantry';
    const testItem: PantryItem = {
        ingredientId: 'test-ingredient-1',
        quantity: 2,
        unit: 'pieces',
        location: StorageLocation.PANTRY,
        purchaseDate: new Date(),
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        notes: 'Test notes'
    };

    beforeAll(async () => {
        // Start in-memory MongoDB server
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        
        // Connect to test database
        await mongoose.connect(mongoUri);

        // Initialize test user and get auth token
        const userResponse = await request(app)
            .post('/api/v1/auth/register')
            .send({
                email: 'test@example.com',
                password: 'TestPassword123!'
            });
        
        testUserId = userResponse.body.userId;
        authToken = userResponse.body.token;
    });

    afterAll(async () => {
        // Cleanup
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        // Create fresh test pantry before each test
        const pantryResponse = await request(app)
            .post('/api/v1/pantry')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ name: testPantryName });

        testPantryId = pantryResponse.body.id;
    });

    afterEach(async () => {
        // Clear test data after each test
        await mongoose.connection.dropDatabase();
    });

    /**
     * Tests retrieving user's pantry
     * Addresses requirement: Digital Pantry Management - Pantry data retrieval
     */
    describe('GET /api/v1/pantry', () => {
        it('should retrieve user\'s pantry successfully', async () => {
            const response = await request(app)
                .get('/api/v1/pantry')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id', testPantryId);
            expect(response.body).toHaveProperty('name', testPantryName);
            expect(response.body).toHaveProperty('userId', testUserId);
            expect(response.body).toHaveProperty('items');
            expect(response.body).toHaveProperty('locations');
            expect(Array.isArray(response.body.items)).toBe(true);
            expect(Array.isArray(response.body.locations)).toBe(true);
            expect(response.body.locations).toEqual(expect.arrayContaining(Object.values(StorageLocation)));
        });

        it('should return 401 for unauthorized access', async () => {
            const response = await request(app)
                .get('/api/v1/pantry');

            expect(response.status).toBe(401);
        });
    });

    /**
     * Tests adding new items to pantry
     * Addresses requirements:
     * - Inventory Management - Item addition
     * - Digital Pantry Management - Item tracking
     */
    describe('POST /api/v1/pantry/items', () => {
        it('should add new item to pantry successfully', async () => {
            const response = await request(app)
                .post('/api/v1/pantry/items')
                .set('Authorization', `Bearer ${authToken}`)
                .send(testItem);

            expect(response.status).toBe(201);
            testItemId = response.body.itemId;

            // Verify item was added
            const pantryResponse = await request(app)
                .get('/api/v1/pantry')
                .set('Authorization', `Bearer ${authToken}`);

            const addedItem = pantryResponse.body.items.find(
                (item: PantryItem) => item.ingredientId === testItem.ingredientId
            );

            expect(addedItem).toBeDefined();
            expect(addedItem.quantity).toBe(testItem.quantity);
            expect(addedItem.location).toBe(testItem.location);
            expect(new Date(addedItem.expirationDate)).toEqual(testItem.expirationDate);
        });

        it('should validate item data before adding', async () => {
            const invalidItem = { ...testItem, quantity: -1 };
            const response = await request(app)
                .post('/api/v1/pantry/items')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidItem);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });

    /**
     * Tests removing items from pantry
     * Addresses requirement: Inventory Management - Item removal
     */
    describe('DELETE /api/v1/pantry/items/:id', () => {
        beforeEach(async () => {
            // Add test item before each test
            const response = await request(app)
                .post('/api/v1/pantry/items')
                .set('Authorization', `Bearer ${authToken}`)
                .send(testItem);
            testItemId = response.body.itemId;
        });

        it('should remove item from pantry successfully', async () => {
            const response = await request(app)
                .delete(`/api/v1/pantry/items/${testItemId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);

            // Verify item was removed
            const pantryResponse = await request(app)
                .get('/api/v1/pantry')
                .set('Authorization', `Bearer ${authToken}`);

            const removedItem = pantryResponse.body.items.find(
                (item: PantryItem) => item.ingredientId === testItem.ingredientId
            );

            expect(removedItem).toBeUndefined();
        });

        it('should return 404 for non-existent item', async () => {
            const response = await request(app)
                .delete('/api/v1/pantry/items/non-existent-id')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(404);
        });
    });

    /**
     * Tests updating item quantity
     * Addresses requirement: Inventory Management - Quantity updates
     */
    describe('PUT /api/v1/pantry/items/:id/quantity', () => {
        beforeEach(async () => {
            // Add test item before each test
            const response = await request(app)
                .post('/api/v1/pantry/items')
                .set('Authorization', `Bearer ${authToken}`)
                .send(testItem);
            testItemId = response.body.itemId;
        });

        it('should update item quantity successfully', async () => {
            const newQuantity = 5;
            const response = await request(app)
                .put(`/api/v1/pantry/items/${testItemId}/quantity`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ quantity: newQuantity });

            expect(response.status).toBe(200);

            // Verify quantity was updated
            const pantryResponse = await request(app)
                .get('/api/v1/pantry')
                .set('Authorization', `Bearer ${authToken}`);

            const updatedItem = pantryResponse.body.items.find(
                (item: PantryItem) => item.ingredientId === testItem.ingredientId
            );

            expect(updatedItem.quantity).toBe(newQuantity);
        });

        it('should validate quantity value', async () => {
            const response = await request(app)
                .put(`/api/v1/pantry/items/${testItemId}/quantity`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ quantity: -1 });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });

    /**
     * Tests retrieving pantry statistics
     * Addresses requirements:
     * - Digital Pantry Management - Inventory analytics
     * - Expiration Tracking - Expiration monitoring
     */
    describe('GET /api/v1/pantry/stats', () => {
        beforeEach(async () => {
            // Add multiple test items with different categories and locations
            const items = [
                testItem,
                {
                    ...testItem,
                    ingredientId: 'test-ingredient-2',
                    location: StorageLocation.REFRIGERATOR,
                    expirationDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
                },
                {
                    ...testItem,
                    ingredientId: 'test-ingredient-3',
                    location: StorageLocation.FREEZER,
                    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
                }
            ];

            for (const item of items) {
                await request(app)
                    .post('/api/v1/pantry/items')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(item);
            }
        });

        it('should retrieve pantry statistics successfully', async () => {
            const response = await request(app)
                .get('/api/v1/pantry/stats')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('totalItems', 3);
            expect(response.body).toHaveProperty('expiringItems');
            expect(response.body).toHaveProperty('itemsByLocation');
            expect(response.body.itemsByLocation).toHaveProperty(StorageLocation.PANTRY);
            expect(response.body.itemsByLocation).toHaveProperty(StorageLocation.REFRIGERATOR);
            expect(response.body.itemsByLocation).toHaveProperty(StorageLocation.FREEZER);
        });
    });

    /**
     * Tests retrieving expiring items
     * Addresses requirement: Expiration Tracking - Expiration monitoring
     */
    describe('GET /api/v1/pantry/expiring', () => {
        beforeEach(async () => {
            // Add items with different expiration dates
            const items = [
                testItem, // 7 days
                {
                    ...testItem,
                    ingredientId: 'test-ingredient-2',
                    expirationDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days
                },
                {
                    ...testItem,
                    ingredientId: 'test-ingredient-3',
                    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                }
            ];

            for (const item of items) {
                await request(app)
                    .post('/api/v1/pantry/items')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(item);
            }
        });

        it('should list expiring items correctly', async () => {
            const response = await request(app)
                .get('/api/v1/pantry/expiring')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2); // Should include items expiring in 2 and 7 days
            
            // Verify expiring items are within threshold
            response.body.forEach((item: PantryItem) => {
                const daysToExpiration = Math.ceil(
                    (new Date(item.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                expect(daysToExpiration).toBeLessThanOrEqual(7);
            });
        });
    });
});