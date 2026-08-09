# Final legacy principle migration record

This record reconciles Studio's frozen 21-file, 192-principle legacy catalog with the
owner-ratified principle trees in Studio, Engineering, Product, and `.github`. It applies
[ADR-0003](https://github.com/jrmoulckers/.github/blob/main/docs/architecture/0003-four-authority-topology.md)
without copying another authority's normative text into Studio.

All 192 stable IDs have one final `verified` disposition. All 174 authority principles are
Ratified at pinned owner-merged commits. The final owner-review change removes exactly the
21 frozen legacy realm paths. Repository-owner merge of that change is the effective
supersession and deletion act.

## Records and authority

- [`migration-ledger.json`](migration-ledger.json) is the final 192-entry disposition and
  traceability record.
- [`migration-ledger.schema.json`](migration-ledger.schema.json) defines its shape,
  cardinality, retirement categories, citation exceptions, and status vocabulary.
- [`migration-verification-receipt.json`](migration-verification-receipt.json) is the
  preserved historical Draft receipt. It is dated, non-normative evidence and continues to
  claim neither Ratification nor deletion authority.
- [`migration-finalization-receipt.json`](migration-finalization-receipt.json) is separate
  dated, non-normative evidence for the owner-ratified catalogs and technical deletion gate.
- [`migration-verification-receipt.schema.json`](migration-verification-receipt.schema.json)
  and
  [`migration-finalization-receipt.schema.json`](migration-finalization-receipt.schema.json)
  define the two distinct evidence contracts.
- [`README.md`](README.md) indexes the Ratified Studio tree and frozen deleted-path
  inventory.

The four authority repositories remain the normative sources. A receipt can prove that
immutable bytes and owner-merge evidence satisfy its declared gate; it cannot make a
principle normative or replace the repository owner's decision. In the final receipt,
`provesRatification: true` means all four owner-effective merged decisions were
authenticated and matched the pinned catalogs. `authorizesLegacyDeletion: true` means the
technical deletion preconditions passed for exactly the frozen 21 paths. The receipt's
required `meaning` statement preserves the final owner merge as the effective act.

## Immutable historical evidence

The stable-ID baseline, reviewed source snapshot, Draft receipt, and final Ratification
receipt serve different purposes:

| Evidence                        | Immutable commit or digest                                                 | Purpose                                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Stable legacy ID baseline       | Studio `efe6aa3b5ad020331a91f533844b0b9f70d70b76`                          | Freezes 21 realm slugs and exactly 192 top-level IDs                                                           |
| Reviewed legacy source snapshot | Studio `20dc8e0119d8ee46bd3ec26643f1b21a3eca8df0`                          | Freezes the exact deleted bytes with Git blob SHA-1 and file SHA-256                                           |
| Completed proposed ledger       | Studio `63a5adb46d12fa22dc1ff9c6f1b3dd95a376cea5`                          | Freezes dispositions, successor lists, rationales, exceptions, and retirements before final status advancement |
| Historical Draft receipt        | SHA-256 `b103a2d6a18b21b0b18e47c884f535d19a48100f294fc9a8d55d5e43656f2863` | Preserves the four pre-ratification catalogs and reviewed source evidence                                      |
| Frozen mapping                  | SHA-256 `887e11e27b97cdbcf12a0b914e8af685dbc14cda14ee6301ceb35282277d5c75` | Detects any changed disposition, successor list, rationale, owner, retirement, or citation exception           |

The historical receipt remains byte-preserved rather than being silently refreshed. The
final receipt points back to its integrity digest and the immutable reconciliation ledger.
Git history retains the deleted source content; this repository creates no duplicate copy.

## Ratified authority evidence

Authenticated verification resolved these exact merged authority states:

| Authority   | Ratified catalog commit                                                                                                                           |   Count | Owner decision                                                                                                                                                                                                | Effective merge                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Studio      | [`e077d700b07dd63be93de22a8f4e3c3b9fa79093`](https://github.com/jrmoulckers/studio/tree/e077d700b07dd63be93de22a8f4e3c3b9fa79093/principles)      |      25 | [`RATIFICATION-DESIGN-EXPERIENCE.md`](RATIFICATION-DESIGN-EXPERIENCE.md)                                                                                                                                      | [PR #25](https://github.com/jrmoulckers/studio/pull/25), merge `e077d700b07dd63be93de22a8f4e3c3b9fa79093`    |
| Engineering | [`60ff2e43da40b8177b7b8bc591f7193d58af617a`](https://github.com/jrmoulckers/engineering/tree/60ff2e43da40b8177b7b8bc591f7193d58af617a/principles) |      66 | [`docs/ratification/2026-08-09-engineering-principles.md`](https://github.com/jrmoulckers/engineering/blob/60ff2e43da40b8177b7b8bc591f7193d58af617a/docs/ratification/2026-08-09-engineering-principles.md)   | [PR #5](https://github.com/jrmoulckers/engineering/pull/5), merge `60ff2e43da40b8177b7b8bc591f7193d58af617a` |
| Product     | [`3a752c11856515a74eb204675d5d5198cac1e48e`](https://github.com/jrmoulckers/product/tree/3a752c11856515a74eb204675d5d5198cac1e48e/principles)     |      40 | [`docs/architecture/0001-ratify-product-principles.md`](https://github.com/jrmoulckers/product/blob/3a752c11856515a74eb204675d5d5198cac1e48e/docs/architecture/0001-ratify-product-principles.md)             | [PR #5](https://github.com/jrmoulckers/product/pull/5), merge `3a752c11856515a74eb204675d5d5198cac1e48e`     |
| `.github`   | [`a7be84b20737f9d404ea53213dec159dd59d5747`](https://github.com/jrmoulckers/.github/tree/a7be84b20737f9d404ea53213dec159dd59d5747/principles)     |      43 | [`principles/decisions/0001-github-ai-owner-ratification.md`](https://github.com/jrmoulckers/.github/blob/a7be84b20737f9d404ea53213dec159dd59d5747/principles/decisions/0001-github-ai-owner-ratification.md) | [PR #99](https://github.com/jrmoulckers/.github/pull/99), merge `a7be84b20737f9d404ea53213dec159dd59d5747`   |
| **Total**   |                                                                                                                                                   | **174** |                                                                                                                                                                                                               |                                                                                                              |

All four pull requests were merged by repository owner `jrmoulckers` (immutable GitHub user
ID `43014188`) into `main`. The receipt records each decision path, decision blob and file
digest, exact catalog scope, PR head, merge timestamp, merge commit, base ref, owner
association, and merger identity. For `.github`, it also records and live-verifies strict
`CI gate` branch protection, disabled force pushes and branch deletion, and the successful
`CI gate`, `Principle metadata tests`, and `Sync engine tests` checks on the PR #99 head.

### Semantic comparison

IDs, paths, titles, ownership assignments, and normalized `Legacy inputs` match the
pre-ratification evidence for all 174 principles. Status-normalized principle semantics are
also unchanged except for `GH-ACT-005`. Owner-reviewed `.github`
[PR #97](https://github.com/jrmoulckers/.github/pull/97) finalized its immutable
reusable-workflow reference and registry-enforcement wording before PR #99 Ratified the
catalog. The ID, authority, `Legacy inputs`, and Studio ledger selection did not change, so
no mapping change is warranted. The final receipt records both semantic digests and this
rationale instead of hiding the reviewed refinement.

## Final reconciliation totals

| Disposition | Meaning                                                                                                           | Entries |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | ------: |
| `rewrite`   | One primary Studio successor preserves the durable design/UI rule.                                                |      21 |
| `split`     | Two or more successors own separable parts of a mixed rule.                                                       |      43 |
| `reference` | One external authority owns the durable rule; Studio retains a trace.                                             |     122 |
| `retire`    | No successor is warranted for duplicated, incident-specific, operational, over-specific, or unsupported material. |       6 |
| **Total**   | **Missing, extra, or duplicate IDs: 0**                                                                           | **192** |

The 186 non-retired entries contain 242 successor links to 159 unique Ratified successors:

| Destination authority | Successor links |
| --------------------- | --------------: |
| Studio                |              44 |
| Engineering           |              92 |
| Product               |              56 |
| `.github`             |              50 |
| **Total**             |         **242** |

Every mapped successor reciprocally cites its stable legacy input except four
single-successor external references with the narrow
`externally-verified-ownership` exception:

- `studio-legacy:devops:7` references `ENG-TEST-004`.
- `studio-legacy:documentation:2` references `PROD-CONTENT-002`.
- `studio-legacy:documentation:3` references `PROD-CONTENT-003`.
- `studio-legacy:documentation:5` references `PROD-CONTENT-006`.

Each exception preserves its rationale and exact pinned authority evidence. The exception
records a reviewed ownership conclusion; it does not let the ledger confer authority.

## Retirement judgments

| Legacy ID                       | Category                 | Preserved evidence                                                |
| ------------------------------- | ------------------------ | ----------------------------------------------------------------- |
| `studio-legacy:ai-process:15`   | Unsupported proposal     | Historical receipt, immutable legacy snapshot, and Git history    |
| `studio-legacy:architecture:15` | Incident-specific        | Historical parser/sentinel case study and Git history             |
| `studio-legacy:devops:10`       | Duplicated               | Historical diagnostic narrative and Git history                   |
| `studio-legacy:localization:6`  | Over-specific mechanism  | Historical Intl/CLDR guidance, Studio handoff, and Git history    |
| `studio-legacy:process:2`       | Operational convention   | Delivery instructions, immutable legacy snapshot, and Git history |
| `studio-legacy:process:7`       | Operational housekeeping | Worktree instructions, immutable legacy snapshot, and Git history |

Retirement does not erase the value of historical guidance. It records why that material
does not become a durable principle in the four-authority topology.

## Exact deletion inventory

The deletion set is frozen to:

```text
principles/accessibility.md
principles/ai-process.md
principles/ai-products.md
principles/architecture.md
principles/backend.md
principles/business.md
principles/compliance.md
principles/data-analytics.md
principles/design.md
principles/devops.md
principles/documentation.md
principles/featuring.md
principles/frontend.md
principles/local-first.md
principles/localization.md
principles/middleware.md
principles/performance.md
principles/process.md
principles/project-planning.md
principles/security.md
principles/testing.md
```

All 21 paths must be absent together. Every Studio successor, decision record, ledger,
receipt, schema, migration record, and index must remain present. Stable legacy IDs may
remain in principle `Legacy inputs`, ledger keys, receipts, decision history, and audit
documentation; live links or instructions may not resolve to a deleted realm path.

## Validation

`pnpm principles:check` proves offline:

- the historical receipt remains structurally and cryptographically unchanged;
- the final receipt has the exact four authority commits, 174 Ratified catalog records,
  owner-effective decisions, digests, counts, and declared evidence semantics;
- the local 25-principle Studio tree exactly matches its Ratified receipt records while
  preserving every principle's status-normalized semantic digest;
- the ledger contains exactly the frozen 192 IDs, every entry is `verified`, and the
  normalized mapping still matches the independent PR #21 mapping pin;
- disposition cardinality, 242 links, 159 unique mapped successors, reciprocal
  `Legacy inputs`, four citation exceptions, and six retirement judgments remain exact;
- the deletion inventory contains exactly 21 paths, all are absent, protected successor
  and evidence files remain, the complete `principles/**` inventory contains no undeclared
  realm surface, and no live Markdown link or instruction resolves to a deleted path;
- receipt integrity cannot replace independent authority, mapping, or semantic pins.

Persistent negative mutations reject a Draft, missing, renamed, or changed successor;
wrong file/blob/block/semantic/catalog digest; missing, unmerged, non-owner, wrong-scope,
or changed decision; stale or wrong authority commit; changed mapping or disposition
cardinality; missing citation exception; partial or extra deletion inventory; reintroduced
legacy path; undeclared top-level or nested realm surface; false receipt meaning or claims;
historical Draft receipt claiming
Ratification/deletion; local Studio ID, semantic, or `Legacy inputs` drift; and a
recomputed receipt integrity digest that still conflicts with independent pins.

Run the authenticated remote check with:

```text
pnpm principles:verify-live
```

It fetches the immutable historical ledger and 21 deleted legacy blobs, recomputes their
digests, reads all four Ratified catalogs and decision records, verifies owner PR merge
metadata, and checks each pinned Ratification commit remains in current `main` history with
an unchanged decision-record blob and unchanged principle-block content/semantic catalogs.

### Evidence limits

Offline CI cannot prove what a private GitHub repository currently serves or that remote
branch history still contains a pinned commit. It validates committed evidence and local
state against independent pins. The authenticated live verifier supplies remote
confirmation and must be run when reviewing or refreshing evidence.

The live verifier permits unrelated later commits only when the pinned Ratification commit
remains an ancestor of `main`, the decision-record blob remains byte-identical, and the
principle blocks' content and semantic catalogs remain unchanged. Independently pinned
non-principle edits within a catalog file, such as Studio's finalized preambles, are reported
but permitted. This prevents a dated receipt from self-invalidating after the Studio
finalization merge without accepting successor drift.

## Rollback and future changes

Reverting the finalization pull request restores the 21 realm files and returns all 192
ledger entries to the proposed state while retaining the owner-ratified authority catalogs.
Do not close or rewrite historical receipts to perform a rollback.

Any future change to a principle, authority commit, decision record, mapping, citation
exception, retirement, or receipt requires explicit review, refreshed authenticated
evidence, and a new immutable history point. The completed migration must never be
self-baselined from its current ledger or receipt.
