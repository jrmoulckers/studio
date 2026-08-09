# Studio canonical-role overlay

Canonical agent, skill, prompt, and instruction definitions live in
[`jrmoulckers/.github`](https://github.com/jrmoulckers/.github). Studio does not author or
redefine them. Generated materializations under this repository's `.github/` tree are sync
outputs, not local authority. This file only maps canonical roles to local paths and
records handoff boundaries, as allowed by
[ADR-0001](https://github.com/jrmoulckers/.github/blob/main/docs/architecture/0001-canonical-agent-overlays.md).

The authority assignment itself is canonical in
[ADR-0003](https://github.com/jrmoulckers/.github/blob/main/docs/architecture/0003-four-authority-topology.md).

## Local dispatch

| Local surface                                                                     | Lead canonical role                     | Boundary                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/tokens/**`                                                              | `design-engineer`                       | Accessibility and localization specialists review the user-facing contract; Engineering evidence and Product obligations are referenced, not copied.                                                                                                                                                                                                                                 |
| `packages/tailwind-preset/**`                                                     | `design-engineer`                       | Own only the UI preset and token integration. General build or TypeScript mechanisms belong to Engineering.                                                                                                                                                                                                                                                                          |
| Studio design/UI principles and migration proposals under `principles/**`         | `design-engineer`                       | `docs-writer` may edit presentation and `accessibility-reviewer` or `localization-engineer` may review. Only the repository owner ratifies.                                                                                                                                                                                                                                          |
| Studio principle tree under `principles/design/**` and `principles/experience/**` | `design-engineer`                       | Concise `STUDIO-<AREA>-NNN` successors validated by `scripts/validate-principles.mjs`. A successor's `Status` field only becomes normative once an owner-effective Ratification decision record (e.g. [`RATIFICATION-DESIGN-EXPERIENCE.md`](RATIFICATION-DESIGN-EXPERIENCE.md)) is merged by the repository owner; an open, unmerged PR proposes Ratification, it does not enact it. |
| UI accessibility review                                                           | `accessibility-reviewer`                | Review Studio-owned user-facing expression; route mechanism or compliance-obligation changes to their canonical authorities.                                                                                                                                                                                                                                                         |
| Localization UX review                                                            | `localization-engineer`                 | Own Studio's user-facing locale behavior and UI contract, not Product content operations or Engineering implementation mechanisms.                                                                                                                                                                                                                                                   |
| UI implementation                                                                 | `web-engineer` or `native-app-engineer` | Reusable platform UI may live in Studio; product-specific application code remains in its product repository.                                                                                                                                                                                                                                                                        |
| Visual and interaction validation                                                 | `qa-tester`                             | Validate the Studio-owned UI contract. General test mechanisms and evidence standards belong to Engineering.                                                                                                                                                                                                                                                                         |
| Root and package documentation                                                    | `docs-writer`                           | Document Studio-owned contracts and link to other authorities without restating their rules.                                                                                                                                                                                                                                                                                         |
| `principles/migration-ledger*` and `principles/MIGRATION.md`                      | `docs-writer`                           | Maintain migration records; disposition proposals require the affected authority and owner ratification.                                                                                                                                                                                                                                                                             |

`@jrm/eslint-config`, `@jrm/tsconfig`, and `@jrm/prettier-config` are transitional local
paths. Do not expand their contract or claim downstream availability. A future additive
Engineering migration owns their successor design; this repository retains the current
files until the migration ledger permits removal.

GitHub governance, Actions, Copilot and AI rules and implementations, agents, skills,
prompts, instructions, evaluations, registry, sync, and provenance are `.github`-owned.
Do not author canonical definitions here. Product and Engineering concerns found in the
legacy realm files are migration input, not local ownership.

## Shared local practice

1. Read the applicable Studio design/UI material and canonical cross-authority references.
2. Preserve the primitive -> semantic -> component token direction and framework-neutral
   output contract.
3. Identify legacy guidance with its stable `studio-legacy:<realm>:<number>` ID and label
   it transitional.
4. Add migration entries only through the schema in
   [`MIGRATION.md`](MIGRATION.md); never create empty successor realm files.
5. Cite owner-ratified principles when they exist. Agents propose; the repository owner
   alone ratifies.
6. The Studio principle tree in [`design/`](design) and [`experience/`](experience) carries
   the design/UI authority as `STUDIO-<AREA>-NNN` principles. Every entry stays
   `Ratification owner: repository owner`; its `Status` (`Draft` or `Ratified`) becomes
   normative only once the repository owner merges an owner-effective Ratification decision
   record covering it (see [`RATIFICATION-DESIGN-EXPERIENCE.md`](RATIFICATION-DESIGN-EXPERIENCE.md)
   for the 25 design/experience successors). Validate the tree with `pnpm principles:check`
   before proposing changes. Ratifying these local `Status` fields supersedes no legacy realm
   file, ratifies no Engineering/Product/`.github` successor, and leaves the migration ledger
   at 0/192.
