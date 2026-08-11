---
'@jrm/tokens': minor
---

Close the chart component token gaps against `@finance/design-tokens`.

Adds 15 leaves to `component/chart.json` (26 → 41): container height budget
(`min-height`, `default-height`, `max-height`), legend `swatch-size`, donut
`slice-stroke-width` and `donut-inner-ratio`, line-series `line-width`,
`dot-radius` and `dot-radius-active`, empty-state `empty-icon` and `empty-text`,
and four motion leaves aliasing `motion.progress.*` and `motion.fade-in.*`.

Also pins the first five contrast pairs for the chart set, which previously had
none.
