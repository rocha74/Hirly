const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      '.expo/**',
      'android/**',
      'ios/**',
      'dist/**',
      'reports/**',
      'node_modules/**',
      'functions/node_modules/**',
      'website/node_modules/**',
      'website/dist/**',
      'website/screenshots/**',
      'docs/**',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'App.tsx', 'index.ts'],
    rules: {
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/display-name': 'warn',
      'react/no-unescaped-entities': 'warn',
    },
  },
  {
    files: ['functions/**/*.js', 'scripts/**/*.js', 'tests/**/*.{js,cjs}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      parserOptions: {
        sourceType: 'commonjs',
        allowReturnOutsideFunction: true,
        ecmaFeatures: { globalReturn: true },
      },
    },
  },
  {
    files: ['website/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      'react/display-name': 'error',
      'react/no-unescaped-entities': 'error',
    },
  },
  {
    files: ['website/vite.config.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
]);
