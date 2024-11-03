// @ts-check

// HUMAN TASKS:
// 1. Install required dev dependencies: jest@29.0.0, ts-jest@29.0.0, @types/jest@29.0.0
// 2. Create tests/setup.ts file for test environment configuration
// 3. Ensure test directories match the specified roots: src/ and tests/

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  // Requirement: Testing Infrastructure - Configure test environment for backend services
  testEnvironment: 'node',
  preset: 'ts-jest',

  // Test file discovery paths
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts'
  ],

  // TypeScript file transformation
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },

  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Requirement: Security Testing - Enable comprehensive coverage reporting
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],

  // Paths to ignore for coverage
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // Paths to ignore for testing
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],

  // Test environment setup file
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // TypeScript configuration for ts-jest
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json'
    }
  },

  // Path aliases from tsconfig.json for test file imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@interfaces/(.*)$': '<rootDir>/src/interfaces/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@middlewares/(.*)$': '<rootDir>/src/api/middlewares/$1',
    '^@validators/(.*)$': '<rootDir>/src/api/validators/$1',
    '^@controllers/(.*)$': '<rootDir>/src/api/controllers/$1',
    '^@routes/(.*)$': '<rootDir>/src/api/routes/$1',
    '^@workers/(.*)$': '<rootDir>/src/workers/$1',
    '^@websocket/(.*)$': '<rootDir>/src/websocket/$1'
  },

  // Enable verbose test output
  verbose: true,

  // Test timeout in milliseconds
  testTimeout: 30000,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocked functions to their original implementation
  restoreMocks: true
};

module.exports = config;