# Studio principles — Design foundations

> **Status:** Draft (proposed, non-normative). Only the repository owner may ratify.
>
> These principles are Studio's design-authority successor to parts of the transitional
> legacy realm tree. They do not remove or supersede any legacy file, and the migration
> ledger stays at 0/192. Legacy inputs are cited by their stable `<realm>#<n>` migration ID.

## Purpose

Foundations govern the shape of Studio's design contract as a whole: what a "design decision"
is, how it stays portable across frameworks and platforms, and how it evolves without stranding
consumers. Token, theme, component, and experience principles build on these.

## Principles

### STUDIO-FND-001 — Design decisions are a framework-neutral contract

- **Status:** Draft
- **Statement:** Express every design decision as a named entry in the Studio design contract — tokens and component specs consumed through generated, framework-neutral outputs — never as a value or theming layer that lives inside one framework or product.
- **Rationale:** Studio spans multiple frameworks and platforms; a single portable contract is the only thing that keeps one system consistent, while framework-locked source of truth fragments it and forces per-consumer divergence.
- **Verification:** No literal color, size, radius, elevation, or duration value appears in a consuming surface; every consumer reads the same generated CSS-variable / preset / typed-token contract, and no framework wrapper restates token values as its own source of truth.
- **Ratification owner:** repository owner
- **Implementation owner:** design-engineer
- **Handoffs:** Build pipeline, package layering, and general TypeScript/bundling mechanisms are Engineering; distribution and sync of generated artifacts are `.github`.
- **Legacy inputs:** design#1, design#3, frontend#2, architecture#3, architecture#12

### STUDIO-FND-002 — Evolve the contract additively and keep migrations compatible

- **Status:** Draft
- **Statement:** Add new semantic roles and component capabilities rather than repurposing existing ones; make any breaking change to a name or contract deliberate, versioned, aliased, and accompanied by a migration path.
- **Rationale:** Every product binds to these names; silent breakage cascades across all consumers, while an additive, aliased contract lets the system improve without stranding anyone.
- **Verification:** A removed or renamed contract entry ships with a compatibility alias and a documented migration; regression checks confirm the prior semantic surface still resolves for existing consumers.
- **Ratification owner:** repository owner
- **Implementation owner:** design-engineer
- **Handoffs:** The legacy-principle migration ledger and disposition workflow are recorded under `principles/MIGRATION.md`; owner ratification governs any legacy removal.
- **Legacy inputs:** design#12, architecture#2, architecture#4

### STUDIO-FND-003 — Ground design in current best practice and reference other authorities

- **Status:** Draft
- **Statement:** Base design decisions on current, platform-native UX and accessibility best practice, and reference Product, Engineering, and `.github` sources by their stable location rather than restating their rules inside Studio.
- **Rationale:** Best practice encodes hard-won usability and accessibility lessons, and after ADR-0003 Studio owns only user-facing design/UI expression — copying another authority's normative rules creates drift and false ownership.
- **Verification:** Design guidance cites recognized current standards where it makes a usability or accessibility claim, and cross-authority concerns link out instead of duplicating normative text; no Studio principle claims ownership of a Product, Engineering, or `.github` mechanism.
- **Ratification owner:** repository owner
- **Implementation owner:** design-engineer
- **Handoffs:** Product owns obligations/outcomes and terminology; Engineering owns mechanisms/evidence; `.github` owns GitHub/Copilot/AI automation, distribution, and AI definitions. Compliance obligations remain with their canonical authority.
- **Legacy inputs:** design#13

## Related material

- [Tokens and themes](tokens-and-themes.md), [Components](components.md), and the
  [experience](../experience) tree apply these foundations.
- Authority boundaries are canonical in
  [ADR-0003](https://github.com/jrmoulckers/.github/blob/main/docs/architecture/0003-four-authority-topology.md).
