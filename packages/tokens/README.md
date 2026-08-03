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
│   ├── shadow.json   motion.json  breakpoint.json
│   └── cognitive.json    # cognitive-a11y raw primitives (touch target, ring, border)
├── themes/
│   └── default/          # FIRST theme — Royal Violet / Crown Gold (seeded from score-king)
│       ├── color.primitive.json                # tonal ramps, player + chart palettes, oled surfaces
│       ├── color.semantic.light.json           # :root (default)
│       ├── color.semantic.dark.json            # [data-theme="dark"]  (canonical mode)
│       ├── color.semantic.dark-oled.json       # [data-theme="dark-oled"]  (true-black)
│       ├── color.semantic.high-contrast.json   # [data-theme="high-contrast"]
│       └── color.alias.json                    # flat --color-* back-compat aliases
├── semantic/             # theme-agnostic: typography + motion + cognitive purposes
│   ├── typography.json  motion.json  cognitive.json
└── component/            # theme-agnostic bindings → semantic names only
    ├── button.json  card.json  input.json  pill.json  avatar.json  nav.json
```

### Semantic taxonomy (`--semantic-*`)

The stable contract every component and theme speaks is the finance-grade `--semantic-*` set:

| group         | tokens                                                                                 |
| ------------- | -------------------------------------------------------------------------------------- |
| `background`  | `primary` `secondary` `elevated` `raised`                                              |
| `text`        | `primary` `secondary` `disabled` `inverse`                                             |
| `border`      | `default` `focus` `error`                                                              |
| `interactive` | `default` `hover` `pressed` `disabled` — the **Royal Violet** ramp                     |
| `accent`      | `default` `ink` — **Crown Gold** (ink darkened to `#806600` on light/HC for WCAG text) |
| `status`      | `positive` `negative` `warning` `info`                                                 |

Plus a per-mode `shadow.lift` / `shadow.hairline` pair and a generic `chart.{1..6}` ramp
(CVD-safe) with `chart.hc.{1..6}` high-contrast variants that auto-swap under high contrast.

### Flat aliases (back-compat)

The original flat `--color-*` names remain as aliases into the new semantics, so existing
consumers keep working and re-flow across every mode automatically:

```
--color-bg → background.primary        --color-primary → interactive.default
--color-surface → background.elevated  --color-primary-strong → interactive.hover
--color-surface-2 → background.secondary  --color-on-primary → text.inverse
--color-surface-3 → background.raised  --color-accent → accent.default
--color-border → border.default        --color-accent-ink → accent.ink
--color-text → text.primary            --color-success → status.positive
--color-text-muted → text.secondary    --color-danger → status.negative
--color-focus-ring → border.focus      --color-warning → status.warning
```

### Color modes

`light` is the CSS `:root` default. `dark` (the canonical narrative mode — the app boots
`data-theme="dark"`), `dark-oled` (true-black `#000` surfaces for OLED), and `high-contrast`
are `[data-theme]` overrides that only restate the semantic colors, so component vars and flat
aliases in `:root` re-flow automatically.

### Auto-switching & accessibility

The generated `index.css` bakes in system-preference auto-switching (each guarded with
`:root:not([data-theme])` so an explicit `[data-theme]` always wins):

- `@media (prefers-color-scheme: dark)` → dark palette
- `@media (prefers-contrast: more)` → high-contrast palette + CVD-safe chart ramp
- `@media (prefers-color-scheme: dark) and (prefers-contrast: more)` → brighter dark-HC combo
- `@media (prefers-reduced-motion: reduce)` → motion durations collapse to `0ms`

