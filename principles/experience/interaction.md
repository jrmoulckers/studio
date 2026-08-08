# Studio principles — Interaction

> **Status:** Draft (proposed, non-normative). Only the repository owner may ratify.
>
> Studio design-authority successor to legacy interaction guidance. It removes no legacy file;
> the migration ledger stays at 0/192. Legacy inputs are cited by stable `<realm>#<n>` ID.

## Purpose

This area governs how Studio surfaces behave under real input: native semantics, keyboard and
switch operability, focus, target size, error and status feedback, and motion. It is the
user-facing interaction contract that component implementations must meet.

## Principles

### STUDIO-INT-001 — Convey structure and state through native semantics first

- **Status:** Draft
- **Statement:** Build interactive UI from native semantic elements and controls that carry role, name, and state, and reach for ARIA only to fill a genuine gap — never to override or restate correct native semantics.
- **Rationale:** Native elements come with keyboard behavior, roles, and states for free, and incorrect or redundant ARIA actively misleads assistive-technology users — "no ARIA is better than bad ARIA."
- **Verification:** Actions use native controls (not click-handled generic elements); every control has an accessible name; heading and landmark structure is correct; custom widgets expose accurate role/name/state, and async updates announce through a live region.
- **Ratification owner:** repository owner
- **Implementation owner:** web-engineer and native-app-engineer
- **Handoffs:** Locale/direction of the document (`lang`/`dir`) is coordinated with [localization](localization.md); Engineering owns the framework rendering mechanisms.
- **Legacy inputs:** accessibility#5, frontend#4

### STUDIO-INT-002 — Everything is operable by keyboard and switch

- **Status:** Draft
- **Statement:** Make every interactive control reachable, operable, and clearly focus-visible by keyboard or switch alone, in a logical order, with focus managed on navigation and dialogs and no keyboard traps.
- **Rationale:** Keyboard operability is the foundation most assistive technology builds on; a pointer-only control is invisible to switch, screen-reader, and power users alike.
- **Verification:** Walking the interface with keyboard/switch only reaches and operates every control in logical order; a visible focus indicator survives every theme and mode; modals trap and restore focus; nothing removes focus styling without an equivalent replacement.
- **Ratification owner:** repository owner
- **Implementation owner:** web-engineer and native-app-engineer
- **Handoffs:** The visible focus role is supplied by the token tier in [tokens and themes](../design/tokens-and-themes.md); Engineering owns the event/focus mechanisms of each framework.
- **Legacy inputs:** accessibility#4, frontend#4

### STUDIO-INT-003 — Interactive targets meet minimum size and spacing

- **Status:** Draft
- **Statement:** Size every interactive target and its spacing to at least the platform minimum (WCAG 2.5.8: 24×24 CSS px with adequate spacing; prefer ≥ 44×44 for touch), giving icon-only controls a padded hit area even when the glyph is small.
- **Rationale:** Small or crowded targets exclude users with motor impairments and anyone on touch, which is most of the PWA audience.
- **Verification:** Automated and manual checks confirm interactive targets and spacing meet the minimum in every mode, including icon-only controls whose visible glyph is smaller than the hit area.
- **Ratification owner:** repository owner
- **Implementation owner:** design-engineer
- **Handoffs:** Touch-target sizing is expressed through the spacing/touch-target token roles; see the cognitive-mode gap in [accessibility](accessibility.md) where the touch-target role is not yet applied.
- **Legacy inputs:** accessibility#4

### STUDIO-INT-004 — State, errors, and status are visible and inclusive

- **Status:** Draft
- **Statement:** Communicate current state and every error programmatically and visibly — associate errors with their field, describe them in plain language with a way to fix them, and never signal state or error by color alone.
- **Rationale:** Invisible state forces guessing; an error shown only as a red border or a vanished toast is invisible to screen-reader and color-blind users and leaves everyone stuck.
- **Verification:** Interactive components render their states from the token contract; errors are linked to their field, marked invalid, focus-managed, and paired with a non-color cue and actionable text; status changes are announced.
- **Ratification owner:** repository owner
- **Implementation owner:** design-engineer
- **Handoffs:** Error and status wording that carries legal/compliance meaning is Product/Compliance; localized message assembly is [localization](localization.md) and its i18n owners.
- **Legacy inputs:** accessibility#6, design#9, frontend#5, performance#6, local-first#1

### STUDIO-INT-005 — Motion honors reduced-motion, including imperative animation

- **Status:** Draft
- **Statement:** Pair every motion with a reduced-motion path, and honor the reduced-motion preference not only in CSS but in imperative code — read the preference before starting JS/Web-Animations/canvas motion, jump to the end state, and react to a mid-session change.
- **Rationale:** Motion can physically harm vestibular-sensitive users, and the token-level reduced-motion block only collapses CSS durations — the most elaborate motion in a product is usually driven imperatively and bypasses it entirely, so it is the most likely to cause harm.
- **Verification:** With reduced-motion set, non-essential CSS motion collapses via motion tokens and imperative/canvas animation is skipped to the end state; a mid-session preference toggle takes effect; no essential meaning is conveyed by motion alone.
- **Ratification owner:** repository owner
- **Implementation owner:** web-engineer and native-app-engineer
- **Handoffs:** Motion duration/easing roles come from the token tier; the in-product preference override is covered in [accessibility](accessibility.md).
- **Legacy inputs:** accessibility#3, design#6

## Related material

- [Accessibility](accessibility.md) covers the WCAG floor, accessibility modes, and cognitive mode.
- [Components](../design/components.md) hold each contract these interaction rules apply to.
