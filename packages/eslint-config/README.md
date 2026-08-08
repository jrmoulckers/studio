# @jrm/eslint-config

Shared flat [ESLint](https://eslint.org/) config for JRM Studio, seeded from the finance
app's `eslint.config.mjs` (minus finance-specific rules). Requires ESLint 9+ (flat config).

> **Transitional ownership:** this package remains workspace-internal in Studio pending an
> additive migration to Engineering. It has not moved and is not published, synced, or
> otherwise downstream-consumable. The usage below applies inside this monorepo only.

| Entry | Import                     | Use for                                                |
| ----- | -------------------------- | ------------------------------------------------------ |
| base  | `@jrm/eslint-config`       | Any TS/JS package (JS + typescript-eslint recommended) |
| react | `@jrm/eslint-config/react` | React / Next.js apps (adds react + react-hooks)        |

## Usage

```js
// eslint.config.js
import base from '@jrm/eslint-config';

export default [
  ...base,
  {
    // project-specific overrides
  },
];
```

React:

```js
// eslint.config.js
import react from '@jrm/eslint-config/react';

export default [...react];
```
