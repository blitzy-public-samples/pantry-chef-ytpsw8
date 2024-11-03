// @ts-check

/**
 * Human Tasks:
 * 1. Ensure @testing-library/react-native is installed with version ^12.0.0
 * 2. Create __mocks__ directory with fileMock.js for asset mocking
 * 3. Configure environment variables for testing in .env.test file
 * 4. Set up mock implementations for native modules in setupFiles
 */

// jest v29.0.0
// @testing-library/react-native v12.0.0
// @types/jest v29.0.0
// react-native v0.71.0

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  // Requirement: Testing Framework - Jest configuration for unit, integration and end-to-end tests
  preset: 'react-native',
  testEnvironment: 'node',
  testTimeout: 10000,

  // Requirement: Mobile Testing - Setup for React Native Android components
  setupFiles: [
    './node_modules/react-native-gesture-handler/jestSetup.js',
    '<rootDir>/jest/setup.js',
    '<rootDir>/jest/mockStorage.js',
    '<rootDir>/jest/mockCamera.js',
    '<rootDir>/jest/mockBiometric.js',
    '<rootDir>/jest/mockNotifications.js'
  ],

  // Configure module transformation patterns for React Native dependencies
  transformIgnorePatterns: [
    'node_modules/(?!(react-native' +
      '|@react-native' +
      '|@react-native-community' +
      '|@react-navigation' +
      '|react-native-camera' +
      '|react-native-biometrics' +
      '|react-native-async-storage' +
      ')/)',
  ],

  // Map module names and assets for testing environment
  moduleNameMapper: {
    // Handle image imports
    '^.+\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 
      '<rootDir>/__mocks__/fileMock.js',
    
    // Handle module path aliases
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Requirement: Testing Framework - Coverage thresholds and React Native specific settings
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/**/types/**'
  ],

  // Additional configuration for comprehensive testing
  verbose: true,
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Automatically reset mock state
  resetMocks: true,
  
  // Indicates whether each individual test should be reported during the run
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'reports/junit',
      outputName: 'js-test-results.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Global test timeout
  testTimeout: 30000,

  // Handle native module mocks
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect']
};

module.exports = config;