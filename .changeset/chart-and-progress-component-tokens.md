---
'@jrm/tokens': minor
---

Add `chart` and `progress` component token layers, ported up from finance's `@finance/design-tokens` package so Studio is the superset for data-visualization and determinate-progress surfaces.

`chart` contributes 26 leaves covering surface, axis, grid, legend, tooltip, bar and slice geometry, and a six-step series ramp plus an `other` bucket, all referencing the existing CVD-safe chart ramp that the high-contrast themes already remap. `progress` contributes 15 leaves covering track, fill, geometry, motion, labels, and five state colors bound to the semantic status taxonomy.

Both layers are re-expressed against Studio's own scales rather than finance's — t-shirt spacing, Studio's `radius` and `elevation` keys, and `motion.state.*` — so they compose with the rest of the system instead of importing a second, parallel vocabulary. Every state token's description names the icon and text label it must be paired with, since neither charts nor progress may convey meaning through color alone.
