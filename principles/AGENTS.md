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

| Local surface                                                                     | Lead canonical role                     | Boundary                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/tokens/**`                                                              | `design-engineer`                       | Accessibility and localization specialists review the user-facing contract; Engineering evidence and Product obligations are referenced, not copied.                                                                                                                                  |
| `packages/tailwind-preset/**`                                                     | `design-engineer`                       | Own only the UI preset and token integration. General build or TypeScript mechanisms belong to Engineering.                                                                                                                                                                           |
| Studio design/UI principles and migration records under `principles/**`           | `design-engineer`                       | `docs-writer` may edit presentation and `accessibility-reviewer` or `localization-engineer` may review. Only the repository owner ratifies normative changes.                                                                                                                         |
| Studio principle tree under `principles/design/**` and `principles/experience/**` | `design-engineer`                       | The 25 owner-ratified `STUDIO-<AREA>-NNN` principles are validated by `scripts/validate-principles.mjs`; substantive changes require a new owner-effective decision. [`RATIFICATION-DESIGN-EXPERIENCE.md`](RATIFICATION-DESIGN-EXPERIENCE.md) preserves the original decision record. |
| UI accessibility review                                                           | `accessibility-reviewer`                | Review Studio-owned user-facing expression; route mechanism or compliance-obligation changes to their canonical authorities.                                                                                                                                                          |
| Localization UX review                                                            | `localization-engineer`                 | Own Studio's user-facing locale behavior and UI contract, not Product content operations or Engineering implementation mechanisms.                                                                                                                                                    |
| UI implementation                                                                 | `web-engineer` or `native-app-engineer` | Reusable platform UI may live in Studio; product-specific application code remains in its product repository.                                                                                                                                                                         |
| Visual and interaction validation                                                 | `qa-tester`                             | Validate the Studio-owned UI contract. General test mechanisms and evidence standards belong to Engineering.                                                                                                                                                                          |
| Root and package documentation                                                    | `docs-writer`                           | Document Studio-owned contracts and link to other authorities without restating their rules.                                                                                                                                                                                          |
| `principles/migration-*` and `principles/MIGRATION.md`                            | `docs-writer`                           | Preserve the final 192-entry ledger, historical Draft evidence, Ratification receipt, source hashes, retirement judgments, and deletion audit trail. Do not rewrite historical receipts.                                                                                              |

`@jrm/eslint-config`, `@jrm/tsconfig`, and `@jrm/prettier-config` are transitional local
paths. Do not expand their contract or claim downstream availability. A future additive
Engineering migration owns their successor design; this repository retains the current
files pending that additive Engineering migration.

GitHub governance, Actions, Copilot and AI rules and implementations, agents, skills,
prompts, instructions, evaluations, registry, sync, and provenance are `.github`-owned.
Do not author canonical definitions here. Product and Engineering principles remain canonical
in their own repositories; the final ledger records historical ownership reconciliation without
transferring that authority to Studio.

## Shared local practice

1. Read the applicable Studio design/UI material and canonical cross-authority references.
2. Preserve the primitive -> semantic -> component token direction and framework-neutral
   output contract.
3. Use a stable `studio-legacy:<realm>:<number>` ID only for migration history, retirement
   evidence, or a trace to the final ledger.
4. Use [`_template.md`](_template.md) only in an issue or pull request description. Do not
   add a realm file or principle block until the same owner-reviewed change updates the
   declared catalog, decision record, receipt, independent pins, and negative fixtures.
5. Do not change a final disposition, successor list, citation exception, or retirement
   judgment without explicit owner review and new evidence.
6. Cite owner-ratified principles from their canonical authority. Agents propose; the
   repository owner alone ratifies.
7. The Studio principle tree in [`design/`](design) and [`experience/`](experience) carries
   the design/UI authority as 25 `STUDIO-<AREA>-NNN` principles. Every entry remains
   `Ratification owner: repository owner`. Validate the tree, final ledger, historical
   receipt, Ratification receipt, and deletion guard with `pnpm principles:check`.
