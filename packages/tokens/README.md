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
│   ├── opacity.json  zindex.json  focus.json  target.json
│   └── cognitive.json    # cognitive-a11y raw primitives (touch target, ring, border)
├── themes/
│   └── default/          # FIRST theme — Royal Violet / Crown Gold (seeded from score-king)
│       ├── color.primitive.json                # tonal ramps, player + chart palettes, oled surfaces
│       ├── color.semantic.light.json           # :root (default)
│       ├── color.semantic.dark.json            # [data-theme="dark"]  (canonical mode)
│       ├── color.semantic.dark-oled.json       # [data-theme="dark-oled"]  (true-black)
│       ├── color.semantic.high-contrast.json   # [data-theme="high-contrast"]
│       ├── color.semantic.high-contrast-dark.json # [data-theme="high-contrast-dark"]
│       └── color.alias.json                    # flat --color-* back-compat aliases
├── semantic/             # theme-agnostic purposes
│   ├── typography.json  motion.json  cognitive.json
│   └── layer.json  state.json  elevation.json
└── component/            # theme-agnostic bindings → semantic names only
    ├── button.json  card.json  input.json  pill.json  avatar.json  nav.json
```

### Structural taxonomy (theme-agnostic)

Alongside color, the kernel publishes the structural categories every consumer needs. These
carry no color, so they are declared once in `:root` and are **not** re-declared per
`[data-theme]` — a mode override would be a bug, and the contract tests assert it.

| group       | tokens                                                                                                          | purpose                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `layer`     | `content` `raised` `nav` `scrim` `dialog` `toast` `tooltip`                                                     | Named stacking planes. Reference these, never the raw `zIndex.*` steps.                |
| `state`     | `hover.overlay` `hover.surface-overlay` `pressed.overlay` `selected.overlay` `disabled.opacity` `scrim.opacity` | Interaction strengths as opacities, so one set composes over any surface in any theme. |
| `elevation` | `flat` `hairline` `raised`                                                                                      | Names intent over the per-theme `shadow.*` pair — the Soft-Lift Rule still holds.      |
| `focus`     | `ring.width` `ring.offset`                                                                                      | Base ring geometry; a mode widens the ring by redefining one token.                    |
| `target`    | `min` `compact` `spacious`                                                                                      | Minimum pointer targets. Components derive from these instead of pixel literals.       |

`elevation.*` resolves through the theme-scoped `shadow.lift` / `shadow.hairline` aliases, so
each mode re-flows automatically without a per-theme elevation file.

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
`data-theme="dark"`), `dark-oled` (true-black `#000` surfaces for OLED), `high-contrast`, and
`high-contrast-dark` are `[data-theme]` overrides that only restate the semantic colors, so
component vars and flat aliases in `:root` re-flow automatically.

`high-contrast-dark` serves users who need maximum contrast _and_ dark surfaces. It previously
existed only as a hand-maintained `@media` block in the generated `index.css`, which meant JS and
native consumers could not see it and no user could select it explicitly. It is now a real theme
backed by its own file, and the media block is generated from that same file so the two paths
cannot drift.

### Auto-switching & accessibility

The generated `index.css` bakes in system-preference auto-switching (each guarded with
`:root:not([data-theme])` so an explicit `[data-theme]` always wins):

- `@media (prefers-color-scheme: dark)` → dark palette
- `@media (prefers-contrast: more)` → high-contrast palette + CVD-safe chart ramp
- `@media (prefers-color-scheme: dark) and (prefers-contrast: more)` → the full
  `high-contrast-dark` palette + CVD-safe chart ramp
- `@media (prefers-reduced-motion: reduce)` → motion durations collapse to `1ms`

`1ms`, not `0ms`: a zero-duration transition never dispatches `transitionend`/`animationend`, so
listeners awaiting those events would hang for exactly the users who opted out of motion.

Both this block and the cognitive-mode block are **generated from `semantic/motion.json`**. They
were previously hand-maintained lists of three purposes, which meant a newly authored motion
purpose kept animating under `prefers-reduced-motion` and nothing failed. Adding a purpose to
`motion` is now sufficient; a contract test pins that every `--motion-*-duration` is collapsed in
both blocks.

