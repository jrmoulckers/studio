---
'@jrm/tokens': minor
---

Promote `high-contrast-dark` to a real fifth theme.

Users who need both maximum contrast and dark surfaces previously had no theme at all. The combination existed only as a hand-maintained `@media (prefers-color-scheme: dark) and (prefers-contrast: more)` block in the generated `index.css` — a dozen overrides that appeared nowhere else in the system. That block was invisible to JS and native consumers, could not be selected explicitly by anyone whose OS did not happen to report both preferences, and only overrode foregrounds, so it inherited the dark theme's Midnight Court backgrounds while claiming to be high contrast.

`high-contrast-dark` is now backed by its own theme file and emitted through every channel the other four themes use: `[data-theme="high-contrast-dark"]`, a `./css/high-contrast-dark` export, `tokensHighContrastDark` and `themes['high-contrast-dark']` in JS, and `JrmHighContrastDarkColors` / `JRMColorScheme.highContrastDark` in the Compose and SwiftUI output. The media block is now generated from that same file, so the preference-driven path and the explicit path cannot drift apart.

Surfaces drop to pure black for headroom and brand hues rise to their 200–400 steps. Every foreground clears AA on all three surfaces, worst case 5.24:1. Low-emphasis fills use the 700 step rather than the 900 the dark theme uses: 900 carries white text beautifully but sits 1.08:1 against the elevated surface, making the fill imperceptible to the very users this theme exists for. 700 is the only step that keeps AA text while leaving the fill boundary visible.

`DIST_OUTPUTS` grows from 18 to 21 files.
