---
'@jrm/tokens': minor
---

Add a generated accessibility base stylesheet at `@jrm/tokens/css/a11y`.

Studio has always shipped the accessibility tokens — `--focus-ring-width`, `--focus-ring-offset`,
`--target-min` — but nothing that applied them, so every consumer wrote its own focus ring,
screen-reader utility, and dark-surface form-control fix, each drifting independently. This adds
the missing application layer: a `:focus-visible` ring (with the `:focus` suppression guarded by
`@supports`, so it cannot strip focus on browsers that lack the selector), `.jrm-sr-only` /
`.jrm-sr-only-focusable`, WCAG 2.5.8 target sizing, and a `forced-colors` fallback.

Target sizing deliberately excludes bare `a[href]` — a minimum inline size on every anchor breaks
inline prose links — and keys off real controls and explicit widget roles instead, with a
`.jrm-target-compact` opt-out.

The dark-surface selector list is generated rather than hand-written: the build classifies each
color mode by the relative luminance of its own `background.primary`, so a newly added theme
scopes itself. A contract test re-derives that set from the shipped CSS, so the guard is evidence
rather than the generator agreeing with itself.
