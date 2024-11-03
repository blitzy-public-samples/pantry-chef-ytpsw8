// Jest configuration for PantryChef web dashboard
// Version requirements:
// - jest: ^29.0.0
// - @testing-library/jest-dom: ^5.16.0
// - ts-jest: ^29.0.0
// - identity-obj-proxy: ^3.0.0

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  // Requirement: Testing Environment (7.6 Development Environment)
  // Configure test environment for React components using jsdom
  testEnvironment: 'jsdom',
  
  // TypeScript configuration with ts-jest
  preset: 'ts-jest',
  
  // Root directory for tests
  roots: ['<rootDir>/src'],
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  
  // TypeScript transformation configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowJs: true,
        skipLibCheck: true
      }
    }]
  },
  
  // Module path aliases mapping
  moduleNameMapper: {
    // Map path aliases to match tsconfig paths
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@interfaces/(.*)$': '<rootDir>/src/interfaces/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@styles/(.*)$': '<rootDir>/src/styles/$1',
    // Mock CSS modules
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  
  // Setup files to run before tests
  setupFilesAfterEnv: [
    '@testing-library/jest-dom/extend-expect'
  ],
  
  // Requirement: CI/CD Pipeline (10.5 CI/CD Pipeline/10.5.2 Deployment Process)
  // Configure coverage collection and thresholds for production deployment requirement
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  }
};

module.exports = config;