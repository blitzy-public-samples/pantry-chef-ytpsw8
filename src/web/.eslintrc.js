// HUMAN TASKS:
// 1. Install required ESLint plugins and dependencies via npm/yarn
// 2. Configure VS Code ESLint extension for TypeScript support
// 3. Add lint scripts to package.json: "lint": "eslint \"src/**/*.{ts,tsx}\""
// 4. Set up pre-commit hooks with husky to run ESLint

// @ts-check

/** @type {import('eslint').Linter.Config} */
module.exports = {
  // Requirement: Frontend Stack - Environment configuration for React Native/Next.js
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },

  // Requirement: Frontend Stack - Extended configurations for TypeScript and React
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier', // Must be last to override other formatting rules
  ],

  // Requirement: Frontend Stack - TypeScript parser configuration
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2021,
    sourceType: 'module',
    project: './tsconfig.json',
  },

  // Requirement: Frontend Stack - Required plugins for React and TypeScript
  plugins: [
    '@typescript-eslint', // @typescript-eslint/eslint-plugin@^5.0.0
    'react', // eslint-plugin-react@^7.32.0
    'react-hooks', // eslint-plugin-react-hooks@^4.6.0
    'import', // eslint-plugin-import@^2.26.0
  ],

  // Requirement: Frontend Stack - Custom rule configurations
  rules: {
    // React specific rules
    'react/react-in-jsx-scope': 'off', // Not needed in Next.js
    'react/prop-types': 'off', // Using TypeScript for prop validation
    'react-hooks/rules-of-hooks': 'error', // Enforce hooks rules
    'react-hooks/exhaustive-deps': 'warn', // Warn about missing dependencies

    // TypeScript specific rules
    '@typescript-eslint/explicit-module-boundary-types': 'off', // Allow implicit return types
    '@typescript-eslint/no-explicit-any': 'warn', // Warn about 'any' usage
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_' }, // Allow unused variables starting with underscore
    ],

    // Import rules for better code organization
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
        },
      },
    ],
  },

  // Requirement: Frontend Stack - React and TypeScript settings
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
  },

  // Requirement: Development Environment - Files to ignore
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'out/',
    'build/',
    'coverage/',
    '**/*.js',
    '!.eslintrc.js',
  ],

  // Requirement: Development Environment - Override rules for specific files
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      files: ['src/pages/**/*.tsx'],
      rules: {
        'import/no-default-export': 'off', // Allow default exports in Next.js pages
      },
    },
  ],
};