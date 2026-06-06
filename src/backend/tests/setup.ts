// Minimal Jest setup stub created by the setup agent.
// Rationale: jest.config.js references `setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']`,
// but this documentation-first repository shipped without the file, which prevents Jest
// from running at all. This stub only configures the test environment (no assertions,
// not application source). Downstream agents may extend it as needed.
import 'reflect-metadata';

// Provide safe local defaults for service connectivity used by integration/e2e tests
// when not already supplied by the environment.
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pantrychef_test';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
process.env.RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

// Increase default timeout to accommodate real-infrastructure integration tests.
jest.setTimeout(30000);
