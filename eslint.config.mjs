import js from '@eslint/js';
import globals from 'globals';
import sonarjs from 'eslint-plugin-sonarjs';

const tier1 = {
  files: ['public/js/**/*.mjs', 'public/js/**/*.js', 'lib/**/*.mjs', 'lib/**/*.js', 'lan-squad/**/*.js'],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    globals: { ...globals.browser, ...globals.node },
  },
  plugins: { sonarjs },
  rules: {
    ...js.configs.recommended.rules,
    complexity: ['error', { max: 15 }],
    'max-depth': ['error', 4],
    'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
    'sonarjs/cognitive-complexity': ['error', 20],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};

const bootHubs = {
  files: ['public/js/app.js', 'public/js/app-runtimes.mjs', 'public/js/app-shell.mjs'],
  rules: {
    'max-lines-per-function': ['error', { max: 120, skipBlankLines: true, skipComments: true }],
  },
};

const generatedIgnores = {
  ignores: [
    'public/js/chunks/**',
    'public/js/app.bundle.mjs',
    'public/js/app.bundle.js',
    'public/js/**/*.map',
  ],
};

export default [generatedIgnores, js.configs.recommended, tier1, bootHubs];
