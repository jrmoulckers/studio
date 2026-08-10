---
'@jrm/tokens': minor
---

Fix five WCAG 2.2 AA contrast failures in the canonical component set, and add the guard that
catches them.

- `toast.action` now uses `semantic.accent.ink` instead of `semantic.accent.default`. Pure Crown
  Gold measured **1.44:1** on a light toast surface.
- `avatar.text` is now a theme-invariant `color.base.black`. The player fills do not change
  between themes, so an ink that did was measured against the wrong background; white failed on
  all twelve fills.
- The light theme's `interactive` ramp shifts one step to `600/700/800`. `royal-violet.500`
  carried `text.inverse` at only **4.35:1** on primary buttons.

New `assertContrastContract` and `assertAvatarInkContract` measure every composited pair in every
theme, with oklch support so wide-gamut colors are compared rather than skipped.
