import js from '@eslint/js';
import globals from 'globals';
import sonarjs from 'eslint-plugin-sonarjs';

const vendoredIgnores = {
  ignores: [
    'hallmark/**',
    'micode/**',
    'superpowers/**',
    'ui-ux-pro-max-skill/**',
    'plugins/**',
    'python-runtime/**',
    'dist/**',
    'build/**',
    '.worktrees/**',
  ],
};

const tier1 = {
  files: [
    'public/js/**/*.mjs',
    'public/js/**/*.js',
    'public/js/**/*.cjs',
    'lib/**/*.mjs',
    'lib/**/*.js',
    'lib/**/*.cjs',
  ],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    globals: { ...globals.browser, ...globals.node },
  },
  plugins: { sonarjs },
  rules: {
    ...js.configs.recommended.rules,
    complexity: ['error', { max: 15 }],
    'max-depth': ['error', 4],
    'sonarjs/cognitive-complexity': ['error', 20],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};

const tier1Commonjs = {
  files: ['lib/**/*.cjs', 'public/js/**/*.cjs'],
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
    'sonarjs/cognitive-complexity': 'warn',
  },
};

const generatedIgnores = {
  ignores: [
    'public/js/chunks/**',
    'public/js/app.bundle.mjs',
    'public/js/app.bundle.js',
    'public/js/**/*.map',
    'lib/**/fixtures/**',
  ],
};

const rootProcessCommonjs = {
  files: ['main.js', 'preload.js'],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'commonjs',
    globals: { ...globals.node },
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
  },
};

const rootProcessEsm = {
  files: ['generate-censo.js'],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    globals: { ...globals.node },
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
  },
};

const rootProcessRecetaHu = {
  files: ['generate-receta-hu.js', 'generate-receta-hu.test.js'],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'commonjs',
    globals: { ...globals.node },
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
  },
};

const scriptsBlock = {
  files: ['scripts/**/*.mjs', 'scripts/**/*.js', 'scripts/**/*.cjs'],
  languageOptions: {
    ecmaVersion: 2022,
    globals: { ...globals.node },
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
  },
};

const scriptsEsm = {
  files: ['scripts/**/*.mjs'],
  languageOptions: {
    sourceType: 'module',
  },
};

const scriptsCommonjs = {
  files: ['scripts/**/*.js', 'scripts/**/*.cjs'],
  languageOptions: {
    sourceType: 'commonjs',
    globals: { ...globals.node, module: 'readonly', require: 'readonly', exports: 'writable' },
  },
};

export default [
  vendoredIgnores,
  generatedIgnores,
  js.configs.recommended,
  tier1,
  tier1Commonjs,
  tier2LegacyCjs,
  rootProcessCommonjs,
  rootProcessEsm,
  rootProcessRecetaHu,
  scriptsBlock,
  scriptsEsm,
  scriptsCommonjs,
];
