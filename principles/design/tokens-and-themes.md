# Studio principles — Tokens and themes

> **Ratification:** Each principle's `Status` becomes effective only when the repository owner
> merges the covering Ratification decision record; before that merge, the candidate change is
> proposed and non-normative.
>
> Owner-ratified Studio design authority superseding the removed legacy token/theme guidance.
> Every disposition stays traceable in the final [migration ledger](../migration-ledger.json).
> Legacy inputs are cited by stable `<realm>#<n>` ID.

## Purpose

This area governs the token model: the primitive → semantic → component reference chain, the
autonomy semantic naming gives products, and the runtime themes and accessibility modes that
chain enables. It is the mechanism behind Studio's framework-neutral design contract.

## Principles

### STUDIO-TOK-001 — Preserve the primitive → semantic → component chain

- **Status:** Ratified
- **Statement:** Author every token so values flow in one direction — primitive → semantic → component — with each tier referencing only the tier above it, never skipping tiers, inverting the direction, or referencing sideways within a tier.
- **Rationale:** The chain is what makes a theme a palette swap: components bind to semantic roles, so restating the small set of semantic values re-flows the whole system with no rebuild; a component that points at a primitive pins itself to one palette.
- **Verification:** A structural check confirms component tokens reference semantic tokens, semantic tokens reference primitives, and no component or semantic token embeds a raw literal or a cross-tier/sideways reference.
- **Ratification owner:** repository owner
- **Implementation owner:** design-engineer
- **Handoffs:** The token build/transform pipeline and its cache determinism are Engineering; the committed distribution interface is generated and synced under `.github`-owned distribution.
- **Legacy inputs:** design#1, architecture#1, architecture#2

### STUDIO-TOK-002 — Products bind to meaning, not literal visual values

- **Status:** Ratified
- **Statement:** Require consumers to bind to semantic and component token names, and keep the full semantic name set stable across every theme so a product never depends on a primitive scale entry or a per-theme literal.
- **Rationale:** Semantic naming is the contract that gives products styling autonomy from Studio's internal values: binding to meaning lets a product respond to every theme and accessibility mode for free, while binding to a literal reintroduces drift and breaks under mode swaps.
- **Verification:** Consuming surfaces reference semantic/component names only; every shipped theme restates the complete semantic name set with none renamed, dropped, or added per product.
- **Ratification owner:** repository owner
- **Implementation owner:** design-engineer
- **Handoffs:** Product-app implementation that consumes these names lives in the product repository; Engineering owns the mechanisms that publish and typecheck the token exports.
- **Legacy inputs:** design#2, frontend#1, architecture#2

### STUDIO-TOK-003 — Themes and accessibility modes swap at runtime

- **Status:** Ratified
- **Statement:** Drive light, dark, dark-OLED, high-contrast, and accessibility modes as runtime attribute swaps on the root element, where each mode restates only its semantic roles and never forks stylesheets, component bindings, or the build.
- **Rationale:** Users toggle appearance and accessibility modes live; a rebuild-per-mode or class-fork-per-component approach makes modes expensive, inconsistent, and prone to rot.
- **Verification:** Setting the mode attribute re-flows the system through a style recalculation only — no rebuild, re-import, or per-component script — and each mode block overrides semantic roles exclusively; modes stack orthogonally rather than replacing one another.
- **Ratification owner:** repository owner
- **Implementation owner:** design-engineer
- **Handoffs:** The runtime cost budget of a mode swap is measured by Engineering (performance mechanisms/evidence); WCAG conformance of each mode is verified in [accessibility](../experience/accessibility.md).
- **Legacy inputs:** design#4, design#8, frontend#3, performance#5

### STUDIO-TOK-004 — Component tokens capture a reusable semantic role

- **Status:** Ratified
- **Statement:** Add a component token only when it captures a reusable, semantic role or state shared across products, and bind it to semantic tokens rather than encoding a one-off or page-specific value.
- **Rationale:** The component tier is a contract every product inherits; one-off tokens bloat the system and leak app-specific decisions into the shared kernel. Reusable component behavior is specified in [Components](components.md); this principle governs only the token tier that backs it.
- **Verification:** Every component token has at least one shared-role justification and a semantic binding; a token with no active cross-product consumer or with a hardcoded literal is rejected.
- **Ratification owner:** repository owner
- **Implementation owner:** design-engineer
- **Handoffs:** Product-specific layout values remain in the product repository, not the shared token tier.
- **Legacy inputs:** design#7

## Related material

- [Foundations](foundations.md) frame the contract these tokens implement.
- [Accessibility](../experience/accessibility.md) verifies contrast and the cognitive mode that
  ride on these modes.
