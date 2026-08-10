---
'@jrm/tokens': minor
---

Absorb the cognitive component set and numeric figure support.

Adds `component/cognitive.json` (button, input, card, nav, list-item), `font.variantNumeric`
primitives, and a `text.amount` semantic role for tabular figures.

The component sizing is now applied under `[data-a11y-cognitive="true"]`, generated from the
token file so a new variant or property cannot keep its default sizing by omission.
