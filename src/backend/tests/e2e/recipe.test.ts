// @version jest ^29.0.0
// @version supertest ^6.3.0
// @version mongodb-memory-server ^8.0.0

/**
 * HUMAN TASKS:
 * 1. Configure MongoDB memory server settings in test environment
 * 2. Set up test data seeding scripts for recipe ingredients
 * 3. Configure test timeouts for performance testing
 * 4. Set up test coverage thresholds for recipe endpoints
 */

import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import supertest from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Recipe, RecipeDifficulty, RecipeIngredient, CookingStep, RecipeNutritionalInfo } from '../../src/interfaces/recipe.interface';

// Initialize test app and MongoDB instance
let mongoServer: MongoMemoryServer;
const app = require('../../src/app').default;
const request = supertest(app);

/**
 * Sets up in-memory MongoDB for testing
 * Requirement: Test environment setup for recipe management testing
 */
const setupTestDatabase = async (): Promise<void> => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
};

/**
 * Cleans up test database and connections
 */
const teardownTestDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
  await mongoServer.stop();
};

/**
 * Creates a test recipe with default values
 * Requirement: Recipe Management - Recipe data structure validation
 */
const createTestRecipe = (overrides: Partial<Recipe> = {}): Recipe => {
  const defaultRecipe: Recipe = {
    id: new mongoose.Types.ObjectId().toString(),
    name: 'Test Recipe',
    description: 'A test recipe description',
    authorId: new mongoose.Types.ObjectId().toString(),
    ingredients: [
      {
        ingredientId: new mongoose.Types.ObjectId().toString(),
        quantity: 100,
        unit: 'g',
        notes: 'Test ingredient note'
      }
    ] as RecipeIngredient[],
    instructions: [
      {
        stepNumber: 1,
        instruction: 'Test instruction',
        duration: 10,
        imageUrl: 'https://test.com/image.jpg'
      }
    ] as CookingStep[],
    prepTime: 15,
    cookTime: 30,
    servings: 4,
    difficulty: RecipeDifficulty.INTERMEDIATE,
    cuisine: 'Test Cuisine',
    tags: ['test', 'recipe'],
    imageUrl: 'https://test.com/recipe.jpg',
    nutritionalInfo: {
      servingSize: '100g',
      calories: 200,
      protein: 10,
      carbohydrates: 25,
      fat: 8
    } as RecipeNutritionalInfo,
    ratings: [],
    averageRating: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return { ...defaultRecipe, ...overrides };
};

// Test suite setup
beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

describe('Recipe API E2E Tests', () => {
  /**
   * Tests recipe creation endpoint
   * Requirements:
   * - Recipe Management - Recipe creation functionality
   * - Performance Requirements - Sub-200ms response time
   */
  it('POST /api/recipes - Should create a new recipe with complete Recipe interface validation', async () => {
    const testRecipe = createTestRecipe();
    const startTime = Date.now();

    const response = await request
      .post('/api/recipes')
      .send(testRecipe)
      .expect(201);

    // Verify response time
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(200);

    // Verify response data
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe(testRecipe.name);
    expect(response.body.ingredients).toHaveLength(testRecipe.ingredients.length);
    expect(response.body.difficulty).toBe(testRecipe.difficulty);

    // Verify recipe exists in database
    const getResponse = await request
      .get(`/api/recipes/${response.body.id}`)
      .expect(200);
    expect(getResponse.body.id).toBe(response.body.id);
  });

  /**
   * Tests recipe retrieval endpoint
   * Requirements:
   * - Recipe Management - Recipe retrieval functionality
   * - Performance Requirements - Sub-200ms response time with caching
   */
  it('GET /api/recipes/:id - Should retrieve a recipe by ID with caching', async () => {
    // Create test recipe
    const testRecipe = createTestRecipe();
    const createResponse = await request
      .post('/api/recipes')
      .send(testRecipe)
      .expect(201);

    // First request - should hit database
    const startTime1 = Date.now();
    const response1 = await request
      .get(`/api/recipes/${createResponse.body.id}`)
      .expect(200);
    const responseTime1 = Date.now() - startTime1;
    expect(responseTime1).toBeLessThan(200);

    // Second request - should hit cache
    const startTime2 = Date.now();
    const response2 = await request
      .get(`/api/recipes/${createResponse.body.id}`)
      .expect(200);
    const responseTime2 = Date.now() - startTime2;
    expect(responseTime2).toBeLessThan(responseTime1);

    // Verify data consistency
    expect(response1.body).toEqual(response2.body);
  });

  /**
   * Tests recipe update endpoint
   * Requirements:
   * - Recipe Management - Recipe update functionality
   * - Performance Requirements - Sub-200ms response time
   */
  it('PUT /api/recipes/:id - Should update an existing recipe with validation', async () => {
    // Create test recipe
    const testRecipe = createTestRecipe();
    const createResponse = await request
      .post('/api/recipes')
      .send(testRecipe)
      .expect(201);

    const updateData = {
      name: 'Updated Recipe Name',
      description: 'Updated description',
      difficulty: RecipeDifficulty.ADVANCED
    };

    const startTime = Date.now();
    const response = await request
      .put(`/api/recipes/${createResponse.body.id}`)
      .send(updateData)
      .expect(200);

    // Verify response time
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(200);

    // Verify updates
    expect(response.body.name).toBe(updateData.name);
    expect(response.body.description).toBe(updateData.description);
    expect(response.body.difficulty).toBe(updateData.difficulty);

    // Verify cache invalidation
    const getResponse = await request
      .get(`/api/recipes/${createResponse.body.id}`)
      .expect(200);
    expect(getResponse.body.name).toBe(updateData.name);
  });

  /**
   * Tests recipe deletion endpoint
   * Requirements:
   * - Recipe Management - Recipe deletion functionality
   * - Performance Requirements - Sub-200ms response time
   */
  it('DELETE /api/recipes/:id - Should delete a recipe with cleanup', async () => {
    // Create test recipe
    const testRecipe = createTestRecipe();
    const createResponse = await request
      .post('/api/recipes')
      .send(testRecipe)
      .expect(201);

    const startTime = Date.now();
    await request
      .delete(`/api/recipes/${createResponse.body.id}`)
      .expect(204);

    // Verify response time
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(200);

    // Verify recipe deletion
    await request
      .get(`/api/recipes/${createResponse.body.id}`)
      .expect(404);
  });

  /**
   * Tests recipe search functionality
   * Requirements:
   * - Recipe Discovery - Recipe search functionality
   * - Performance Requirements - Sub-200ms response time
   */
  it('GET /api/recipes/search - Should search recipes with filters using Elasticsearch', async () => {
    // Create multiple test recipes
    const recipes = [
      createTestRecipe({ name: 'Pasta Carbonara', cuisine: 'Italian' }),
      createTestRecipe({ name: 'Sushi Roll', cuisine: 'Japanese' }),
      createTestRecipe({ name: 'Pasta Bolognese', cuisine: 'Italian' })
    ];

    for (const recipe of recipes) {
      await request
        .post('/api/recipes')
        .send(recipe)
        .expect(201);
    }

    const startTime = Date.now();
    const response = await request
      .get('/api/recipes/search')
      .query({
        query: 'pasta',
        cuisine: 'Italian'
      })
      .expect(200);

    // Verify response time
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(200);

    // Verify search results
    expect(response.body.results).toHaveLength(2);
    expect(response.body.results.every((r: Recipe) => 
      r.name.toLowerCase().includes('pasta') && r.cuisine === 'Italian'
    )).toBe(true);
  });

  /**
   * Tests recipe matching by ingredients
   * Requirements:
   * - Recipe Management - Smart recipe matching
   * - Performance Requirements - Sub-200ms response time
   */
  it('POST /api/recipes/match - Should find recipes by ingredients with smart matching', async () => {
    // Create test recipes with different ingredients
    const ingredient1Id = new mongoose.Types.ObjectId().toString();
    const ingredient2Id = new mongoose.Types.ObjectId().toString();
    const ingredient3Id = new mongoose.Types.ObjectId().toString();

    const recipes = [
      createTestRecipe({
        ingredients: [
          { ingredientId: ingredient1Id, quantity: 100, unit: 'g', notes: '' },
          { ingredientId: ingredient2Id, quantity: 50, unit: 'g', notes: '' }
        ]
      }),
      createTestRecipe({
        ingredients: [
          { ingredientId: ingredient2Id, quantity: 75, unit: 'g', notes: '' },
          { ingredientId: ingredient3Id, quantity: 150, unit: 'g', notes: '' }
        ]
      })
    ];

    for (const recipe of recipes) {
      await request
        .post('/api/recipes')
        .send(recipe)
        .expect(201);
    }

    const startTime = Date.now();
    const response = await request
      .post('/api/recipes/match')
      .send({
        ingredientIds: [ingredient1Id, ingredient2Id]
      })
      .expect(200);

    // Verify response time
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(200);

    // Verify matching results
    expect(response.body).toHaveLength(1);
    expect(response.body[0].ingredients.some((i: RecipeIngredient) => 
      i.ingredientId === ingredient1Id
    )).toBe(true);
  });
});