# Agent Instructions - JRM Studio

This file supplies repository-local context for work in Studio. Canonical agent, skill,
prompt, and instruction definitions are owned by
[`jrmoulckers/.github`](https://github.com/jrmoulckers/.github). Materialized files under
this repository's `.github/agents/`, `.github/skills/`, `.github/prompts/`, and
`.github/instructions/` trees are generated sync outputs; do not edit or redefine them
here. The local overlay in [`principles/AGENTS.md`](principles/AGENTS.md) maps those
canonical roles onto this repository's paths.

## Authority and precedence

1. Mandatory platform and safety rules.
2. Owner-ratified principles in their canonical authority, with repository ownership
   determined by
   [ADR-0003](https://github.com/jrmoulckers/.github/blob/main/docs/architecture/0003-four-authority-topology.md).
3. The nearest Studio instruction for Studio-owned paths.
4. The legacy realm files under [`principles/`](principles) as transitional input only,
   where they do not conflict with the authorities above.

Studio locally owns design and UI principles and implementations: visual design,
interaction, accessibility, localization UX, semantic tokens and themes, UI contracts,
reusable platform implementations, UI presets and examples, and visual validation.

Product defines obligations and outcomes. Engineering defines mechanisms and evidence.
Studio defines their user-facing expression. `.github` owns automation and distribution.
Reference another authority's stable source; never restate its normative rule locally.

The repository owner alone may ratify principles. Agents may research, draft, and propose
changes, but must not label their own proposal Ratified or treat it as normative before
owner review.

## Transitional surfaces

- The 21 legacy realm files and their 192 top-level principles remain intact for Milestone 2. Use the stable IDs and process in
  [`principles/MIGRATION.md`](principles/MIGRATION.md).
- A legacy principle cannot be deleted until it has exactly one owner-ratified disposition
  and the ledger records verified evidence. Do not create empty successor realm files.
- `@jrm/eslint-config`, `@jrm/tsconfig`, and `@jrm/prettier-config` remain here unchanged
  pending an additive Engineering migration. They have not moved and are not downstream
  distribution surfaces.

## Studio constraints

- Preserve the primitive -> semantic -> component token reference direction.
- Keep token outputs framework-neutral across web and native consumers.
- `packages/tokens/build/` is disposable generated output.
  `packages/tokens/dist/` is the committed, deterministic, text-only sync interface.
  Hand-edit neither.
- Preserve the `@jrm/tokens` -> `@jrm/tailwind-preset` dependency direction.
- Preserve the executable token contract baseline. `pnpm test` validates authored token
  structure, generated entry points, compatibility aliases, scoped theme/preference
  behavior, distribution determinism, and failure-path fixtures.
- All packages remain private and `0.0.0`; do not publish them.
- Documentation-only governance changes require no Changeset.

Before changing a Studio-owned surface, read the applicable local design/UI material and
the canonical cross-authority references it depends on. Cite an owner-ratified successor
principle when one exists; otherwise identify legacy guidance by its stable migration ID
and label it transitional.
