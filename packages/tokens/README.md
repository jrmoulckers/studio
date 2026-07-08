# @jrm/tokens

The design-token source of truth for **JRM Studio**. Tokens are authored once in
framework-agnostic [DTCG](https://tr.designtokens.org/) JSON (`$value` / `$type`, `{ref}`
aliases) and compiled by [Style Dictionary](https://styledictionary.com) v5 into three
outputs that travel across Next.js, Svelte, and React:

1. **CSS custom properties** — plain `:root` variables + `[data-theme]` mode overrides.
2. **A Tailwind preset object** — every value is a `var(--…)` reference, so runtime theme
   swaps re-flow utilities with no rebuild. Consumed by `@jrm/tailwind-preset`.
3. **Typed JS/TS token objects** — mode-resolved, `as const`-style literal types.

## Token architecture

Three DTCG tiers — **primitive → semantic → component** — so a new product theme swaps
values, not structure.

```
tokens/
├── primitive/            # shared, mode-independent scales
│   ├── spacing.json  radius.json  typography.json
│   └── shadow.json   motion.json  breakpoint.json
├── themes/
│   └── default/          # FIRST theme — Royal Violet / Crown Gold (seeded from score-king)
│       ├── color.primitive.json           # OKLCH tonal ramps + 12-color player palette
│       ├── color.semantic.light.json      # :root (default)
│       ├── color.semantic.dark.json       # [data-theme="dark"]  (canonical mode)
│       └── color.semantic.high-contrast.json  # [data-theme="high-contrast"]
├── semantic/             # theme-agnostic: typography + motion purposes
│   ├── typography.json  motion.json
└── component/            # theme-agnostic bindings → semantic names only
    ├── button.json  card.json  input.json  pill.json  avatar.json  nav.json
```

Semantic color names are the stable contract every component and theme speaks:
`bg`, `surface`, `surface-2`, `surface-3`, `border`, `text`, `text-muted`,
`primary`, `primary-strong`, `on-primary`, `accent`, `accent-ink`,
`success`, `danger`, `warning`, `focus-ring` (+ a `shadow.lift` / `shadow.hairline` pair).

### Color modes

`light` is the CSS `:root` default; `dark` (the canonical narrative mode — the app boots
`data-theme="dark"`) and `high-contrast` are `[data-theme]` overrides that only restate the
~15 semantic colors, so component vars in `:root` re-flow automatically. Motion tokens ship
a `prefers-reduced-motion` block that collapses durations to `0ms`.

## Build

```bash
pnpm --filter @jrm/tokens build
```

generates (all git-ignored):

```
build/
├── css/default/
│   ├── tokens.css                # :root — primitives + light semantic + components
│   ├── tokens-dark.css           # [data-theme="dark"]
│   ├── tokens-high-contrast.css  # [data-theme="high-contrast"]
│   └── index.css                 # @imports all three + reduced-motion block
├── tailwind/default.cjs          # Tailwind preset object (var(--…)-backed)
└── js/
    ├── default/tokens.<mode>.js + .d.ts
    └── index.js + index.d.ts     # barrel: tokens (=light), tokensDark, themes, …
```

## Consume

**CSS / Svelte / React (plain vars):**

```css
@import "@jrm/tokens/css";

.card {
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lift);
}
```

Switch modes by setting an attribute anywhere up the tree:

```html
<html data-theme="dark">
<html data-theme="high-contrast">
```

**Typed JS/TS:**

```ts
import { tokens, tokensDark, themes } from "@jrm/tokens";

tokens.color.primary;          // resolved light value
tokensDark.color.primary;      // resolved dark value
themes["high-contrast"].color.text;
```

**Tailwind:** don't import this directly — use [`@jrm/tailwind-preset`](../tailwind-preset),
which wraps `@jrm/tokens/tailwind`.

## Adding a theme

Copy `tokens/themes/default/` to `tokens/themes/<new-theme>/`, restyle the four color
files (keep the semantic names), and add an instance in `config/style-dictionary.config.mjs`.
The primitive scales, semantic typography/motion, and every component binding are reused
unchanged.
