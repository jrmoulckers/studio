/**
 * Shared Prettier config for JRM Studio.
 *
 * Formatting defaults come from the finance app's `.prettierrc.json`; the
 * Tailwind class-sorting plugin (and `cn`/`cva` awareness) comes from jrm-recipes.
 *
 * @type {import("prettier").Config}
 */
import { createRequire } from 'node:module';

// Prettier resolves bare plugin specifiers from its working directory, not from this
// config. Under pnpm's non-hoisted layout the plugin only exists in THIS package's
// node_modules, so resolve it here to an absolute path — otherwise every consumer
// running prettier from its own root fails with "Cannot find package".
const require = createRequire(import.meta.url);

const config = {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  tabWidth: 2,
  printWidth: 100,
  arrowParens: 'always',
  endOfLine: 'lf',
  plugins: [require.resolve('prettier-plugin-tailwindcss')],
  tailwindFunctions: ['cn', 'cva'],
};

export default config;
