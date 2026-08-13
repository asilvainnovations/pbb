/**
 * ESLint configuration — PBB platform.
 *
 * Deliberately small. The goal is to catch the classes of bug this codebase
 * has actually shipped (an undeclared identifier that broke the build for
 * everyone, unused imports left behind after a refactor), not to impose a
 * style debate 32 days before an election.
 */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react-refresh'],
  ignorePatterns: [
    'dist',
    'node_modules',
    'public/**',          // hand-written static site, linted by html-validate
    'supabase/functions', // Deno runtime, different globals and import syntax
    '*.config.js',
    '*.config.cjs',
  ],
  rules: {
    // The rule that would have caught the TS2304 build break at commit time.
    'no-undef': 'error',

    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],

    // `any` is a warning, not an error — the ACAPS API response shape is not
    // fully known and pretending otherwise would be worse than an escape hatch.
    '@typescript-eslint/no-explicit-any': 'warn',

    // Credentials must never reach the console in a browser build.
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    eqeqeq: ['error', 'smart'],
    'no-var': 'error',
    'prefer-const': 'error',
  },
  overrides: [
    {
      // Build-time configs run in Node, not the browser.
      files: ['vite.config.ts', 'tailwind.config.js', 'postcss.config.js', '.eslintrc.cjs'],
      env: { node: true, browser: false },
      rules: { 'no-undef': 'off' },
    },
    {
      // Context modules intentionally export a provider component AND its
      // hook/context from one file. That is the idiomatic React pattern; the
      // only cost is a full reload instead of a hot update during dev.
      files: ['src/contexts/**/*.tsx'],
      rules: { 'react-refresh/only-export-components': 'off' },
    },
  ],
}
