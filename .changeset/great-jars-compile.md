---
'@jrm/tokens': minor
---

Add native token output for Android (Jetpack Compose) and Apple (SwiftUI).

Studio's tokens reached the web through CSS variables and a Tailwind preset, but native
consumers had no distribution at all — and drifted accordingly. `finance`'s Android layer had
hand-rolled a Compose theme on an entirely different palette, with most color roles
disagreeing with Studio, and its iOS layer had no token layer whatsoever.

`dist/native/compose/JrmTokens.kt` and `dist/native/swift/JRMTokens.swift` now ship a
`JrmColorScheme`/`JRMColorScheme` per documented theme, a theme selector, and the spacing,
radius, target, focus, type, opacity, layer, and duration scales. Both render from the same
resolved token trees as the CSS and JS output, so native cannot disagree with web.

Three values are translated at the native boundary because they have no native equivalent:
OKLCH colors are converted to sRGB through Oklab (clamping out-of-gamut channels as browsers
do), the `rem` type scale resolves against a 16px root so `1rem` lands on 16sp/16pt, and
durations become Kotlin millisecond `Int`s and Swift `TimeInterval` seconds. Output is plain
values with no `MaterialTheme` or SwiftUI-environment wiring, keeping it framework-neutral.
