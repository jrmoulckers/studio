# JRM Studio

JRM Studio is the authority for the shared **design and user-interface system** used across
JRM products. It owns the visual and interaction language, accessibility and localization
UX, semantic tokens and themes, UI contracts, reusable platform implementations, UI
presets and examples, and visual validation.

The canonical boundary between Studio, Engineering, Product, and `.github` is
[ADR-0003: Four-authority repository topology](https://github.com/jrmoulckers/.github/blob/main/docs/architecture/0003-four-authority-topology.md).
This README maps that decision onto this repository; it does not restate the topology as a
second normative source.

## Authority and handoffs

Studio turns Product obligations and outcomes, plus Engineering mechanisms and evidence,
into user-facing expression. GitHub governance, Actions, Copilot and AI configuration,
agents, skills, prompts, instructions, evaluations, registry, sync, and provenance remain
owned by `.github`.

Cross-authority documents link to their canonical source instead of copying normative
rules. Only the repository owner may ratify a principle. Agents and other contributors may
research, draft, and propose principles, but a proposal remains non-normative until the
owner accepts it through review.

## Repository map

This repository is partway through the authority transition. Its current contents are:

| Surface                                                                           | Current role and availability                                                                                                                                                                                           |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@jrm/tokens`](packages/tokens)                                                  | Active Studio-owned DTCG tokens, themes, CSS custom properties, generated Tailwind data, and typed JS/TS token objects. Its committed `dist/` is synced to opted-in product repositories.                               |
| [`@jrm/tailwind-preset`](packages/tailwind-preset)                                | Active Studio-owned UI preset layered on the token output. The wrapper package is workspace-internal today; product repositories receive only the generated token preset inside `@jrm/tokens/dist`.                     |
| [`@jrm/eslint-config`](packages/eslint-config)                                    | **Transitional.** It remains workspace-internal here pending an additive migration to Engineering. It has not moved and is not synced, published, or otherwise downstream-consumable.                                   |
| [`@jrm/tsconfig`](packages/tsconfig)                                              | **Transitional.** It remains workspace-internal here pending an additive migration to Engineering. It has not moved and is not synced, published, or otherwise downstream-consumable.                                   |
| [`@jrm/prettier-config`](packages/prettier-config)                                | **Transitional.** It remains workspace-internal here pending an additive migration to Engineering. It has not moved and is not synced, published, or otherwise downstream-consumable.                                   |
| [`principles/`](principles)                                                       | A transitional 21-realm, 192-principle legacy tree retained as migration input. It is not the target authority model; see the [principles index](principles/README.md) and [migration ledger](principles/MIGRATION.md). |
| `.github/agents/`, `.github/skills/`, `.github/prompts/`, `.github/instructions/` | Generated materializations synced from `jrmoulckers/.github`. Their presence here does not transfer authority to Studio; edit their canonical source, not the generated copies.                                         |

All packages remain `private` and `0.0.0`. Nothing in this repository is published to a
package registry.

## Token consumption and distribution

JRM Studio is registry-free. The sync engine owned by
[`jrmoulckers/.github`](https://github.com/jrmoulckers/.github) copies the committed
`packages/tokens/dist/` tree byte-for-byte into opted-in product repositories; it does not
build Studio or distribute the workspace packages.

Use the package documentation for the current contract:

- [`@jrm/tokens` distribution and freshness](packages/tokens/README.md#distribution-dist--the-committed-synced-artifact)
- [`@jrm/tokens` executable contract tests](packages/tokens/README.md#contract-tests)
- [Consuming synced tokens in a product repository](packages/tokens/README.md#product-repositories-synced-dist)
- [Consuming tokens inside this workspace](packages/tokens/README.md#this-workspace)
- [`@jrm/tailwind-preset` workspace usage](packages/tailwind-preset/README.md#usage)

Never hand-edit `packages/tokens/build/`, committed `packages/tokens/dist/`, or a vendored
copy in a product repository. Change the DTCG sources, regenerate the output, and let the
existing sync flow distribute it.

## Workspace commands

```bash
pnpm install
pnpm build
pnpm -r build
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm tokens:dist
pnpm tokens:dist:check
```

`packages/tokens/build/` is disposable local output.
`packages/tokens/dist/` is the committed distribution interface and must remain
deterministic, current, and text-only.

## Governance

- [`AGENTS.md`](AGENTS.md) is the repository-local operating context. Canonical agent,
  skill, prompt, and instruction definitions remain owned by `jrmoulckers/.github`;
  synchronized files under this repository's `.github/` tree are generated materializations.
- [`principles/README.md`](principles/README.md) explains the local design/UI authority and
  the transitional legacy tree.
- [`principles/MIGRATION.md`](principles/MIGRATION.md) defines the stable legacy IDs,
  disposition vocabulary, evidence requirements, and deletion gate for Milestone 2.
