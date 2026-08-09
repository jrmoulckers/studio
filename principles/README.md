# Studio design and UI principles

Studio is the canonical authority for visual design, interaction, accessibility and
localization UX, semantic tokens and themes, UI contracts, reusable platform
implementations, UI presets and examples, and visual validation.

The repository owner ratified the complete 25-principle Studio catalog by merging
[PR #25](https://github.com/jrmoulckers/studio/pull/25). The principles under
[`design/`](design) and [`experience/`](experience) are therefore the local normative
source. Migration receipts are dated evidence, not a second authority.

## Canonical authority handoffs

| Authority   | Canonical source                                                                                                                       | Responsibility                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Studio      | [`design/`](design) and [`experience/`](experience)                                                                                    | User-facing design and UI expression                            |
| Engineering | [Ratified Engineering principles](https://github.com/jrmoulckers/engineering/tree/60ff2e43da40b8177b7b8bc591f7193d58af617a/principles) | Mechanisms and engineering evidence                             |
| Product     | [Ratified Product principles](https://github.com/jrmoulckers/product/tree/3a752c11856515a74eb204675d5d5198cac1e48e/principles)         | Obligations and outcomes                                        |
| `.github`   | [Ratified GitHub and AI principles](https://github.com/jrmoulckers/.github/tree/a7be84b20737f9d404ea53213dec159dd59d5747/principles)   | Governance, automation, AI assets, distribution, and provenance |

[ADR-0003](https://github.com/jrmoulckers/.github/blob/main/docs/architecture/0003-four-authority-topology.md)
defines the repository boundary. Studio references the other authorities by stable ID and
immutable link instead of copying their normative text.

## Studio catalog

| File                                                         | Area prefix   | Principles | Scope                                                           |
| ------------------------------------------------------------ | ------------- | ---------: | --------------------------------------------------------------- |
| [`design/foundations.md`](design/foundations.md)             | `STUDIO-FND`  |          3 | Framework-neutral design contract and compatible evolution      |
| [`design/tokens-and-themes.md`](design/tokens-and-themes.md) | `STUDIO-TOK`  |          4 | Primitive -> semantic -> component references and runtime modes |
| [`design/components.md`](design/components.md)               | `STUDIO-CMP`  |          3 | Reusable behavioral contracts, native parity, and validation    |
| [`experience/interaction.md`](experience/interaction.md)     | `STUDIO-INT`  |          5 | Native semantics, operation, focus, targets, errors, and motion |
| [`experience/accessibility.md`](experience/accessibility.md) | `STUDIO-A11Y` |          3 | WCAG floor, accessibility modes, and cognitive-mode coverage    |
| [`experience/localization.md`](experience/localization.md)   | `STUDIO-L10N` |          3 | Expansion, bidirectionality, locale behavior, and handoffs      |
| [`experience/ux.md`](experience/ux.md)                       | `STUDIO-UX`   |          4 | Ease of use, visible state, figures, and consolidation          |
| **Total**                                                    |               |     **25** |                                                                 |

Each principle has a stable `STUDIO-<AREA>-NNN` ID, `Status: Ratified`, a testable
verification, `Ratification owner: repository owner`, an implementation owner, explicit
handoffs, and exact historical `Legacy inputs`. The owner-effective decision is preserved in
[`RATIFICATION-DESIGN-EXPERIENCE.md`](RATIFICATION-DESIGN-EXPERIENCE.md).

## Completed legacy migration

The final [`migration-ledger.json`](migration-ledger.json) retains exactly 192 stable
`studio-legacy:<realm>:<number>` IDs. Its unchanged mappings contain 21 `rewrite`, 43
`split`, 122 `reference`, and 6 `retire` dispositions. The 186 mapped entries contain 242
links to 159 unique successors; every entry is `verified`.

The 21 superseded realm files were removed by the final owner-review change. Their content
was not copied elsewhere. Auditability is preserved through:

- the immutable `efe6aa3b5ad020331a91f533844b0b9f70d70b76` stable-ID baseline;
- the immutable `20dc8e0119d8ee46bd3ec26643f1b21a3eca8df0` reviewed legacy-source
  snapshot and its per-file blob/content hashes;
- the historical, non-normative
  [`migration-verification-receipt.json`](migration-verification-receipt.json), which
  remains pinned to the pre-ratification Draft catalogs and authorizes no deletion;
- the final, non-normative
  [`migration-finalization-receipt.json`](migration-finalization-receipt.json), which
  records the four owner-effective Ratification decisions and the verified technical
  deletion gate;
- the final ledger's retirement rationales, citation exceptions, source links, and Git
  history.

The frozen deleted inventory is:

| Realm path                       | Stable ID range                       |   Count |
| -------------------------------- | ------------------------------------- | ------: |
| `principles/accessibility.md`    | `studio-legacy:accessibility:1..7`    |       7 |
| `principles/ai-process.md`       | `studio-legacy:ai-process:1..22`      |      22 |
| `principles/ai-products.md`      | `studio-legacy:ai-products:1..8`      |       8 |
| `principles/architecture.md`     | `studio-legacy:architecture:1..15`    |      15 |
| `principles/backend.md`          | `studio-legacy:backend:1..7`          |       7 |
| `principles/business.md`         | `studio-legacy:business:1..6`         |       6 |
| `principles/compliance.md`       | `studio-legacy:compliance:1..8`       |       8 |
| `principles/data-analytics.md`   | `studio-legacy:data-analytics:1..7`   |       7 |
| `principles/design.md`           | `studio-legacy:design:1..13`          |      13 |
| `principles/devops.md`           | `studio-legacy:devops:1..15`          |      15 |
| `principles/documentation.md`    | `studio-legacy:documentation:1..7`    |       7 |
| `principles/featuring.md`        | `studio-legacy:featuring:1..7`        |       7 |
| `principles/frontend.md`         | `studio-legacy:frontend:1..9`         |       9 |
| `principles/local-first.md`      | `studio-legacy:local-first:1..4`      |       4 |
| `principles/localization.md`     | `studio-legacy:localization:1..9`     |       9 |
| `principles/middleware.md`       | `studio-legacy:middleware:1..7`       |       7 |
| `principles/performance.md`      | `studio-legacy:performance:1..9`      |       9 |
| `principles/process.md`          | `studio-legacy:process:1..7`          |       7 |
| `principles/project-planning.md` | `studio-legacy:project-planning:1..7` |       7 |
| `principles/security.md`         | `studio-legacy:security:1..8`         |       8 |
| `principles/testing.md`          | `studio-legacy:testing:1..10`         |      10 |
| **Total**                        |                                       | **192** |

## Precedence

1. An owner-ratified principle in its canonical authority is normative for that authority's
   scope.
2. ADR-0003 decides ownership; generated copies and distribution paths do not transfer it.
3. The final migration ledger records historical disposition and traceability. It does not
   duplicate or override a canonical principle.
4. Historical receipts and decision records are evidence about dated events, not normative
   catalogs.

## Validation

`pnpm principles:check` validates the Studio tree, both receipts, the frozen mapping,
decision evidence, exact counts, reciprocity and citation exceptions, retirement records,
deleted-path state, link safety, and persistent negative mutations. It is chained into
`pnpm test`.

`pnpm principles:verify-live` additionally authenticates to GitHub, re-reads all four
authority catalogs and owner merge records, recomputes every digest, verifies the
historical ledger and deleted source snapshot at immutable commits, and confirms that
current authority heads have not changed the pinned Ratified catalogs.

Offline validation cannot prove what a private remote currently serves. The authenticated
live check supplies that evidence. Repository-owner merge of the finalization pull request
is the effective supersession and deletion act; neither receipt can substitute for that
owner decision.
