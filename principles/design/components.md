# Studio principles — Components

> **Status:** Draft (proposed, non-normative). Only the repository owner may ratify.
>
> Studio design-authority successor to legacy component guidance. It removes no legacy file;
> the migration ledger stays at 0/192. Legacy inputs are cited by stable `<realm>#<n>` ID.

## Purpose

This area governs reusable components: the single behavioral contract each one carries, how
that contract is realized natively on each platform, and how the contract is validated. It
consumes the token tier in [tokens and themes](tokens-and-themes.md).

## Principles

### STUDIO-CMP-001 — Each reusable component has one behavioral contract

- **Status:** Draft
- **Statement:** Define every reusable component once as a behavioral contract — its structure, states, token bindings, and accessibility obligations — and let products compose that contract through documented props and slots rather than restyling or forking it.
- **Rationale:** Standardizing behavior is what makes cross-product consistency real; divergent copies of the "same" component produce a system in name only and drift the accessibility contract.
- **Verification:** Each shared component enumerates its states (default/hover/pressed/focus/disabled/error) and its accessibility obligations in one canonical spec; product variation is expressed through documented props/slots, and no product maintains a private restyle of a shared component.
- **Ratification owner:** repository owner
- **Implementation owner:** design-engineer
- **Handoffs:** Product-specific composition of these contracts lives in the product repository; reusable platform implementations may live in Studio.
- **Legacy inputs:** design#7, design#11

### STUDIO-CMP-002 — Native implementations meet the contract; capability parity, not pixel parity

- **Status:** Draft
- **Statement:** Realize each component contract with the target platform's native semantics and controls, holding implementations to the same capabilities and states rather than to identical pixels across platforms.
- **Rationale:** Native controls carry keyboard, focus, and assistive-technology behavior for free and feel correct per platform; forcing pixel-identical renderings across platforms discards those affordances and fights platform conventions, while capability parity keeps behavior consistent where it matters.
- **Verification:** Every platform implementation of a contract exposes the same states, roles, and interaction capabilities and uses native controls where one exists; a review checks capability and behavioral parity, not pixel-identical rendering.
- **Ratification owner:** repository owner
- **Implementation owner:** web-engineer and native-app-engineer
- **Handoffs:** Browser-security and runtime-performance mechanisms of an implementation are Engineering; capability detection of optional platform APIs is an Engineering implementation concern that must not break the core contract.
- **Legacy inputs:** frontend#2, frontend#8, architecture#8, architecture#9

### STUDIO-CMP-003 — Validate the visual, interaction, and token contract

- **Status:** Draft
- **Statement:** Guard each component's rendered appearance, interaction states, and token bindings with regression checks across every theme and accessibility mode, and deliberately re-baseline diffs rather than blind-approving them.
- **Rationale:** Tokens feed CSS variables, presets, and typed objects, so a silent value or name shift re-flows every consumer with no compile error; only visual/interaction/contract regression catches it at the source.
- **Verification:** The regression suite asserts the semantic contract is present and covers representative components across light, dark, dark-OLED, high-contrast, and cognitive states; a token name or value change without an updated assertion fails the check.
- **Ratification owner:** repository owner
- **Implementation owner:** design-engineer
- **Handoffs:** General test infrastructure, coverage standards, CI wiring, and evidence mechanisms are Engineering; Studio owns only the design/UI contract being validated. The existing token contract suite remains the Engineering-owned baseline.
- **Legacy inputs:** design#11, testing#2, testing#3

## Related material

- [Tokens and themes](tokens-and-themes.md) supplies the component-token tier these contracts bind to.
- [Interaction](../experience/interaction.md) and [Accessibility](../experience/accessibility.md)
  define the interaction and accessibility obligations each contract must meet.
