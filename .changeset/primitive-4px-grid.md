---
'@jrm/tokens': minor
---

Adopt a canonical 4px grid for the `spacing` and `radius` primitives.

Both scales are now numeric grid multipliers (`spacing.6` = 24px), with the existing
t-shirt names kept as aliases so no consumer has to be rewritten. Three off-grid spacing
values move by 2px (`xs` 6→4, `sm` 10→8, `md` 14→12); `lg`, `xl`, `2xl` and `3xl` are
unchanged. Radius aliases snap to the grid: `sm` 9→8, `chip` 10→12, `md` 14→16, and `pill`
now references `radius.full`.

Also adds mobile-first viewport thresholds to `breakpoint`, directional easing curves and
longer durations to `motion`, and a graded elevation ladder (plus a dark-theme counterpart)
to `shadow` alongside the existing Soft-Lift shadows.

Native output names a bare grid multiplier `step4` rather than failing to compile, since a
digit-only token name has no remainder to lead with.
