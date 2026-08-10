---
'@jrm/tokens': patch
---

Fix WCAG AA failures in the light theme's status colors.

`semantic.status.*` referenced `.500` steps tuned for dark surfaces, so on light
surfaces all four failed AA and two also failed the 3:1 non-text minimum:
positive 1.92:1, negative 2.77:1, warning 1.67:1, info 2.14:1 against white.
These are not decorative-only — `--button-danger-text` and
`--button-danger-border` resolve from `status.negative`, so body text was
rendering at 2.77:1.

The light theme now references steps chosen to clear AA on the *worst* light
surface (`haze`, `#e7e7f4`) rather than only on white: `win.700`, `loss.700`,
`caution.800`, and `info.800`. Amber and cyan need the extra step because at
`.700` they measure 4.37:1 and 4.28:1 on haze. All four also clear AA for white
text placed on them as fills, so badge and button fill roles improve too.

Dark, OLED, and high-contrast are unchanged — they already passed, and
high-contrast already referenced `.700`. No token names were added, removed, or
renamed, so this is a value-only retarget with no consumer API change.
