---
'@jrm/tokens': minor
---

Add semantic motion purposes and the toast, modal, and skeleton component surfaces.

`semantic/motion.json` gains `page-transition`, `list-item`, `progress`, `celebrate`,
`fade-in`, `fade-out`, and `loading` alongside the existing `press`, `state`, and `tile`.
New component files bind real surfaces to them: `component/toast.json`,
`component/modal.json`, and `component/skeleton.json`.

Fixes a latent accessibility bug found while adding those purposes. The
`prefers-reduced-motion` block and the `data-a11y-cognitive` block each hand-listed
`press`, `state`, and `tile`. That list was invisible from the token side, so any motion
purpose added later would have kept animating for users who asked it not to, with nothing
failing. Both blocks are now generated from the token file, and a contract test pins that
every `--motion-*-duration` collapses to `1ms` in both.
