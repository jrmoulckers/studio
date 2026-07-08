import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

/**
 * Shared flat ESLint config for JRM Studio.
 *
 * Seeded from the finance app's `eslint.config.mjs`, minus the finance-only
 * money-formatting rule. Provides `@eslint/js` + `typescript-eslint` recommended
 * rules with JRM conventions (unused-vars underscore escape hatch, `no-console`
 * warnings, relaxed globals for config/tooling files).
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const base = [
  {
    ignores: [
      '**/build/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/coverage/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mts,cts,js,mjs,cjs,jsx}'],
    rules: {
      'no-console': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Config, tooling and CommonJS files: allow logging + require().
    files: [
      '**/*.config.{js,mjs,cjs,ts}',
      '**/*.cjs',
      '**/scripts/**',
      '**/tools/**',
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];

export default base;
