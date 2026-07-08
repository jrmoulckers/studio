import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

import { base } from './index.js';

/**
 * React variant of the shared JRM Studio ESLint config.
 *
 * Layers `eslint-plugin-react` (flat recommended) + `eslint-plugin-react-hooks`
 * on top of the base config. The new JSX transform means `React` need not be in
 * scope, so `react/react-in-jsx-scope` is disabled.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const reactConfig = [
  ...base,
  {
    files: ['**/*.{jsx,tsx}'],
    ...reactPlugin.configs.flat.recommended,
    languageOptions: {
      ...reactPlugin.configs.flat.recommended.languageOptions,
      globals: { ...globals.browser },
    },
    settings: { react: { version: 'detect' } },
  },
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
];

export default reactConfig;
