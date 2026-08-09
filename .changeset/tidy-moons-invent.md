---
'@jrm/tokens': minor
---

Add the theme-agnostic structural token categories consumers proved out independently.

`layer` (named stacking planes over a new `zIndex` primitive), `state` (interaction
strengths over a new `opacity` primitive), `elevation` (named intent over the existing
per-theme shadows), `focus` (base ring width/offset), and `target` (minimum pointer
targets) close the gap that led `finance` to maintain a parallel token system and left
`jrm-recipes` and `score-king` inventing their own focus and tap-target sizing.

All additions are purely additive and theme-agnostic — no existing token name, value, or
per-theme color contract changes. `button`, `input`, and `nav` now derive their control
height from `target.min` instead of repeating a `46px` literal.
