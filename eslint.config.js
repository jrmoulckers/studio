import base from '@jrm/eslint-config';

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: ['**/build/**', '**/dist/**', '**/.turbo/**', '**/node_modules/**'],
  },
  ...base,
];
