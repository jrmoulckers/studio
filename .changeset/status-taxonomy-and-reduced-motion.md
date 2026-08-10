---
'@jrm/tokens': minor
'@jrm/tailwind-preset': minor
---

Complete the status-color taxonomy, add a pending hue, and fix reduced-motion event delivery.

**New semantic status tokens (all four themes).** `status.pending` and `status.neutral` join the
existing positive/negative/warning/info roles, and every role gains a `*Subtle` background fill
(`status.positiveSubtle` through `status.neutralSubtle`) for badges, banners, and toasts. Previously
a consumer wanting a tinted status surface had to hand-pick a primitive, which is how the
light-theme contrast defects arose in the first place.

**New `pending` primitive hue (teal, hue 195)** with a full 50-900 ramp. Pending work is not a
warning, so reusing Caution Amber mis-signalled it. Because 195 sits between Win Green (165) and
Info Sky (230), the token description requires pairing with an icon or label rather than relying on
hue alone.

**New 50 and 100 tint steps** on `win`, `loss`, `caution`, and `info`, extending each ramp below its
previous 200 floor to supply the light-theme subtle fills.

**High-contrast theme AA fix.** `status.warning` and `status.info` referenced the 700 steps, which
measure 4.37:1 and 4.28:1 against that theme's `background.raised` surface — below WCAG AA in the
one theme that exists to guarantee contrast. Both now use 800 (7.25:1 and 6.57:1).

**Corrected contrast documentation.** The `$description` ratios published for the light theme's
`warning` and `info` were understated. Measured against the real primitives they are 8.89/7.91/7.25
and 8.05/7.17/6.57 (white/frost/haze), not the previously documented 7.86/6.99/6.41 and
7.82/6.96/6.38. The token values were and remain correct; only the recorded measurements were
wrong, and they ship into CSS comments and native output.

Every status and subtle token is now verified at or above 4.5:1 against `background.primary`,
`background.elevated`, and `background.raised` in all four themes.

**Reduced motion now uses 1ms instead of 0ms.** A zero-duration transition or animation never
dispatches `transitionend` or `animationend`, so any cleanup handler, focus hand-off, or promise
awaiting those events hangs indefinitely for users who prefer reduced motion. This applies to
`duration.reduced`, the `prefers-reduced-motion: reduce` block, and cognitive-accessibility mode.

**Fixed CSS custom-property naming for multi-word tokens.** The Tailwind preset and the
preference-remap blocks joined token path segments verbatim, emitting
`var(--semantic-status-positiveSubtle)` while the stylesheet declared
`--semantic-status-positive-subtle`. Every emitter now shares one kebab-casing helper, so
multi-word token names resolve instead of silently falling back to `inherit`.
