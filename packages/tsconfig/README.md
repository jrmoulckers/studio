# @jrm/tsconfig

Shared [TypeScript](https://www.typescriptlang.org/) configs for JRM Studio. A strict
base seeded from the jrm-recipes app config, plus framework variants.

> **Transitional ownership:** this package remains workspace-internal in Studio pending an
> additive migration to Engineering. It has not moved and is not published, synced, or
> otherwise downstream-consumable. The usage below applies inside this monorepo only.

| Config        | Extend with                 | Use for                                                      |
| ------------- | --------------------------- | ------------------------------------------------------------ |
| `base.json`   | `@jrm/tsconfig/base.json`   | Framework-agnostic base (strict, ES2022, bundler resolution) |
| `react.json`  | `@jrm/tsconfig/react.json`  | React / Next.js apps (`jsx: react-jsx`, DOM libs)            |
| `svelte.json` | `@jrm/tsconfig/svelte.json` | Svelte / Vite apps (`verbatimModuleSyntax`, DOM libs)        |
| `node.json`   | `@jrm/tsconfig/node.json`   | Node tooling/services (`NodeNext`, `@types/node`)            |

## Usage

```jsonc
// tsconfig.json
{
  "extends": "@jrm/tsconfig/react.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "~/*": ["./src/*"] },
  },
  "include": ["src", "**/*.ts", "**/*.tsx"],
}
```

Override anything you need in your local `compilerOptions`; the shared file only sets the
defaults every JRM product should agree on.
