// @version jest ^29.0.0
// @version mongoose ^6.5.0

/**
 * HUMAN TASKS:
 * 1. Configure performance monitoring for recipe matching operations
 * 2. Set up alerts for recipe service response times > 200ms
 * 3. Configure Elasticsearch index settings for recipe search
 * 4. Set up Redis cache eviction policies for recipe data
 * 5. Configure RabbitMQ queues for recipe processing
 */

import { RecipeService } from '../../src/services/recipe.service';
import { SearchService } from '../../src/services/search.service';
import { CacheService } from '../../src/services/cache.service';
import { QueueService } from '../../src/services/queue.service';
import { Recipe, RecipeDifficulty } from '../../src/interfaces/recipe.interface';
import { RecipeModel } from '../../src/models/recipe.model';

// Mock dependencies
jest.mock('../../src/services/search.service');
jest.mock('../../src/services/cache.service');
jest.mock('../../src/services/queue.service');
jest.mock('../../src/models/recipe.model');
jest.mock('../../src/utils/logger');

describe('RecipeService', () => {
    let recipeService: RecipeService;
    let searchService: jest.Mocked<SearchService>;
    let cacheService: jest.Mocked<CacheService>;
    let queueService: jest.Mocked<QueueService>;

    // Mock recipe data
    const mockRecipe: Recipe = {
        id: '123',
        name: 'Test Recipe',
        description: 'A test recipe',
        authorId: 'user123',
        ingredients: [
            {
                ingredientId: 'ing1',
                quantity: 1,
                unit: 'cup',
                notes: 'test note'
            }
        ],
        instructions: [
            {
                stepNumber: 1,
                instruction: 'Test step',
                duration: 10,
                imageUrl: 'test.jpg'
            }
        ],
        prepTime: 15,
        cookTime: 30,
        servings: 4,
        difficulty: RecipeDifficulty.EASY,
        cuisine: 'Test',
        tags: ['test'],
        imageUrl: 'test.jpg',
        nutritionalInfo: {
            servingSize: '100g',
            calories: 200,
            protein: 10,
            carbohydrates: 20,
            fat: 5
        },
        ratings: [],
        averageRating: 0,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Initialize mocked services
        searchService = new SearchService() as jest.Mocked<SearchService>;
        cacheService = new CacheService() as jest.Mocked<CacheService>;
        queueService = new QueueService() as jest.Mocked<QueueService>;

        // Initialize recipe service with mocked dependencies
        recipeService = new RecipeService(
            searchService,
            cacheService,
            queueService
        );
    });

    describe('createRecipe', () => {
        it('should create a new recipe with valid data', async () => {
            // Requirement: Recipe Management - Smart recipe matching based on available ingredients
            const startTime = Date.now();

            // Mock MongoDB create
            (RecipeModel.create as jest.Mock).mockResolvedValueOnce(mockRecipe);

            // Mock queue publish
            queueService.publishToQueue.mockResolvedValueOnce(true);

            // Mock cache set
            cacheService.setRecipe.mockResolvedValueOnce();

            const result = await recipeService.createRecipe(mockRecipe);

            expect(result).toEqual(mockRecipe);
            expect(RecipeModel.create).toHaveBeenCalledWith(mockRecipe);
            expect(queueService.publishToQueue).toHaveBeenCalledWith('recipe.index', {
                action: 'CREATE',
                recipeId: mockRecipe.id,
                recipe: mockRecipe
            });
            expect(cacheService.setRecipe).toHaveBeenCalledWith(mockRecipe.id, mockRecipe);

            // Requirement: Performance Testing - Verify API response time < 200ms
            expect(Date.now() - startTime).toBeLessThan(200);
        });

        it('should handle validation errors for invalid data', async () => {
            const invalidRecipe = { ...mockRecipe, name: '' };
            (RecipeModel.create as jest.Mock).mockRejectedValueOnce(new Error('Validation error'));

            await expect(recipeService.createRecipe(invalidRecipe)).rejects.toThrow('Failed to create recipe');
        });

        it('should handle search service errors', async () => {
            (RecipeModel.create as jest.Mock).mockResolvedValueOnce(mockRecipe);
            queueService.publishToQueue.mockRejectedValueOnce(new Error('Search service error'));

            await expect(recipeService.createRecipe(mockRecipe)).rejects.toThrow('Failed to create recipe');
        });

        it('should handle cache service errors', async () => {
            (RecipeModel.create as jest.Mock).mockResolvedValueOnce(mockRecipe);
            queueService.publishToQueue.mockResolvedValueOnce(true);
            cacheService.setRecipe.mockRejectedValueOnce(new Error('Cache service error'));

            await expect(recipeService.createRecipe(mockRecipe)).rejects.toThrow('Failed to create recipe');
        });
    });

    describe('getRecipeById', () => {
        it('should return recipe from cache if available', async () => {
            // Requirement: Performance Testing - Verify API response time < 200ms
            const startTime = Date.now();

            cacheService.getRecipe.mockResolvedValueOnce(mockRecipe);

            const result = await recipeService.getRecipeById(mockRecipe.id);

            expect(result).toEqual(mockRecipe);
            expect(cacheService.getRecipe).toHaveBeenCalledWith(mockRecipe.id);
            expect(RecipeModel.findById).not.toHaveBeenCalled();
            expect(Date.now() - startTime).toBeLessThan(200);
        });

        it('should fetch from database if cache miss', async () => {
            cacheService.getRecipe.mockResolvedValueOnce(null);
            (RecipeModel.findById as jest.Mock).mockResolvedValueOnce(mockRecipe);

            const result = await recipeService.getRecipeById(mockRecipe.id);

            expect(result).toEqual(mockRecipe);
            expect(RecipeModel.findById).toHaveBeenCalledWith(mockRecipe.id);
            expect(cacheService.setRecipe).toHaveBeenCalledWith(mockRecipe.id, mockRecipe);
        });

        it('should handle non-existent recipe ID', async () => {
            cacheService.getRecipe.mockResolvedValueOnce(null);
            (RecipeModel.findById as jest.Mock).mockResolvedValueOnce(null);

            const result = await recipeService.getRecipeById('nonexistent');

            expect(result).toBeNull();
        });

        it('should handle cache service errors', async () => {
            cacheService.getRecipe.mockRejectedValueOnce(new Error('Cache error'));
            (RecipeModel.findById as jest.Mock).mockResolvedValueOnce(mockRecipe);

            const result = await recipeService.getRecipeById(mockRecipe.id);

            expect(result).toEqual(mockRecipe);
        });
    });

    describe('updateRecipe', () => {
        const updateData = { name: 'Updated Recipe' };

        it('should update recipe with valid data', async () => {
            (RecipeModel.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce({
                ...mockRecipe,
                ...updateData
            });

            const result = await recipeService.updateRecipe(mockRecipe.id, updateData);

            expect(result.name).toBe(updateData.name);
            expect(queueService.publishToQueue).toHaveBeenCalledWith('recipe.index', {
                action: 'UPDATE',
                recipeId: mockRecipe.id,
                recipe: result
            });
            expect(cacheService.setRecipe).toHaveBeenCalledWith(mockRecipe.id, result);
        });

        it('should handle non-existent recipe', async () => {
            (RecipeModel.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce(null);

            await expect(recipeService.updateRecipe('nonexistent', updateData))
                .rejects.toThrow('Recipe not found');
        });

        it('should handle search service errors', async () => {
            (RecipeModel.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce({
                ...mockRecipe,
                ...updateData
            });
            queueService.publishToQueue.mockRejectedValueOnce(new Error('Search error'));

            await expect(recipeService.updateRecipe(mockRecipe.id, updateData))
                .rejects.toThrow('Failed to update recipe');
        });

        it('should handle cache service errors', async () => {
            (RecipeModel.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce({
                ...mockRecipe,
                ...updateData
            });
            queueService.publishToQueue.mockResolvedValueOnce(true);
            cacheService.setRecipe.mockRejectedValueOnce(new Error('Cache error'));

            await expect(recipeService.updateRecipe(mockRecipe.id, updateData))
                .rejects.toThrow('Failed to update recipe');
        });
    });

    describe('deleteRecipe', () => {
        it('should delete recipe successfully', async () => {
            (RecipeModel.findByIdAndDelete as jest.Mock).mockResolvedValueOnce(mockRecipe);

            await recipeService.deleteRecipe(mockRecipe.id);

            expect(queueService.publishToQueue).toHaveBeenCalledWith('recipe.index', {
                action: 'DELETE',
                recipeId: mockRecipe.id
            });
            expect(cacheService.delete).toHaveBeenCalledWith(`recipe:${mockRecipe.id}`);
        });

        it('should handle non-existent recipe', async () => {
            (RecipeModel.findByIdAndDelete as jest.Mock).mockResolvedValueOnce(null);

            await expect(recipeService.deleteRecipe('nonexistent'))
                .rejects.toThrow('Recipe not found');
        });

        it('should handle search service errors', async () => {
            (RecipeModel.findByIdAndDelete as jest.Mock).mockResolvedValueOnce(mockRecipe);
            queueService.publishToQueue.mockRejectedValueOnce(new Error('Search error'));

            await expect(recipeService.deleteRecipe(mockRecipe.id))
                .rejects.toThrow('Failed to delete recipe');
        });

        it('should handle cache service errors', async () => {
            (RecipeModel.findByIdAndDelete as jest.Mock).mockResolvedValueOnce(mockRecipe);
            queueService.publishToQueue.mockResolvedValueOnce(true);
            cacheService.delete.mockRejectedValueOnce(new Error('Cache error'));

            await expect(recipeService.deleteRecipe(mockRecipe.id))
                .rejects.toThrow('Failed to delete recipe');
        });
    });

    describe('findRecipesByIngredients', () => {
        const ingredientIds = ['ing1', 'ing2'];
        const matchingRecipes = [mockRecipe];

        it('should find recipes matching ingredients', async () => {
            // Requirement: Performance Testing - Verify API response time < 200ms
            const startTime = Date.now();

            const cacheKey = `ingredients:${ingredientIds.sort().join(',')}`;
            cacheService.get.mockResolvedValueOnce(null);
            (RecipeModel.findByIngredients as jest.Mock).mockResolvedValueOnce(matchingRecipes);

            const result = await recipeService.findRecipesByIngredients(ingredientIds);

            expect(result).toEqual(matchingRecipes);
            expect(queueService.publishToQueue).toHaveBeenCalledWith('recipe.matching', {
                ingredientIds,
                timestamp: expect.any(String)
            });
            expect(cacheService.set).toHaveBeenCalledWith(cacheKey, matchingRecipes, 3600);
            expect(Date.now() - startTime).toBeLessThan(200);
        });

        it('should return cached results if available', async () => {
            cacheService.get.mockResolvedValueOnce(matchingRecipes);

            const result = await recipeService.findRecipesByIngredients(ingredientIds);

            expect(result).toEqual(matchingRecipes);
            expect(RecipeModel.findByIngredients).not.toHaveBeenCalled();
        });

        it('should handle no matches found', async () => {
            cacheService.get.mockResolvedValueOnce(null);
            (RecipeModel.findByIngredients as jest.Mock).mockResolvedValueOnce([]);

            const result = await recipeService.findRecipesByIngredients(ingredientIds);

            expect(result).toEqual([]);
        });

        it('should handle search service errors', async () => {
            cacheService.get.mockResolvedValueOnce(null);
            (RecipeModel.findByIngredients as jest.Mock).mockRejectedValueOnce(new Error('Search error'));

            await expect(recipeService.findRecipesByIngredients(ingredientIds))
                .rejects.toThrow('Failed to find matching recipes');
        });

        it('should handle queue service errors', async () => {
            cacheService.get.mockResolvedValueOnce(null);
            (RecipeModel.findByIngredients as jest.Mock).mockResolvedValueOnce(matchingRecipes);
            queueService.publishToQueue.mockRejectedValueOnce(new Error('Queue error'));

            await expect(recipeService.findRecipesByIngredients(ingredientIds))
                .rejects.toThrow('Failed to find matching recipes');
        });
    });

    describe('searchRecipes', () => {
        const query = 'test';
        const filters = { difficulty: ['EASY'], cuisine: ['Italian'], page: 1, pageSize: 10 };
        const searchResults = {
            items: [mockRecipe],
            total: 1,
            page: 1,
            pageSize: 10
        };

        it('should search recipes with filters', async () => {
            // Requirement: Performance Testing - Verify API response time < 200ms
            const startTime = Date.now();

            const cacheKey = `search:${query}:${JSON.stringify(filters)}`;
            cacheService.get.mockResolvedValueOnce(null);
            searchService.searchRecipes.mockResolvedValueOnce(searchResults);

            const result = await recipeService.searchRecipes(query, filters);

            expect(result).toEqual(searchResults);
            expect(searchService.searchRecipes).toHaveBeenCalledWith(query, [], [], filters);
            expect(cacheService.set).toHaveBeenCalledWith(cacheKey, searchResults, 1800);
            expect(Date.now() - startTime).toBeLessThan(200);
        });

        it('should handle pagination correctly', async () => {
            const paginatedFilters = { ...filters, page: 2, pageSize: 20 };
            cacheService.get.mockResolvedValueOnce(null);
            searchService.searchRecipes.mockResolvedValueOnce({
                ...searchResults,
                page: 2,
                pageSize: 20
            });

            const result = await recipeService.searchRecipes(query, paginatedFilters);

            expect(result.page).toBe(2);
            expect(result.pageSize).toBe(20);
        });

        it('should return cached search results', async () => {
            cacheService.get.mockResolvedValueOnce(searchResults);

            const result = await recipeService.searchRecipes(query, filters);

            expect(result).toEqual(searchResults);
            expect(searchService.searchRecipes).not.toHaveBeenCalled();
        });

        it('should handle search service errors', async () => {
            cacheService.get.mockResolvedValueOnce(null);
            searchService.searchRecipes.mockRejectedValueOnce(new Error('Search error'));

            await expect(recipeService.searchRecipes(query, filters))
                .rejects.toThrow('Failed to search recipes');
        });

        it('should handle cache service errors', async () => {
            cacheService.get.mockRejectedValueOnce(new Error('Cache error'));
            searchService.searchRecipes.mockResolvedValueOnce(searchResults);

            const result = await recipeService.searchRecipes(query, filters);

            expect(result).toEqual(searchResults);
        });
    });
});