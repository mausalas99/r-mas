import js from '@eslint/js';
import globals from 'globals';
import sonarjs from 'eslint-plugin-sonarjs';

const tier1 = {
  files: [
    'public/js/**/*.mjs',
    'public/js/**/*.js',
    'public/js/**/*.cjs',
    'lib/**/*.mjs',
    'lib/**/*.js',
    'lib/**/*.cjs',
    'lan-squad/**/*.js',
    'lan-squad/**/*.cjs',
  ],
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

const tier1Commonjs = {
  files: ['lib/**/*.cjs', 'lan-squad/**/*.cjs', 'public/js/**/*.cjs'],
  languageOptions: {
    sourceType: 'commonjs',
    globals: { ...globals.node, module: 'readonly', require: 'readonly', exports: 'writable' },
  },
};

// Tier-2 legacy: TODO decompose — see plans/README.md follow-ups
const tier2LegacyCjs = {
  files: ['lib/db/clinical-ops-bundle-merge.cjs'],
  rules: {
    complexity: 'warn',
    'max-lines-per-function': 'warn',
    'sonarjs/cognitive-complexity': 'warn',
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

export default [generatedIgnores, js.configs.recommended, tier1, tier1Commonjs, tier2LegacyCjs, bootHubs];
