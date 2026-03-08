import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import jsdoc from 'eslint-plugin-jsdoc';
import svelte from 'eslint-plugin-svelte';
import tsdoc from 'eslint-plugin-tsdoc';
import tseslint from 'typescript-eslint';
import svelteConfig from './svelte.config.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: [
      'coverage/**',
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'scripts/**',
      'eslint.config.js',
      'playwright.config.ts',
      'svelte.config.js',
      'vite.config.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: __dirname,
        extraFileExtensions: ['.svelte'],
      },
    },
    plugins: {
      jsdoc,
      tsdoc,
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'jsdoc/require-jsdoc': [
        'error',
        {
          contexts: [
            'TSTypeAliasDeclaration',
            'TSInterfaceDeclaration',
            'FunctionDeclaration',
            'ClassDeclaration',
            'MethodDefinition',
          ],
          require: {
            FunctionDeclaration: true,
            ClassDeclaration: true,
            MethodDefinition: true,
          },
        },
      ],
      'jsdoc/check-tag-names': 'error',
      'jsdoc/require-param': 'error',
      'jsdoc/require-param-description': 'error',
      'jsdoc/require-returns': 'error',
      'jsdoc/require-returns-description': 'error',
      'tsdoc/syntax': 'error',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.svelte', 'e2e/**/*.ts'],
    rules: {
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-param': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns': 'off',
      'jsdoc/require-returns-description': 'off',
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        svelteConfig,
      },
    },
  },
  eslintConfigPrettier,
);
