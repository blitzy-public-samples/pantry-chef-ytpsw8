import dotenv from 'dotenv';
import { IConfigs } from '../interfaces/configs.interface';

dotenv.config();

const {
  SHOW_CONFIGS = 'true',
  NODE_ENV = 'development',
  LOG_LEVEL = 'info',
  REDIS_HOST = 'localhost',
  REDIS_PORT = '6379',
  REDIS_PASSWORD = '',
  REDIS_DB = '0',
  REDIS_CLUSTER_MODE = 'true',
  AWS_REGION = 'us-east-1',
  AWS_ACCESS_KEY_ID = '',
  AWS_SECRET_ACCESS_KEY = '',
  AWS_KMS_KEY_ID = '',
  ELASTICSEARCH_NODE = 'http://localhost:9200',
  ELASTICSEARCH_USERNAME = '',
  ELASTICSEARCH_PASSWORD = '',
  ELASTICSEARCH_INDEX_RECIPES = 'recipes',
  ELASTICSEARCH_INDEX_INGREDIENTS = 'ingredients',
  RABBITMQ_URL = 'amqp://localhost:5672',
  RABBITMQ_HEARTBEAT = 60,
  RABBITMQ_PREFETCH = 10,
  QUEUE_RETRY_ATTEMPTS = 3,
  NOTIFICATION_QUEUE = 'notifications',
  WORKER_PREFETCH = 10,
  MAX_RETRIES = 3,
  RETRY_DELAY = 5000,
} = process.env;

const configs: IConfigs = {
  env: {
    nodeEnv: NODE_ENV,
    logLevel: LOG_LEVEL,
  },
  providers: {
    redis: {
      host: REDIS_HOST,
      port: parseInt(REDIS_PORT),
      password: REDIS_PASSWORD,
      db: parseInt(REDIS_DB),
      clusterMode: REDIS_CLUSTER_MODE === 'true' ? true : false,
    },
    aws: {
      region: AWS_REGION,
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
      kmsKeyId: AWS_KMS_KEY_ID,
    },
    elasticSearch: {
      node: ELASTICSEARCH_NODE,
      userName: ELASTICSEARCH_USERNAME,
      password: ELASTICSEARCH_PASSWORD,
      indexRecipes: ELASTICSEARCH_INDEX_RECIPES,
      indexIngredients: ELASTICSEARCH_INDEX_INGREDIENTS,
    },
    rabbitmq: {
      url: RABBITMQ_URL,
      heartBeat: parseInt(RABBITMQ_HEARTBEAT.toString()),
      prefetch: parseInt(RABBITMQ_PREFETCH.toString()),
      retryAttempts: parseInt(QUEUE_RETRY_ATTEMPTS.toString()),
    },
  },
  workers: {
    queue: NOTIFICATION_QUEUE,
    prefetch: parseInt(WORKER_PREFETCH.toString()),
    maxRetries: parseInt(MAX_RETRIES.toString()),
    retryDelay: parseInt(RETRY_DELAY.toString()),
  },
};

if (SHOW_CONFIGS === 'true') {
  // TODO: hide unsecure data
  console.info('-- SERVER CONFIGS --------------------------------');
  console.info(JSON.stringify(configs, null, 2));
  console.info('--------------------------------------------------');
}

export default configs;