**Cognitive mode:** set `data-a11y-cognitive="true"` to step up the type scale, relax leading,
and disable motion (finance's activation mechanism).

## Accessibility base stylesheet

The a11y tokens (`--focus-ring-*`, `--target-*`) describe an intent, but a token cannot apply
itself. `@jrm/tokens/css/a11y` is the missing application layer — the rules every consumer was
otherwise writing, and drifting on, independently:

```css
@import '@jrm/tokens/css';
@import '@jrm/tokens/css/a11y';
```

| Provides                                          | Notes                                                      |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `:focus-visible` ring + composite `:focus-within` | Token-driven; `:focus` suppression guarded by `@supports`  |
| `.jrm-sr-only` / `.jrm-sr-only-focusable`         | `clip-path` technique — stays in the accessibility tree    |
| Touch targets (WCAG 2.5.8)                        | Controls and widget roles only, plus `.jrm-target-compact` |
| Dark-surface picker chrome                        | Selector list **generated** from the theme set             |
| `@media (forced-colors: active)`                  | Re-anchors the ring to `CanvasText`                        |

Two decisions worth knowing. Target sizing deliberately excludes bare `a[href]`: a minimum
inline size on every anchor breaks inline prose links, so it keys off real controls and explicit
widget roles instead. And the dark-mode selector list is not hand-written — the build classifies
each mode by measuring the relative luminance of its own `background.primary`, so a sixth theme
scopes itself. A contract test re-derives that set from the shipped CSS and fails on any drift.

Utilities are `.jrm-`-prefixed because Tailwind already defines a bare `.sr-only`.

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
│   ├── tokens-high-contrast-dark.css # [data-theme="high-contrast-dark"]
│   ├── a11y.css                  # focus ring, sr-only, target sizing, forced-colors
│   └── index.css                 # @imports all modes + auto-switching + cognitive blocks
├── tailwind/default.cjs          # complete, self-sufficient Tailwind preset (var(--…)-backed)
├── native/
│   ├── compose/JrmTokens.kt      # Android — JrmColorScheme per theme + Dp/sp/Float scales
│   └── swift/JRMTokens.swift     # Apple — JRMColorScheme per theme + CGFloat scales
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
(`css/`, `tailwind/`, `native/`, `js/`) from `build/` into `dist/`:

```
packages/tokens/dist/
├── css/default/{tokens,tokens-dark,tokens-dark-oled,tokens-high-contrast,tokens-high-contrast-dark,index}.css
├── css/default/a11y.css
├── tailwind/default.cjs
├── native/compose/JrmTokens.kt
├── native/swift/JRMTokens.swift
└── js/
    ├── index.js  index.d.ts
    └── default/tokens.{light,dark,dark-oled,high-contrast,high-contrast-dark}.{js,d.ts}
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
>
> This is now **enforced, not advisory**: `scripts/dist.mjs` refuses to copy any file that isn't
> valid UTF-8 and exits non-zero, so a binary artifact fails the build (and CI, via
> `tokens:dist:check`) instead of reaching a member repo. The check has to live here, because by
> the time the sync engine sees the file the original bytes are already gone.
>
> **The UTF-8 check does not cover every way a file becomes binary.** Git's heuristic is not only
> about NUL bytes: a file whose CR count exceeds its CRLF pairs is classified `-text`. A doubled
> `\r\r\n` file is _valid UTF-8_, so it passes `dist.mjs` and is still treated as binary — at which
> point it becomes **exempt from `eol=lf`**, and `git add --renormalize` **skips it**, so the
> corruption blocks its own repair while the remedy reports success. `pnpm text:check`
> (`scripts/validate-text-classification.mjs`) covers that gap for every tracked file, not just
> `dist/`. Canon shipped thirteen health files in exactly this state before it was caught.

### Freshness guard

`dist/` must never silently diverge from the token sources. A check regenerates it and fails on
any diff — run it locally, and it also runs in CI (`.github/workflows/ci.yml`):

```bash
pnpm tokens:dist:check    # regenerates dist, then `git diff --exit-code -- packages/tokens/dist`
```

If it fails, run `pnpm tokens:dist` and commit the updated `dist/`.

### Reporting value shifts

The freshness guard proves `dist/` is **current**. It does not say what changed in _value_, and
that gap is inverted against the risk:

| Change          | Surfaces as    | Risk                                        |
| --------------- | -------------- | ------------------------------------------- |
| Rename, removal | Build breaks   | **Loud** — a consumer investigates          |
| Value shift     | Compiles clean | **Quiet** — layout and contrast move unseen |

The sync engine can't cover for it either: it compares hashes, not meanings, so a 2px shift and a
brand-new file both arrive as a path under **Updated**. The file list is a transport signal, not a
safety signal.

So token value changes are stated as per-token before/after tables in the PR body and release
notes — `spacing.md: 14px → 12px`, not "the spacing tier changed". Generate the table:

```bash
pnpm tokens:diff                    # vs the merge-base with origin/main
pnpm tokens:diff -- --base v1.2.0   # or any explicit ref
```

It diffs the committed `dist/js` theme maps — the bytes consumers actually receive — separates
value shifts from adds and removes, and names the re-check surface: colour moves invalidate
contrast (a passing WCAG 2.2 AA result is not carried over by a value change), dimension moves
change layout. It's a reporter, not a gate, so it is deliberately not part of `pnpm test`.

### Contract tests

From the repository root, `pnpm test` builds the token package and runs the Node test suite.
The suite validates authored DTCG references and theme parity, loads every generated entry
point, checks compatibility aliases and required theme/preferences selectors, and regenerates
the declared text-only `dist/` contract twice to prove byte determinism and stale-file removal.
Negative fixtures exercise each validator so a constant-success guard cannot satisfy the suite.

## Consume

### Product repositories (synced `dist/`)

The sync engine copies this package's committed `dist/` contents to
`vendor/@jrm/tokens/` by default. A product repository consumes those files by path, not
through an `@jrm/tokens` package specifier. Adjust the relative prefix for the consuming
file:

```css
/* app/globals.css or src/app.css */
@import '../vendor/@jrm/tokens/css/default/index.css';
```

```js
// tailwind.config.js
module.exports = {
  presets: [require('./vendor/@jrm/tokens/tailwind/default.cjs')],
  content: ['./src/**/*.{js,ts,jsx,tsx,svelte,html}'],
};
```

```ts
import { tokens, tokensDark } from '../vendor/@jrm/tokens/js/index.js';
```

Some repositories configure a different target (for example,
`apps/web/vendor/@jrm/tokens/`); their imports follow that configured location. Never
hand-edit the vendored files: provenance and drift checks treat the synced bytes as the
interface.

The generated Tailwind preset is **complete and self-sufficient**: alongside the token-backed
theme values it carries the shared shell — the `class` + `[data-theme="dark"]` dark-mode
strategy, the centered container, `borderRadius` `DEFAULT`/`full` aliases, token-backed
`ringWidth`/`ringOffsetWidth`, `env(safe-area-inset-*)` spacing, the structural `zIndex`,
`opacity`, `minHeight`/`minWidth` and elevation `boxShadow` scales, and the `fade-in`/`pop-in`
animations. It `require`s nothing, so it works from a copied directory with no package
resolution. The only thing it cannot carry is a plugin _instance_; add `tailwindcss-animate`
yourself if you use those utilities, or depend on `@jrm/tailwind-preset`, which re-exports this
same object and adds exactly that plugin.

| Utility                                           | Backing token                               |
| ------------------------------------------------- | ------------------------------------------- |
| `z-dialog`, `z-tooltip`                           | `--layer-*`                                 |
| `shadow-raised`, `shadow-hairline`, `shadow-flat` | `--elevation-*`                             |
| `opacity-disabled`, `opacity-subtle`              | `--opacity-*`                               |
| `min-h-min`, `min-w-compact`                      | `--target-*`                                |
| `ring` / `ring-offset` defaults                   | `--focus-ring-width`, `--focus-ring-offset` |
| `p-safe-b`, `pt-safe-t`                           | `env(safe-area-inset-*)`                    |

#### Native (Android and Apple)

Native consumers vendor the same tree and compile the emitted sources directly — there is no
package to install and no build step to run.

```kotlin
// Android — add dist/native/compose/JrmTokens.kt to your source set
val colors = jrmColorScheme(JrmTheme.Dark)
Surface(color = colors.backgroundPrimary) {
    Text("Hello", color = colors.textPrimary, fontSize = JrmFontSize.body)
}
Modifier.padding(JrmSpacing.md).heightIn(min = JrmTarget.min)
```

```swift
// Apple — add dist/native/swift/JRMTokens.swift to your target
let colors = JRMTheme.dark.colors
Text("Hello")
    .foregroundStyle(colors.textPrimary)
    .padding(JRMSpacing.md)
    .frame(minHeight: JRMTarget.min)
```

Both files are rendered from the **same resolved token trees** as the CSS and JS output, so
native cannot drift from web. Three translations happen at the boundary, because these concepts
have no native equivalent:

| Web              | Native                                                                  |
| ---------------- | ----------------------------------------------------------------------- |
| `oklch(L C H)`   | converted to sRGB via Oklab; out-of-gamut channels clamp as browsers do |
| `rem` type scale | resolved against a 16px root, so `1rem` → `16.sp` / `16` pt             |
| `ms` durations   | Kotlin `Int` milliseconds; Swift `TimeInterval` seconds                 |

Themes are exposed as plain values (`JrmTheme` / `JRMTheme` and a color scheme per theme)
rather than wired into `MaterialTheme` or the SwiftUI environment. Choosing how to propagate a
theme is an app decision; this output stays framework-neutral, matching the web contract.

### This workspace

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
