# JRM Studio - Principles transition

Studio's local principle authority is design and UI: visual design, interaction,
accessibility, localization UX, semantic tokens and themes, UI contracts, reusable
platform implementations, UI presets and examples, and visual validation.

The repository-wide authority boundary is canonical in
[ADR-0003: Four-authority repository topology](https://github.com/jrmoulckers/.github/blob/main/docs/architecture/0003-four-authority-topology.md).
This directory references that decision and applies it to Studio; it does not duplicate
the ADR or define Engineering, Product, or `.github` policy.

## Current status

The existing realm tree is **legacy, Draft, and transitional**. It predates the
four-authority topology and mixes Studio design/UI material with Engineering, Product, and
`.github` concerns. The files remain useful migration input, but they are not a claim that
Studio owns every realm they describe.

All 21 realm files are preserved for Milestone 2. At the migration baseline they contain
192 top-level legacy principles. Nested sub-principles travel with their top-level parent.
The inventory below records coverage only; it does not assign a successor or disposition.

| Legacy realm                            | Stable ID range                       |   Count |
| --------------------------------------- | ------------------------------------- | ------: |
| [Accessibility](accessibility.md)       | `studio-legacy:accessibility:1..7`    |       7 |
| [AI Process](ai-process.md)             | `studio-legacy:ai-process:1..22`      |      22 |
| [AI Products](ai-products.md)           | `studio-legacy:ai-products:1..8`      |       8 |
| [Architecture](architecture.md)         | `studio-legacy:architecture:1..15`    |      15 |
| [Backend](backend.md)                   | `studio-legacy:backend:1..7`          |       7 |
| [Business](business.md)                 | `studio-legacy:business:1..6`         |       6 |
| [Compliance](compliance.md)             | `studio-legacy:compliance:1..8`       |       8 |
| [Data & Analytics](data-analytics.md)   | `studio-legacy:data-analytics:1..7`   |       7 |
| [Design](design.md)                     | `studio-legacy:design:1..13`          |      13 |
| [DevOps](devops.md)                     | `studio-legacy:devops:1..15`          |      15 |
| [Documentation](documentation.md)       | `studio-legacy:documentation:1..7`    |       7 |
| [Featuring](featuring.md)               | `studio-legacy:featuring:1..7`        |       7 |
| [Frontend](frontend.md)                 | `studio-legacy:frontend:1..9`         |       9 |
| [Local-First](local-first.md)           | `studio-legacy:local-first:1..4`      |       4 |
| [Localization](localization.md)         | `studio-legacy:localization:1..9`     |       9 |
| [Middleware](middleware.md)             | `studio-legacy:middleware:1..7`       |       7 |
| [Performance](performance.md)           | `studio-legacy:performance:1..9`      |       9 |
| [Process](process.md)                   | `studio-legacy:process:1..7`          |       7 |
| [Project Planning](project-planning.md) | `studio-legacy:project-planning:1..7` |       7 |
| [Security](security.md)                 | `studio-legacy:security:1..8`         |       8 |
| [Testing](testing.md)                   | `studio-legacy:testing:1..10`         |      10 |
| **Total**                               |                                       | **192** |

## Studio Draft principle tree

Alongside the transitional legacy realm files, Studio authors its design and UI authority as a
concise Draft tree under [`design/`](design) and [`experience/`](experience). Each principle has
a stable `STUDIO-<AREA>-NNN` ID, a testable verification, repository-owner ratification
accountability, an implementation owner, explicit cross-authority handoffs, and exact legacy
inputs. Every principle is **Draft** and non-normative until the repository owner ratifies it.

| File                                                         | Area prefix   | Scope                                                      |
| ------------------------------------------------------------ | ------------- | ---------------------------------------------------------- |
| [`design/foundations.md`](design/foundations.md)             | `STUDIO-FND`  | Framework-neutral design contract; additive evolution      |
| [`design/tokens-and-themes.md`](design/tokens-and-themes.md) | `STUDIO-TOK`  | primitive→semantic→component chain; runtime themes/modes   |
| [`design/components.md`](design/components.md)               | `STUDIO-CMP`  | Behavioral component contracts; native parity; validation  |
| [`experience/interaction.md`](experience/interaction.md)     | `STUDIO-INT`  | Native semantics, keyboard/switch, focus, targets, motion  |
| [`experience/accessibility.md`](experience/accessibility.md) | `STUDIO-A11Y` | WCAG floor, accessibility modes, cognitive mode + gap      |
| [`experience/localization.md`](experience/localization.md)   | `STUDIO-L10N` | Text expansion, RTL/bidi UX; mechanism handoffs            |
| [`experience/ux.md`](experience/ux.md)                       | `STUDIO-UX`   | Ease of use, visible state, tabular figures, consolidation |

This Draft tree adds no ledger disposition: it does not remove, supersede, or reassign any legacy
principle, and [`migration-ledger.json`](migration-ledger.json) stays at 0 of 192. A legacy file
is removed only through the ratified disposition and evidence gate below. The tree is validated by
[`../scripts/validate-principles.mjs`](../scripts/validate-principles.mjs) (run via
`pnpm principles:check`, and chained after the token suite in `pnpm test`), which checks the pinned
stable ID set, file-to-area prefixes, required fields, and the exact `Draft` / `repository owner`
values.

## Precedence during migration

1. An owner-ratified principle in the correct canonical authority supersedes conflicting
   legacy text.
2. ADR-0003 decides which authority may own a successor; generated copies and distribution
   paths do not transfer ownership.
3. An unmapped legacy principle is transitional input only. It may inform a proposal, but
   it cannot establish authority outside Studio or override a ratified successor.
4. The Studio Draft principle tree is a proposed successor set. Until the repository owner
   ratifies a given principle, it is non-normative and does not supersede the legacy realm
   text it draws from; both remain in place.

Cross-authority references use durable repository links or stable IDs. Private Engineering
and Product sources must not be copied into Studio merely to make a link locally
convenient. `.github` remains canonical for GitHub governance, Actions, Copilot and AI
principles and implementations, agents, skills, prompts, instructions, evaluations,
registry, sync, and provenance.

Only the repository owner may ratify a principle or a migration disposition. Agents may
propose either, but proposals remain non-normative.

## Migration and removal gate

[`MIGRATION.md`](MIGRATION.md) defines the ledger schema and workflow. Its machine-readable
scaffold is [`migration-ledger.json`](migration-ledger.json), validated by
[`migration-ledger.schema.json`](migration-ledger.schema.json).

No legacy top-level principle may be removed until its stable ID has **exactly one**
owner-ratified disposition (`rewrite`, `split`, `reference`, or `retire`) and reaches
`verified` with evidence. A realm file may be deleted only after every stable ID in its
range passes that gate and all inbound references have been updated. Until then, all 21
realm files remain in place.

The repository-local canonical-role mapping is in [`AGENTS.md`](AGENTS.md). It is a path
overlay, not a copy of the canonical agent definitions.
