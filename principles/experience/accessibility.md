# Studio principles — Accessibility

> **Ratification:** Each principle's `Status` becomes effective only when the repository owner
> merges the covering Ratification decision record; before that merge, the candidate change is
> proposed and non-normative.
>
> Owner-ratified Studio design authority superseding the removed legacy accessibility guidance.
> Every disposition stays traceable in the final [migration ledger](../migration-ledger.json).
> Legacy inputs are cited by stable `<realm>#<n>` ID.

## Purpose

This area governs Studio's cross-cutting accessibility contract: the WCAG floor in every theme,
accessibility modes as first-class runtime modes, and the cognitive mode — including the explicit
gap between the ratifiable standard and the current implementation.

## Principles

### STUDIO-A11Y-001 — WCAG 2.2 AA is the floor in every theme, from tokenized pairings

- **Status:** Ratified
- **Statement:** Meet WCAG 2.2 Level AA in every shipped theme by taking every foreground/background pairing from the semantic color contract — text ≥ 4.5:1, large text and UI/graphics ≥ 3:1 — and never conveying information by color alone.
- **Rationale:** Contrast is a property of a color pair, not a single value; centralizing it in the tokens means one audited palette protects every product, and a palette that passes in light but fails in dark ships a broken mode.
- **Verification:** Contrast is verified for light, dark, dark-OLED, and high-contrast against the semantic pairings, not local overrides; every color-coded state carries a second non-color cue; a pairing that fails AA is fixed in the token contract, not with a local literal.
- **Ratification owner:** repository owner
- **Implementation owner:** accessibility-reviewer
- **Handoffs:** WCAG conformance as legal/contractual evidence is a Product/Compliance obligation; automated-scan CI wiring and evidence capture are Engineering.
- **Legacy inputs:** accessibility#1, accessibility#2, design#5

### STUDIO-A11Y-002 — Accessibility modes are first-class, user-overridable runtime modes

- **Status:** Ratified
- **Statement:** Ship high-contrast, reduced-motion, and cognitive support as real, tested runtime modes that default to the OS preference but expose an in-product override that persists and always wins over the detected default.
- **Rationale:** OS-level settings are all-or-nothing across every app and many users cannot or will not change them globally — on a shared, borrowed, or managed device they may not be able to at all — so honoring only the system preference makes accessibility contingent on control the user may lack.
- **Verification:** Each accessibility mode is included in the theme/regression matrix and stays current with the default palette; the in-product preference initializes from the media query, can be overridden, persists across reloads, and is not silently re-clobbered by the media query.
- **Ratification owner:** repository owner
- **Implementation owner:** accessibility-reviewer
- **Handoffs:** Persistence storage mechanisms are Engineering; the runtime mechanism that swaps modes is the token attribute model in [tokens and themes](../design/tokens-and-themes.md).
- **Legacy inputs:** accessibility#2, accessibility#3, architecture#13

### STUDIO-A11Y-003 — Cognitive mode remaps the full role set; the current gap is explicit

- **Status:** Ratified
- **Statement:** Define cognitive mode as a single root-attribute switch that remaps the full set of semantic roles — type, spacing, focus, elevation, border, and touch-target — and zeroes motion, and treat any implementation that remaps only a subset as not yet meeting this principle.
- **Rationale:** Users with ADHD, autism, TBI, dyslexia, age-related decline, or situational overload are excluded by dense, animated UI; driving the mode from the token layer ships it once for every product, but a mode that changes only font size is precisely the anti-pattern this principle exists to forbid.
- **Verification:** Enabling cognitive mode measurably changes type, spacing, focus, elevation, border, and touch-target roles and disables motion; a check asserts each role is actually remapped. **Current implementation gap — do not mark satisfied:** the current root mode remaps type and motion only, because the default output exposes no semantic focus/elevation/border/touch-target roles to remap onto; spacing/focus/elevation/border/touch-target remain emitted-but-unapplied. Closing the gap requires adding that semantic role layer and will alter the generated distribution.
- **Ratification owner:** repository owner
- **Implementation owner:** design-engineer
- **Handoffs:** Plain-language content and terminology are Product; the semantic role layer that closes the gap is a Studio token-tier change in [tokens and themes](../design/tokens-and-themes.md); the distribution rebuild is generated and Engineering/`.github`-mechanized.
- **Legacy inputs:** accessibility#7, design#8

## Related material

- [Interaction](interaction.md) covers keyboard/switch, focus, target size, and the imperative
  reduced-motion path.
- [Tokens and themes](../design/tokens-and-themes.md) owns the role layer these modes remap.
