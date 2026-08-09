# Legacy principle migration ledger

The migration ledger reconciles the 21-file, 192-principle legacy tree with the merged Draft
successor trees in Studio, Engineering, Product, and `.github`. It applies
[ADR-0003](https://github.com/jrmoulckers/.github/blob/main/docs/architecture/0003-four-authority-topology.md)
without copying another authority's principles into Studio or treating a Draft proposal as
normative.

**Pre-ratification coverage is 192 of 192 legacy principles, with zero unmapped IDs.** Every
ledger entry remains `proposed`, the pinned migration-verification receipt records every
successor as `Draft` at its reviewed commit, and all 21 legacy realm files remain intact.
Completion of this reconciliation is evidence for owner review; it is not Ratification and
does not authorize deletion.

A local Studio successor's `Status` may separately move to a candidate `Ratified` value ahead
of this ledger, through its own owner-effective Ratification decision record (for example,
[`RATIFICATION-DESIGN-EXPERIENCE.md`](RATIFICATION-DESIGN-EXPERIENCE.md)). Such a record and its
`Status: Ratified` fields propose Ratification; they are effective only when the repository
owner merges the record, and even then they neither refresh this pinned receipt nor advance any
ledger disposition past `proposed`.

## Authoritative records and evidence

- [`migration-ledger.json`](migration-ledger.json) is the proposed disposition record.
- [`migration-ledger.schema.json`](migration-ledger.schema.json) defines its testable shape,
  cardinality, retirement categories, and narrow citation-exception contract.
- [`migration-verification-receipt.json`](migration-verification-receipt.json) is dated,
  non-normative verification evidence captured from immutable authority commits.
- [`migration-verification-receipt.schema.json`](migration-verification-receipt.schema.json)
  defines the receipt shape.
- [`README.md`](README.md) freezes the 21 realm slugs, stable ID ranges, and baseline count.

The ledger records the proposed disposition. The authority repositories remain the sources of
truth for successor principles. The receipt is not a second principle catalog, cannot prove
Ratification, and cannot authorize deletion.

## Pinned source state

The stable-ID baseline and the reviewed source snapshot serve different purposes. The baseline
freezes the exact 192-ID inventory. The source snapshot freezes the exact legacy bytes reviewed
during reconciliation, including later edits that retained those stable IDs.

| Source                                           | Immutable commit                           | Draft principles |
| ------------------------------------------------ | ------------------------------------------ | ---------------: |
| Stable legacy ID baseline (`jrmoulckers/studio`) | `efe6aa3b5ad020331a91f533844b0b9f70d70b76` |   192 legacy IDs |
| Reviewed Studio source and successors            | `20dc8e0119d8ee46bd3ec26643f1b21a3eca8df0` |               25 |
| Engineering successors                           | `ea1ad771b46612a62d54b66e8077df4e5af6f16a` |               66 |
| Product successors                               | `b0b2ef66094bbc5abf19cd4ae0ac85b05f12ddb5` |               40 |
| `.github` successors                             | `3036d5d1ed882a4c5acffe1ccfa0b49165538eef` |               43 |
| **Successor catalog total**                      |                                            |    **174 Draft** |

For each authority, the receipt records the repository, commit, source paths, stable IDs,
statuses, normalized `Legacy inputs`, Git blob SHA-1 values, file SHA-256 values, principle-block
SHA-256 values, and a catalog digest. Its own integrity digest covers the receipt body.

## Stable legacy IDs

Each top-level `### N.` heading at baseline
[`efe6aa3`](https://github.com/jrmoulckers/studio/tree/efe6aa3b5ad020331a91f533844b0b9f70d70b76/principles)
has the immutable ID:

```text
studio-legacy:<realm-file-slug>:<top-level-number>
```

For example, `studio-legacy:design:5` identifies Design principle 5 and includes every nested
`5.x` sub-principle under it. Realm slugs and numbers are never reused, renumbered, or reassigned.
Editorial heading changes do not change the ID.

## Reconciliation totals

| Disposition | Meaning                                                                           | Entries |
| ----------- | --------------------------------------------------------------------------------- | ------: |
| `rewrite`   | One primary Studio successor preserves the durable design/UI rule.                |      21 |
| `split`     | Two or more necessary successors own separable parts of a mixed rule.             |      43 |
| `reference` | One external authority owns the durable rule; Studio retains a reference.         |     122 |
| `retire`    | No successor is warranted for non-durable, duplicated, or over-specific material. |       6 |
| **Total**   | **Unmapped: 0**                                                                   | **192** |

The 186 non-retired entries contain 242 successor links to 159 unique Draft successors:

| Destination authority | Successor links |
| --------------------- | --------------: |
| Studio                |              44 |
| Engineering           |              92 |
| Product               |              56 |
| `.github`             |              50 |
| **Total**             |         **242** |

Successor metadata was inverted first, then each mapping was reviewed semantically. A selected
successor must cite the legacy ID in its `Legacy inputs` metadata. The only exception is a
single-successor external `reference` with a documented `externally-verified-ownership`
exception. Four such exceptions record exact pinned evidence:

- `studio-legacy:devops:7` references `ENG-TEST-004`.
- `studio-legacy:documentation:2` references `PROD-CONTENT-002`.
- `studio-legacy:documentation:3` references `PROD-CONTENT-003`.
- `studio-legacy:documentation:5` references `PROD-CONTENT-006`.

The exception does not let the ledger confer ownership. It records a semantic ownership
conclusion that the live verifier can independently check against the pinned authority bytes.

## Retirement evidence

Retirement removes no source file in this milestone. Each retired entry has a concise category,
rationale, and pinned location where the prior evidence remains:

| Legacy ID                       | Category                 | Evidence retained in                                       |
| ------------------------------- | ------------------------ | ---------------------------------------------------------- |
| `studio-legacy:ai-process:15`   | Unsupported proposal     | Legacy snapshot and Git history                            |
| `studio-legacy:architecture:15` | Incident-specific        | Legacy parser/sentinel case study and Git history          |
| `studio-legacy:devops:10`       | Duplicated               | Legacy diagnostic narrative and Git history                |
| `studio-legacy:localization:6`  | Over-specific mechanism  | Legacy Intl/CLDR guidance, Studio handoff, and Git history |
| `studio-legacy:process:2`       | Operational convention   | Delivery instructions, legacy snapshot, and Git history    |
| `studio-legacy:process:7`       | Operational housekeeping | Worktree instructions, legacy snapshot, and Git history    |

The retirements do not claim that historical guidance never had value. They record that the
material should not become a durable principle in the current authority topology.

## Validation

`pnpm principles:check` uses Node built-ins and persistent negative mutations to prove offline:

- the current legacy headings are the exact 192-ID baseline with no missing, extra, or duplicate
  ledger keys;
- all 21 current legacy files match the reviewed source-snapshot blob and content digests;
- ledger and receipt objects satisfy their dependency-free schema contracts and disposition
  cardinality;
- local Studio successor IDs, paths, and Legacy inputs match the pinned receipt exactly; each
  principle's `Status` either matches the receipt's pinned `Draft` value with an unchanged
  block digest, or is the one permitted `Draft` → `Ratified` transition, proven unchanged
  otherwise by an independent, hardcoded status-excluded content digest (never written into
  the receipt itself);
- a local `Status: Ratified` is accepted only alongside a complete, owner-effective
  Ratification decision record naming every Ratified ID (see
  [`RATIFICATION-DESIGN-EXPERIENCE.md`](RATIFICATION-DESIGN-EXPERIENCE.md) for the current 25
  design/experience successors); mixed or unexpected `Status` values across the 25 fail;
- the receipt matches independent repository, commit, path, count, catalog, and integrity pins;
- every selected successor reciprocally cites its legacy input or uses one allowed external
  reference exception;
- every legacy ID cited by any successor has a ledger disposition;
- unknown IDs, duplicate keys, wrong commits or digests, deleted or renumbered successors, bad
  cardinality, nonreciprocity, circular or self-authoritative evidence, premature Ratification,
  false Ratification claims, and Draft deletion authorization fail;
- the complete ledger remains pre-ratification and deletion stays blocked while every mapped
  successor is `Draft` in the pinned, unrefreshed receipt — independent of any local Studio
  `Status` candidate change, which does not itself ratify, supersede, or advance any ledger
  disposition.

Offline CI proves that the committed evidence is internally consistent and unchanged. It cannot
prove that a private remote currently serves the recorded bytes or that a newer authority commit
has not superseded the reviewed source.

Run the authenticated live check when reviewing or refreshing the receipt:

```text
pnpm principles:verify-live
```

The command uses `GH_TOKEN`, `GITHUB_TOKEN`, or `gh auth token`, reads the four exact commits
through the GitHub Git Data API, recomputes Git blob, file, block, and catalog digests, reparses
IDs, statuses, and `Legacy inputs`, and compares them with the committed receipt. It never uses
the ledger to construct authority evidence.

## Refreshing the receipt

Refresh the receipt whenever an authority commit, successor path, stable ID, status,
`Legacy inputs` field, or source byte changes:

1. Resolve the new immutable merged commit for each affected authority.
2. Fetch source trees and blobs from those exact commits without editing authority main
   checkouts.
3. Rebuild the receipt from authority bytes without using ledger selections as input.
4. Update the independent commit, path, count, catalog, and receipt-integrity pins in the
   validator.
5. Re-invert `Legacy inputs` and repeat semantic mapping review.
6. Run both `pnpm principles:check` and `pnpm principles:verify-live`.

Refreshing evidence does not Ratify a successor or disposition. Only the repository owner can
make that decision.

## Status and removal gate

| Status        | Meaning                                                                       |
| ------------- | ----------------------------------------------------------------------------- |
| `proposed`    | A contributor or agent drafted the disposition; it is non-normative.          |
| `ratified`    | The repository owner accepted the disposition and successor assignment.       |
| `implemented` | The ratified successor/reference exists, or the approved retirement is ready. |
| `verified`    | Evidence confirms ownership, successor state, and inbound-link migration.     |

The next gate is explicit repository-owner Ratification in every authority that owns a mapped
successor, followed by owner Ratification and verification of the corresponding ledger
dispositions. No legacy top-level principle may be deleted until:

1. its one ledger entry is owner-ratified;
2. the entry reaches `verified`;
3. every mapped successor is owner-ratified in its canonical authority;
4. every successor or retirement claim has durable evidence;
5. references to the legacy text have been updated; and
6. deletion would not remove an unmapped nested rule.

A realm file may be deleted only after every stable ID in its range passes all six checks. At
this pre-ratification milestone, none is deletion-eligible.
