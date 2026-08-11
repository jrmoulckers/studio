---
'@jrm/tokens': patch
---

Pin the previously unguarded `semantic.status.*` contrast obligations and correct a
misleading `high-contrast-dark` token description.

Adds 24 contrast pairs: the six status colours as text on all three page surfaces, and
`semantic.text.primary` on each of the six subtle status fills. No token values change.

The `high-contrast-dark` `positiveSubtle` description previously said its fill "clears AA
for white text". In a dark theme the near-white token is `semantic.text.primary`, not
`semantic.text.inverse` — following it literally yields 3.25:1 and fails AA. The
description now names the correct token and records that `text.inverse` and status-coloured
text are unsupported as foregrounds on those fills.
