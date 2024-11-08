// @ts-check
import { Redis } from 'ioredis'; // ^5.0.0
import { createRedisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { Recipe } from '../interfaces/recipe.interface';

// HUMAN TASKS:
// 1. Configure Redis monitoring alerts in CloudWatch
// 2. Set up cache eviction policies based on memory usage
// 3. Configure cache backup strategy
// 4. Set up cache metrics dashboard
// 5. Configure cache invalidation webhooks for data consistency

/**
 * Core caching service providing Redis-based caching functionality
 * Requirement: Cache Layer - Redis caching layer for session management and frequent queries
 */
export class CacheService {
  private redisClient: Redis;
  private defaultTTL: number;
  private readonly RECIPE_PREFIX = 'recipe:';

  constructor() {
    // Requirement: High Availability - Redis cluster support for high availability caching
    this.redisClient = createRedisClient();
    this.defaultTTL = 3600; // 1 hour default TTL

    // Initialize error handling for Redis connection
    this.redisClient.on('error', (error: Error) => {
      logger.error('Redis cache error', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Sets a value in cache with optional TTL
   * Requirement: Performance Optimization - Redis caching for performance optimization
   */
  public async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);

      if (ttl) {
        await this.redisClient.setex(key, ttl, serializedValue);
      } else {
        await this.redisClient.setex(key, this.defaultTTL, serializedValue);
      }

      logger.info('Cache set successful', {
        key,
        ttl: ttl || this.defaultTTL,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Cache set failed', {
        key,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
      throw new AppError('Failed to set cache value', 500, 'CACHE_SET_ERROR', {
        key,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Retrieves a value from cache with type safety
   * Requirement: Performance Optimization - Type-safe cache retrieval
   */
  public async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redisClient.get(key);

      if (!value) {
        return null;
      }

      logger.info('Cache hit', {
        key,
        timestamp: new Date().toISOString(),
      });

      return JSON.parse(value) as T;
    } catch (error: any) {
      logger.error('Cache get failed', {
        key,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
      throw new AppError('Failed to get cache value', 500, 'CACHE_GET_ERROR', {
        key,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Deletes a value from cache
   * Requirement: Cache Layer - Cache invalidation support
   */
  public async delete(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);

      logger.info('Cache delete successful', {
        key,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Cache delete failed', {
        key,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
      throw new AppError('Failed to delete cache value', 500, 'CACHE_DELETE_ERROR', {
        key,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Clears cache entries matching a pattern
   * Requirement: Cache Layer - Batch cache invalidation
   */
  public async clear(pattern: string): Promise<void> {
    try {
      const keys = await this.redisClient.keys(pattern);

      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }

      logger.info('Cache clear successful', {
        pattern,
        keysCleared: keys.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Cache clear failed', {
        pattern,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
      throw new AppError('Failed to clear cache', 500, 'CACHE_CLEAR_ERROR', {
        pattern,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Gets a strongly-typed recipe from cache
   * Requirement: Performance Optimization - Type-safe recipe caching
   */
  public async getRecipe(recipeId: string): Promise<Recipe | null> {
    try {
      const key = `${this.RECIPE_PREFIX}${recipeId}`;
      const recipe = await this.get<Recipe>(key);

      if (recipe) {
        // Validate recipe object structure
        this.validateRecipeStructure(recipe);
      }

      return recipe;
    } catch (error: any) {
      logger.error('Recipe cache get failed', {
        recipeId,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
      throw new AppError('Failed to get recipe from cache', 500, 'CACHE_RECIPE_GET_ERROR', {
        recipeId,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Caches a strongly-typed recipe object
   * Requirement: Performance Optimization - Recipe caching with validation
   */
  public async setRecipe(recipeId: string, recipe: Recipe): Promise<void> {
    try {
      // Validate recipe object structure before caching
      this.validateRecipeStructure(recipe);

      const key = `${this.RECIPE_PREFIX}${recipeId}`;
      await this.set(key, recipe);

      logger.info('Recipe cache set successful', {
        recipeId,
        recipeName: recipe.name,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Recipe cache set failed', {
        recipeId,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
      throw new AppError('Failed to cache recipe', 500, 'CACHE_RECIPE_SET_ERROR', {
        recipeId,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Validates recipe object structure
   * Private helper method for type safety
   */
  private validateRecipeStructure(recipe: Recipe): void {
    if (
      !recipe.id ||
      !recipe.name ||
      !Array.isArray(recipe.ingredients) ||
      !Array.isArray(recipe.instructions)
    ) {
      throw new AppError('Invalid recipe structure', 400, 'INVALID_RECIPE_STRUCTURE', { recipe });
    }
  }
}
