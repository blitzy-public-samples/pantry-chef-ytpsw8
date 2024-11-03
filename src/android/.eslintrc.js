// @typescript-eslint/parser version: ^5.0.0
// @typescript-eslint/eslint-plugin version: ^5.0.0
// eslint-plugin-react version: ^7.32.0
// eslint-plugin-react-native version: ^4.0.0
// eslint-plugin-import version: ^2.27.0

/* HUMAN TASKS:
1. Ensure TypeScript is installed and tsconfig.json is properly configured
2. Install all required ESLint plugins using npm or yarn
3. Configure your IDE/editor to use this ESLint configuration
4. Add this configuration to your CI/CD pipeline for automated linting
*/

module.exports = {
  // Requirement 7.1: Enforces TypeScript/JavaScript code quality standards and best practices
  root: true,
  env: {
    browser: true,
    es2021: true,
    'react-native/react-native': true,
    jest: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-native/all'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 2021,
    sourceType: 'module',
    project: './**/tsconfig.json'
  },
  plugins: [
    'react',
    'react-native',
    '@typescript-eslint',
    'import'
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  // Requirement 5.2.1: Enforces React Native specific coding patterns and practices
  rules: {
    // React Native specific rules
    'react-native/no-unused-styles': 'error',
    'react-native/split-platform-components': 'error',
    'react-native/no-inline-styles': 'error',
    'react-native/no-color-literals': 'error',
    'react-native/no-raw-text': 'error',

    // TypeScript specific rules
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': 'error',

    // Import/export rules
    'import/no-unresolved': 'error',
    'import/named': 'error',
    'import/default': 'error',
    'import/namespace': 'error',

    // React specific rules
    'react/prop-types': 'off', // Disabled because we use TypeScript for prop validation

    // General code quality rules
    'no-console': ['error', {
      allow: ['warn', 'error']
    }],
    'no-debugger': 'error'
  }
};