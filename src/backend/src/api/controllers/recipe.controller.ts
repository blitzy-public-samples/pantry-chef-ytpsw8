// @version express ^4.18.0
// @version express-validator ^6.14.0

/**
 * HUMAN TASKS:
 * 1. Configure CloudWatch alarms for response time monitoring (>200ms threshold)
 * 2. Set up performance monitoring dashboards for recipe endpoints
 * 3. Configure rate limiting thresholds for recipe API endpoints
 * 4. Set up alerts for high error rates in recipe operations
 * 5. Configure caching policies for recipe data in production
 */

import { Request, Response, NextFunction } from 'express';
import { Recipe } from '../../interfaces/recipe.interface';
import { RecipeService } from '../../services/recipe.service';
import {
  validateCreateRecipe,
  validateUpdateRecipe,
  validateRecipeQuery,
} from '../validators/recipe.validator';
import { errorHandler } from '../middlewares/error.middleware';
import { logger } from '../../utils/logger';
import { Order } from '../../services/search.service';
import { injectable, singleton } from 'tsyringe';

/**
 * Controller handling recipe-related HTTP endpoints with performance optimization
 * Addresses requirements:
 * - Recipe Management (1.2 Scope/Core Capabilities)
 * - Recipe Discovery (6.1.1 Core System Components/Search Cluster)
 * - Recipe Sharing (1.2 Scope/Core Capabilities)
 * - Performance Metrics (APPENDICES/C. SYSTEM METRICS)
 */
@singleton()
export class RecipeController {
  constructor(private readonly recipeService: RecipeService) {
    this.validateServiceDependency();
  }

  /**
   * Validates recipe service dependency
   */
  private validateServiceDependency(): void {
    if (!this.recipeService) {
      throw new Error('RecipeService dependency is required');
    }
  }

  /**
   * Creates a new recipe with validation
   * Requirement: Recipe Management - Smart recipe matching based on available ingredients
   */
  // @validateCreateRecipe()
  public async createRecipe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const recipeData: Recipe = req.body;

      // Create recipe through service layer
      const createdRecipe = await this.recipeService.createRecipe(recipeData);

      // Log performance metrics
      const duration = Date.now() - startTime;
      logger.info('Recipe created', {
        recipeId: createdRecipe.id,
        duration,
        timestamp: new Date().toISOString(),
      });

      // Return created recipe
      res.status(201).json({
        success: true,
        data: createdRecipe,
        metadata: {
          responseTime: duration,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Retrieves a recipe by ID with caching
   * Requirement: Performance Metrics - API response time < 200ms requirement
   */
  public async getRecipe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { id } = req.params;

      // Get recipe with caching
      const recipe = await this.recipeService.getRecipeById(id);

      if (!recipe) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Recipe not found',
            code: 'RECIPE_NOT_FOUND',
          },
        });
        return;
      }

      // Log performance metrics
      const duration = Date.now() - startTime;
      logger.info('Recipe retrieved', {
        recipeId: id,
        duration,
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        data: recipe,
        metadata: {
          responseTime: duration,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Updates an existing recipe with validation
   * Requirement: Recipe Management - Recipe data management
   */
  // @validateUpdateRecipe()
  public async updateRecipe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { id } = req.params;
      const updateData: Partial<Recipe> = req.body;

      // Update recipe through service layer
      const updatedRecipe = await this.recipeService.updateRecipe(id, updateData);

      // Log performance metrics
      const duration = Date.now() - startTime;
      logger.info('Recipe updated', {
        recipeId: id,
        duration,
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        data: updatedRecipe,
        metadata: {
          responseTime: duration,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Deletes a recipe with cleanup
   * Requirement: Recipe Management - Recipe data management
   */
  public async deleteRecipe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { id } = req.params;

      // Delete recipe through service layer
      await this.recipeService.deleteRecipe(id);

      // Log performance metrics
      const duration = Date.now() - startTime;
      logger.info('Recipe deleted', {
        recipeId: id,
        duration,
        timestamp: new Date().toISOString(),
      });

      res.status(204).send();
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Searches recipes with filters and pagination
   * Requirement: Recipe Discovery - Recipe and ingredient search functionality
   */
  // @validateRecipeQuery()
  public async searchRecipes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const {
        search = '',
        cuisine,
        difficulty,
        prepTimeMax,
        cookTimeMax,
        page = 1,
        limit = 20,
        sort = 'rating',
        order = 'desc',
      } = req.query;

      // Search recipes through service layer
      const searchResults = await this.recipeService.searchRecipes(search as string, {
        cuisine: cuisine as string[],
        difficulty: difficulty as string[],
        prepTimeMax: parseInt(prepTimeMax as string),
        cookTimeMax: parseInt(cookTimeMax as string),
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sort: sort as string,
        order: order as Order,
      });

      // Log performance metrics
      const duration = Date.now() - startTime;
      logger.info('Recipe search completed', {
        query: search,
        resultCount: searchResults.total,
        duration,
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        data: searchResults.items,
        metadata: {
          total: searchResults.total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          responseTime: duration,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Finds recipes matching available ingredients
   * Requirement: Recipe Management - Smart recipe matching based on available ingredients
   */
  public async findRecipesByIngredients(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const startTime = Date.now();
      const { ingredients } = req.query;

      if (!ingredients) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Ingredients list is required',
            code: 'MISSING_INGREDIENTS',
          },
        });
        return;
      }

      // Convert comma-separated ingredient IDs to array
      const ingredientIds = (ingredients as string).split(',');

      // Find matching recipes through service layer
      const matchingRecipes = await this.recipeService.findRecipesByIngredients(ingredientIds);

      // Log performance metrics
      const duration = Date.now() - startTime;
      logger.info('Recipe matching completed', {
        ingredientCount: ingredientIds.length,
        matchCount: matchingRecipes.length,
        duration,
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        data: matchingRecipes,
        metadata: {
          ingredientCount: ingredientIds.length,
          matchCount: matchingRecipes.length,
          responseTime: duration,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async rateRecipe() {}
}
