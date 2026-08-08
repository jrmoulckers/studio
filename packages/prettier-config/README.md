# @jrm/prettier-config

Shared [Prettier](https://prettier.io/) config for JRM Studio. Formatting defaults are
seeded from the finance app; Tailwind class sorting (with `cn`/`cva` awareness) is seeded
from jrm-recipes.

> **Transitional ownership:** this package remains workspace-internal in Studio pending an
> additive migration to Engineering. It has not moved and is not published, synced, or
> otherwise downstream-consumable. The usage below applies inside this monorepo only.

## Usage

Reference it from `package.json`:

```jsonc
{
  "prettier": "@jrm/prettier-config",
}
```

Or re-export it from a config file when you need to extend it:

```js
// prettier.config.mjs
import base from '@jrm/prettier-config';

export default {
  ...base,
  // project-specific overrides
};
```

> Requires `prettier` (peer) and ships `prettier-plugin-tailwindcss`. If your project does
> not use Tailwind, drop the plugin in a local override.
