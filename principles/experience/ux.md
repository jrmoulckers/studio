# Studio principles — UX

> **Ratification:** Each principle's `Status` becomes effective only when the repository owner
> merges the covering Ratification decision record; before that merge, the candidate change is
> proposed and non-normative.
>
> Studio design-authority successor to legacy UX guidance. It removes no legacy file; the
> migration ledger stays at 0/192. Legacy inputs are cited by stable `<realm>#<n>` ID.

## Purpose

This area governs the usability qualities every Studio surface shares: ease of use, visible
state and clear hierarchy, legible changing/comparable figures, and consolidation before
proliferation. It sits above interaction and component mechanics.

## Principles

### STUDIO-UX-001 — Optimize for ease of use first

- **Status:** Ratified
- **Statement:** When usability and novelty conflict, choose the option that lets a user reach their goal with the least effort, memory, and ambiguity — prefer familiar, conventional patterns and make the common path the default.
- **Rationale:** The system serves users, not the design; clever interfaces that raise cognitive load fail the people using every Studio surface.
- **Verification:** Core actions use conventional, predictable patterns bound to shared component contracts; no core action is reachable only through a hidden gesture or a novel control that needs explaining.
- **Ratification owner:** repository owner
- **Implementation owner:** design-engineer
- **Handoffs:** Which outcomes a product must deliver is a Product obligation; Studio owns how those outcomes are expressed.
- **Legacy inputs:** design#9

### STUDIO-UX-002 — Keep state visible and hierarchy clear

- **Status:** Ratified
- **Statement:** Keep the interface's current state visible through tokenized feedback, give each view a single visually dominant primary action, and let each accent carry exactly one meaning so emphasis stays legible.
- **Rationale:** Users trust and navigate a system they can read; invisible state forces guessing, and three co-equal primary actions or a reused accent stop communicating anything, forcing users to read every control instead of scanning.
- **Verification:** Interactive components render their loading/focus/selection/success/error states; each view has one dominant action with secondary actions stepped down; the accent's single meaning is decided once per product and applied consistently.
- **Ratification owner:** repository owner
- **Implementation owner:** design-engineer
- **Handoffs:** The tokenized feedback and accent roles come from the token tier in [tokens and themes](../design/tokens-and-themes.md); state/error accessibility mechanics are in [interaction](interaction.md).
- **Legacy inputs:** design#9

### STUDIO-UX-003 — Changing and comparable figures use tabular numerals

- **Status:** Ratified
- **Statement:** Render any number that updates in place or stacks in a column for comparison — scores, money, timers, counts — with tabular (fixed-width) numerals applied through the shared type roles and numeric component tokens.
- **Rationale:** In proportional type a `1` is narrower than an `8`, so a live-updating value visibly jitters and columns fail to align; both make numbers harder to compare and the jitter reads as instability.
- **Verification:** Live-updating and column-aligned figures inherit tabular numerals from the shared type/numeric roles rather than an ad-hoc per-component setting.
- **Ratification owner:** repository owner
- **Implementation owner:** design-engineer
- **Handoffs:** The type roles and numeric component tokens live in [tokens and themes](../design/tokens-and-themes.md).
- **Legacy inputs:** design#9

### STUDIO-UX-004 — Consolidate before proliferating

- **Status:** Ratified
- **Statement:** Before adding a new component, variant, or token, exhaust composing or extending what already exists, and require a new primitive to justify why nothing existing fits.
- **Rationale:** Component and token bloat is the slow death of a design system — more surface to learn, maintain, theme, and keep consistent — while consolidation keeps the shared kernel small and sharp.
- **Verification:** A proposed new component/variant/token records why existing specs could not be extended or composed; near-duplicate variants are folded back rather than forked, and additions with no active consumer are rejected.
- **Ratification owner:** repository owner
- **Implementation owner:** design-engineer
- **Handoffs:** Scope and feature decisions that drive proliferation are a Product concern; Studio pushes back on bloat but does not own the roadmap.
- **Legacy inputs:** design#10

## Related material

- [Interaction](interaction.md) and [Components](../design/components.md) supply the mechanics
  these usability qualities ride on.
- [Accessibility](accessibility.md) covers the cognitive mode that reinforces ease of use.
