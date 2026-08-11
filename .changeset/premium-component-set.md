---
'@jrm/tokens': minor
---

Absorb the premium-tier component set from finance: `premium-badge`, `premium-gate`,
`premium-upsell`, and `premium-paywall`.

Three deliberate changes rather than a verbatim port:

- **`premium-gate.icon` is `text.secondary`, not `text.disabled`.** A lock glyph is the
  only signal that a feature is gated, so it carries information and WCAG 1.4.11 applies;
  the disabled-state exemption does not. Finance's choice measured 1.24:1 (light),
  1.56:1 (dark) and 1.74:1 (dark-oled). The replacement clears 3:1 in every theme.
- **`premium-gate.overlay-opacity` is new.** Finance's overlay was documented as "applied
  with opacity" but shipped no opacity token, leaving each consumer to invent one. It now
  shares the modal scrim strength.
- **`premium-paywall.cta-min-height` is new**, resolving through `target.min` so the
  primary purchase control cannot fall under the touch-target floor.

`premium-upsell.radius` moves 12px → 16px to match the shared container radius already
used by `card` and `tile`.

Five premium color pairs join `CONTRAST_PAIRS`, including the badge pair that measured
4.35:1 in finance and clears only because of the light interactive ramp shift.