**Cognitive mode:** set `data-a11y-cognitive="true"` to step up the type scale, relax leading,
and disable motion (finance's activation mechanism).

## Build

```bash
pnpm --filter @jrm/tokens build
```

generates (all git-ignored):

```
build/
├── css/default/
│   ├── tokens.css                # :root — primitives + light semantic + aliases + components
│   ├── tokens-dark.css           # [data-theme="dark"]
│   ├── tokens-dark-oled.css      # [data-theme="dark-oled"]
│   ├── tokens-high-contrast.css  # [data-theme="high-contrast"]
│   └── index.css                 # @imports all modes + auto-switching + cognitive blocks
├── tailwind/default.cjs          # Tailwind preset object (var(--…)-backed)
└── js/
    ├── default/tokens.<mode>.js + .d.ts
    └── index.js + index.d.ts     # barrel: tokens (=light), tokensDark, tokensDarkOled, themes, …
```

## Distribution (`dist/`) — the committed, synced artifact

JRM Studio is registry-free: `@jrm/tokens` is **never published**. Instead the sync engine (in
the `jrmoulckers/.github` backbone repo) shallow-clones this repo and copies the committed
`packages/tokens/dist/` tree **verbatim** into each opted-in product repo — it never runs this
build. So `dist/` is the byte-for-byte interface those consumers see, and (unlike `build/`) it
**is committed**.

```bash
pnpm --filter @jrm/tokens dist    # or, from the repo root:  pnpm tokens:dist
```

runs the Style Dictionary build and then deterministically mirrors the consumable subset
(`css/`, `tailwind/`, `js/`) from `build/` into `dist/`:

```
packages/tokens/dist/
├── css/default/{tokens,tokens-dark,tokens-dark-oled,tokens-high-contrast,index}.css
├── tailwind/default.cjs
└── js/
    ├── index.js  index.d.ts
    └── default/tokens.{light,dark,dark-oled,high-contrast}.{js,d.ts}
```

The copy is reproducible — files are walked in a stable order and normalized to LF (a repo-root
`.gitattributes` also pins `packages/tokens/dist/** text eol=lf`), so the committed bytes don't
drift across rebuilds or platforms. A repo-root `.prettierignore` excludes `dist/` so formatting
can never rewrite the artifact out from under `tokens:dist:check`.

> **Hard constraint: `dist/` must stay text-only.** The sync engine reads every source file as
> UTF-8 (`assets.mjs:readSource`) and LF-normalizes uncommentable files before hashing. A binary
> artifact placed under `dist/` — a `.woff2`, an image, anything non-text — would be **silently
> corrupted in every member repo**, with no error at either end. If tokens ever need to ship a
> binary asset, it needs a different transport, not this tree.

### Freshness guard

`dist/` must never silently diverge from the token sources. A check regenerates it and fails on
any diff — run it locally, and it also runs in CI (`.github/workflows/ci.yml`):

```bash
pnpm tokens:dist:check    # regenerates dist, then `git diff --exit-code -- packages/tokens/dist`
```

If it fails, run `pnpm tokens:dist` and commit the updated `dist/`.

## Consume

**CSS / Svelte / React (plain vars):**

```css
@import '@jrm/tokens/css';

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
  <html data-theme="dark-oled">
    <html data-theme="high-contrast">
      <html data-a11y-cognitive="true"></html>
    </html>
  </html>
</html>
```

Prefer the `--semantic-*` names for new code; the flat `--color-*` aliases remain for
back-compat:

```css
.button {
  background: var(--semantic-interactive-default);
} /* Royal Violet */
.legacy {
  background: var(--color-primary);
} /* alias → same var */
```

**Typed JS/TS:**

```ts
import { tokens, tokensDark, themes } from '@jrm/tokens';

tokens.semantic.interactive.default; // resolved light value (Royal Violet)
tokensDark.semantic.interactive.default; // resolved dark value
tokens.color.primary; // flat alias — still present
themes['high-contrast'].semantic.text.primary;
```

**Tailwind:** don't import this directly — use [`@jrm/tailwind-preset`](../tailwind-preset),
which wraps `@jrm/tokens/tailwind`.

## Adding a theme

Copy `tokens/themes/default/` to `tokens/themes/<new-theme>/`, restyle the color files
(keep the semantic names), and add an instance in `config/style-dictionary.config.mjs`.
The primitive scales, semantic typography/motion/cognitive, and every component binding are
reused unchanged.
