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

Studio locally owns design and UI principles and implementations: visual design,
interaction, accessibility, localization UX, semantic tokens and themes, UI contracts,
reusable platform implementations, UI presets and examples, and visual validation.

Product defines obligations and outcomes. Engineering defines mechanisms and evidence.
Studio defines their user-facing expression. `.github` owns automation and distribution.
Reference another authority's stable source; never restate its normative rule locally.

The repository owner alone may ratify principles. Agents may research, draft, and propose
changes, but must not label their own proposal Ratified or treat it as normative before
owner review.

## Ratified principles and migration records

- Studio's design/UI authority is authored as a concise tree under
  [`principles/design/`](principles/design) and [`principles/experience/`](principles/experience)
  with 25 stable, owner-ratified `STUDIO-<AREA>-NNN` principles. The owner-effective decision
  record is
  [`principles/RATIFICATION-DESIGN-EXPERIENCE.md`](principles/RATIFICATION-DESIGN-EXPERIENCE.md)
  as merged in Studio PR #25.
- [`principles/migration-ledger.json`](principles/migration-ledger.json) preserves the final
  disposition of all 192 stable legacy IDs. The historical Draft receipt, final Ratification
  receipt, source hashes, retirement judgments, and Git-history pointers remain audit evidence;
  the deleted realm content is not duplicated.
- Engineering, Product, and `.github` principles remain canonical in their own repositories.
  Reference those sources by stable ID and immutable link; never copy them into Studio.
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
principle. Use `studio-legacy:*` IDs only when referring to the preserved migration record or
historical evidence.
