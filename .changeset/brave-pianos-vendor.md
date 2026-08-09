---
'@jrm/tailwind-preset': minor
'@jrm/tokens': minor
---

Make the vendored Tailwind preset self-sufficient.

Product repositories receive `packages/tokens/dist` as a copied directory rather than an
installed package, so `require('@jrm/tokens/tailwind')` — and therefore the whole
`@jrm/tailwind-preset` shell — could never resolve downstream. The generated preset now
carries that shell itself: the `class` + `[data-theme="dark"]` dark-mode strategy, the
centered container, `borderRadius` `DEFAULT`/`full` aliases, and the `fade-in`/`pop-in`
animations. It requires no module, so it is a drop-in preset from any vendored path.

The preset also gains token-backed scales that were previously unreachable from utilities:
`ringWidth`/`ringOffsetWidth` from `--focus-ring-width`/`--focus-ring-offset`, `zIndex` from
`--layer-*`, `boxShadow` from `--elevation-*`, `opacity`, `minHeight`/`minWidth` from
`--target-*`, and `env(safe-area-inset-*)` spacing.

`@jrm/tailwind-preset` now re-exports the generated preset and adds only the
`tailwindcss-animate` plugin instance, so the shell has a single definition and vendored and
installed consumers cannot drift. `REQUIRED_TAILWIND_SHELL` makes that shell a declared
contract with negative-mutation coverage.
