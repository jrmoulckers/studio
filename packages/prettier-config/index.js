/**
 * Shared Prettier config for JRM Studio.
 *
 * Formatting defaults come from the finance app's `.prettierrc.json`; the
 * Tailwind class-sorting plugin (and `cn`/`cva` awareness) comes from jrm-recipes.
 *
 * @type {import("prettier").Config}
 */
const config = {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  tabWidth: 2,
  printWidth: 100,
  arrowParens: 'always',
  endOfLine: 'lf',
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindFunctions: ['cn', 'cva'],
};

export default config;
