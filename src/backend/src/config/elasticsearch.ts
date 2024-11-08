import elasticsearch, { Client } from '@elastic/elasticsearch'; // ^8.0.0
import dotenv from 'dotenv'; // ^16.0.0
import { logError, logInfo } from '../utils/logger';
import configs from '../config/configs';

// HUMAN TASKS:
// 1. Set up Elasticsearch cluster and configure security settings
// 2. Configure SSL certificates for production environment
// 3. Set up index templates and lifecycle policies
// 4. Configure backup snapshots for indices
// 5. Set up monitoring and alerting for cluster health

// Load environment variables
dotenv.config();

// Global constants from environment
const ELASTICSEARCH_NODE = configs.providers.elasticSearch.node;
const ELASTICSEARCH_USERNAME = configs.providers.elasticSearch.userName;
const ELASTICSEARCH_PASSWORD = configs.providers.elasticSearch.password;
const ELASTICSEARCH_INDEX_RECIPES = configs.providers.elasticSearch.indexRecipes;
const ELASTICSEARCH_INDEX_INGREDIENTS = configs.providers.elasticSearch.indexIngredients;

// Requirement: Recipe Search Engine - Create and configure Elasticsearch client
export const createElasticsearchClient = (): Client => {
  try {
    // Configure client with connection pooling and retry settings
    const client = new Client({
      node: ELASTICSEARCH_NODE,
      auth: {
        username: ELASTICSEARCH_USERNAME,
        password: ELASTICSEARCH_PASSWORD,
      },
      // ssl: {
      //   rejectUnauthorized: process.env.NODE_ENV === 'production',
      // },
      // Performance optimization settings
      requestTimeout: 30000,
      sniffOnStart: true,
      // Connection pool settings for optimal performance
      maxRetries: 3,
      resurrectStrategy: 'ping',
      tls: {
        minVersion: 'TLSv1.2',
      },
    });

    logInfo('Elasticsearch client configured successfully', {
      node: ELASTICSEARCH_NODE,
      indices: [ELASTICSEARCH_INDEX_RECIPES, ELASTICSEARCH_INDEX_INGREDIENTS],
    });

    return client;
  } catch (error: any) {
    logError(error as Error, 'Elasticsearch client creation failed');
    throw error;
  }
};

// Requirement: Search Engine Configuration - Create and configure indices
export const createIndices = async (elasticsearchClient: Client): Promise<void> => {
  try {
    // Recipe index configuration
    const recipeIndexExists = await elasticsearchClient.indices.exists({
      index: ELASTICSEARCH_INDEX_RECIPES,
    });

    if (!recipeIndexExists) {
      await elasticsearchClient.indices.create({
        index: ELASTICSEARCH_INDEX_RECIPES,
        body: {
          settings: {
            number_of_shards: 3,
            number_of_replicas: 1,
            // Analyzer settings for optimal text search
            analysis: {
              analyzer: {
                recipe_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'stop', 'snowball'],
                },
              },
            },
          },
          mappings: {
            properties: {
              name: {
                type: 'text',
                analyzer: 'recipe_analyzer',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              description: {
                type: 'text',
                analyzer: 'recipe_analyzer',
              },
              ingredients: {
                type: 'nested',
                properties: {
                  name: { type: 'text', analyzer: 'recipe_analyzer' },
                  quantity: { type: 'float' },
                  unit: { type: 'keyword' },
                },
              },
              tags: { type: 'keyword' },
              difficulty: { type: 'keyword' },
              prepTime: { type: 'integer' },
              cookTime: { type: 'integer' },
            },
          },
        },
      });
      logInfo('Recipe index created successfully');
    }

    // Ingredient index configuration
    const ingredientIndexExists = await elasticsearchClient.indices.exists({
      index: ELASTICSEARCH_INDEX_INGREDIENTS,
    });

    if (!ingredientIndexExists) {
      await elasticsearchClient.indices.create({
        index: ELASTICSEARCH_INDEX_INGREDIENTS,
        body: {
          settings: {
            number_of_shards: 2,
            number_of_replicas: 1,
            // Analyzer settings for ingredient search
            analysis: {
              analyzer: {
                ingredient_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'stop'],
                },
              },
            },
          },
          mappings: {
            properties: {
              name: {
                type: 'text',
                analyzer: 'ingredient_analyzer',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              category: { type: 'keyword' },
              substitutes: {
                type: 'text',
                analyzer: 'ingredient_analyzer',
              },
              commonUnits: { type: 'keyword' },
            },
          },
        },
      });
      logInfo('Ingredient index created successfully');
    }
  } catch (error: any) {
    logError(error as Error, 'Index creation failed');
    throw error;
  }
};

// Requirement: Performance Optimization - Configure search settings
export const getSearchConfig = (indexType: string): object => {
  // Base configuration for high-performance search
  const baseConfig = {
    explain: false,
    track_scores: true,
    track_total_hits: true,
  };

  if (indexType === ELASTICSEARCH_INDEX_RECIPES) {
    return {
      ...baseConfig,
      // Recipe-specific search configuration
      query: {
        bool: {
          should: [
            { match: { name: { boost: 3 } } },
            { match: { description: { boost: 1 } } },
            {
              nested: {
                path: 'ingredients',
                query: {
                  match: { 'ingredients.name': { boost: 2 } },
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
      highlight: {
        fields: {
          name: {},
          description: {},
          'ingredients.name': {},
        },
      },
    };
  }

  if (indexType === ELASTICSEARCH_INDEX_INGREDIENTS) {
    return {
      ...baseConfig,
      // Ingredient-specific search configuration
      query: {
        bool: {
          should: [{ match: { name: { boost: 2 } } }, { match: { substitutes: { boost: 1 } } }],
          minimum_should_match: 1,
        },
      },
      highlight: {
        fields: {
          name: {},
          substitutes: {},
        },
      },
    };
  }

  throw new Error(`Invalid index type: ${indexType}`);
};

// Initialize Elasticsearch client
export const elasticsearchClient = createElasticsearchClient();
