import { Client } from '@elastic/elasticsearch'; // ^8.0.0
import { Recipe } from '../interfaces/recipe.interface';
import { Ingredient } from '../interfaces/ingredient.interface';
import { elasticsearchClient } from '../config/elasticsearch';
import { logError, logInfo } from '../utils/logger';

// HUMAN TASKS:
// 1. Configure Elasticsearch index settings and mappings in production
// 2. Set up monitoring for search performance metrics
// 3. Configure index lifecycle management policies
// 4. Set up alerting for slow search queries
// 5. Verify search relevance scoring with business stakeholders

// Requirement: Search Performance - Interface for paginated search results
export interface SearchResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
}

// Requirement: Recipe Search Engine - Interface for search filter parameters
export interface SearchFilters {
    difficulty: string[];
    cuisine: string[];
    maxPrepTime: number;
    maxCookTime: number;
    page: number;
    pageSize: number;
}

// Requirement: Recipe Search Engine - Search service class implementation
export class SearchService {
    private readonly RECIPE_INDEX = 'recipes';
    private readonly INGREDIENT_INDEX = 'ingredients';
    private readonly DEFAULT_PAGE_SIZE = 20;
    private readonly MAX_PAGE_SIZE = 100;

    constructor(private readonly esClient: Client = elasticsearchClient) {}

    // Requirement: Recipe Search Engine - Search recipes with optimized performance
    public async searchRecipes(
        query: string,
        ingredients: string[] = [],
        tags: string[] = [],
        filters: SearchFilters = {} as SearchFilters
    ): Promise<SearchResult<Recipe>> {
        try {
            const startTime = Date.now();
            const {
                difficulty = [],
                cuisine = [],
                maxPrepTime,
                maxCookTime,
                page = 1,
                pageSize = this.DEFAULT_PAGE_SIZE
            } = filters;

            // Build search query with performance optimization
            const searchQuery = this.buildSearchQuery({
                query,
                ingredients,
                tags,
                difficulty,
                cuisine,
                maxPrepTime,
                maxCookTime,
                page,
                pageSize: Math.min(pageSize, this.MAX_PAGE_SIZE)
            });

            // Execute search with performance tracking
            const response = await this.esClient.search({
                index: this.RECIPE_INDEX,
                ...searchQuery
            });

            const results: SearchResult<Recipe> = {
                items: response.hits.hits.map(hit => ({
                    ...(hit._source as Recipe),
                    id: hit._id
                })),
                total: response.hits.total as number,
                page,
                pageSize
            };

            // Requirement: Search Performance - Log search performance metrics
            const duration = Date.now() - startTime;
            logInfo('Recipe search completed', {
                duration,
                resultCount: results.items.length,
                query,
                filters
            });

            return results;
        } catch (error) {
            logError(error as Error, 'Recipe search failed');
            throw error;
        }
    }

    // Requirement: Recipe Search Engine - Search ingredients with fuzzy matching
    public async searchIngredients(
        query: string,
        categories: string[] = []
    ): Promise<SearchResult<Ingredient>> {
        try {
            const startTime = Date.now();

            const searchQuery = {
                query: {
                    bool: {
                        must: [
                            {
                                multi_match: {
                                    query,
                                    fields: ['name^3', 'recognitionTags'],
                                    fuzziness: 'AUTO'
                                }
                            }
                        ],
                        filter: categories.length > 0 ? [{
                            terms: { category: categories }
                        }] : []
                    }
                },
                size: this.DEFAULT_PAGE_SIZE
            };

            const response = await this.esClient.search({
                index: this.INGREDIENT_INDEX,
                ...searchQuery
            });

            const results: SearchResult<Ingredient> = {
                items: response.hits.hits.map(hit => ({
                    ...(hit._source as Ingredient),
                    id: hit._id
                })),
                total: response.hits.total as number,
                page: 1,
                pageSize: this.DEFAULT_PAGE_SIZE
            };

            // Log performance metrics
            const duration = Date.now() - startTime;
            logInfo('Ingredient search completed', {
                duration,
                resultCount: results.items.length,
                query,
                categories
            });

            return results;
        } catch (error) {
            logError(error as Error, 'Ingredient search failed');
            throw error;
        }
    }

    // Requirement: Recipe Discovery - Find similar recipes
    public async findSimilarRecipes(
        recipeId: string,
        limit: number = 5
    ): Promise<Recipe[]> {
        try {
            const startTime = Date.now();

            const response = await this.esClient.search({
                index: this.RECIPE_INDEX,
                body: {
                    query: {
                        more_like_this: {
                            fields: ['name', 'ingredients.name', 'tags', 'cuisine'],
                            like: [
                                {
                                    _index: this.RECIPE_INDEX,
                                    _id: recipeId
                                }
                            ],
                            min_term_freq: 1,
                            max_query_terms: 12,
                            min_doc_freq: 1
                        }
                    },
                    size: limit + 1 // Add 1 to filter out source recipe
                }
            });

            // Filter out the source recipe
            const similarRecipes = response.hits.hits
                .map(hit => ({
                    ...(hit._source as Recipe),
                    id: hit._id
                }))
                .filter(recipe => recipe.id !== recipeId)
                .slice(0, limit);

            // Log performance metrics
            const duration = Date.now() - startTime;
            logInfo('Similar recipes search completed', {
                duration,
                recipeId,
                resultCount: similarRecipes.length
            });

            return similarRecipes;
        } catch (error) {
            logError(error as Error, 'Similar recipes search failed');
            throw error;
        }
    }

    // Requirement: Search Performance - Build optimized search query
    private buildSearchQuery(params: SearchParams): object {
        const {
            query,
            ingredients,
            tags,
            difficulty,
            cuisine,
            maxPrepTime,
            maxCookTime,
            page,
            pageSize
        } = params;

        const must: any[] = [];
        const filter: any[] = [];

        // Add full text search
        if (query) {
            must.push({
                multi_match: {
                    query,
                    fields: ['name^3', 'description^2', 'ingredients.name'],
                    type: 'best_fields',
                    fuzziness: 'AUTO'
                }
            });
        }

        // Add ingredient matching with boost
        if (ingredients.length > 0) {
            must.push({
                nested: {
                    path: 'ingredients',
                    query: {
                        terms: {
                            'ingredients.name': ingredients
                        }
                    },
                    boost: 2.0
                }
            });
        }

        // Add filters
        if (tags.length > 0) {
            filter.push({ terms: { tags } });
        }
        if (difficulty.length > 0) {
            filter.push({ terms: { difficulty } });
        }
        if (cuisine.length > 0) {
            filter.push({ terms: { cuisine } });
        }
        if (maxPrepTime) {
            filter.push({ range: { prepTime: { lte: maxPrepTime } } });
        }
        if (maxCookTime) {
            filter.push({ range: { cookTime: { lte: maxCookTime } } });
        }

        return {
            body: {
                query: {
                    bool: {
                        must,
                        filter
                    }
                },
                from: (page - 1) * pageSize,
                size: pageSize,
                sort: [
                    { _score: 'desc' },
                    { averageRating: 'desc' }
                ],
                track_total_hits: true
            }
        };
    }
}

// Helper interface for search query parameters
interface SearchParams {
    query: string;
    ingredients: string[];
    tags: string[];
    difficulty: string[];
    cuisine: string[];
    maxPrepTime?: number;
    maxCookTime?: number;
    page: number;
    pageSize: number;
}