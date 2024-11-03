// @ts-check

/**
 * HUMAN TASKS:
 * 1. Install required ESLint plugins as dev dependencies:
 *    npm install --save-dev @typescript-eslint/parser@5.0.0 @typescript-eslint/eslint-plugin@5.0.0 
 *    eslint-config-prettier@8.5.0 eslint-plugin-prettier@4.2.0 eslint-plugin-security@1.7.0 eslint-plugin-node@11.1.0
 * 2. Ensure Node.js version matches the engines field in package.json
 * 3. Run ESLint to verify configuration: npx eslint . --ext .ts
 */

/** @type {import('eslint').Linter.Config} */
module.exports = {
  // Requirement: Backend Code Quality - Enforces code quality standards for Node.js/Express.js backend
  env: {
    node: true,
    es2020: true,
    jest: true
  },

  // Use TypeScript parser for enhanced type checking
  parser: '@typescript-eslint/parser',

  // Configure TypeScript-specific parsing options
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: '.'
  },

  // Extend recommended configurations and plugins
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:security/recommended',
    'plugin:node/recommended',
    'prettier'
  ],

  // Enable required plugins
  plugins: [
    '@typescript-eslint',
    'security',
    'node',
    'prettier'
  ],

  // Requirement: TypeScript Support - Configures TypeScript-specific linting rules
  overrides: [
    {
      files: ['*.ts'],
      rules: {
        // TypeScript-specific rules
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/no-unsafe-assignment': 'error',
        '@typescript-eslint/strict-boolean-expressions': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/no-unnecessary-type-assertion': 'error',
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',

        // Requirement: Security Best Practices - Implements OWASP security best practices
        'security/detect-object-injection': 'error',
        'security/detect-non-literal-fs-filename': 'error',
        'security/detect-eval-with-expression': 'error',
        'security/detect-no-csrf-before-method-override': 'error',
        'security/detect-buffer-noassert': 'error',
        'security/detect-child-process': 'error',
        'security/detect-disable-mustache-escape': 'error',
        'security/detect-new-buffer': 'error',
        'security/detect-possible-timing-attacks': 'error',
        'security/detect-pseudoRandomBytes': 'error',
        'security/detect-unsafe-regex': 'error',

        // Node.js specific rules
        'node/no-unsupported-features/es-syntax': 'off', // Allow modern ES features with TypeScript
        'node/no-missing-import': 'off', // TypeScript handles this
        'node/no-unpublished-import': 'off', // Allow dev dependencies
        'node/no-unpublished-require': 'off', // Allow dev dependencies

        // Code style and formatting
        'prettier/prettier': ['error', {
          printWidth: 100,
          singleQuote: true,
          parser: 'typescript'
        }],

        // General best practices
        'no-console': ['error', { allow: ['warn', 'error'] }],
        'no-return-await': 'error',
        'prefer-const': 'error',
        'no-var': 'error',
        'curly': ['error', 'all'],
        'eqeqeq': ['error', 'always'],
        'no-throw-literal': 'error',
        'prefer-promise-reject-errors': 'error',
        'no-param-reassign': 'error',
        'no-multi-spaces': 'error',
        'no-multiple-empty-lines': ['error', { max: 1 }],
        'no-nested-ternary': 'error',
        'no-duplicate-imports': 'error'
      }
    }
  ],

  // Global settings
  settings: {
    node: {
      tryExtensions: ['.ts', '.js', '.json', '.node']
    }
  }
};