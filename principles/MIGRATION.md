# Legacy principle migration ledger

This ledger turns the 21-file, 192-principle legacy tree into explicit migration work. It
implements the transition compatibility required by
[ADR-0003](https://github.com/jrmoulckers/.github/blob/main/docs/architecture/0003-four-authority-topology.md)
without moving packages, copying another authority's rules, or pretending the mapping is
already complete.

**Current coverage: 0 of 192 legacy principles.** The scaffold deliberately contains no
disposition entries. Milestone 2 will add reviewed entries as successors and evidence
become available.

## Authoritative files

- [`migration-ledger.json`](migration-ledger.json) contains the migration records.
- [`migration-ledger.schema.json`](migration-ledger.schema.json) defines their testable
  shape and allowed values.
- [`README.md`](README.md) freezes the 21 realm slugs, stable ID ranges, and baseline count.

The JSON ledger is the disposition record. Narrative notes and PR descriptions may explain
a migration, but they do not replace a ledger entry.

## Stable legacy IDs

Each top-level `### N.` heading at baseline
[`efe6aa3`](https://github.com/jrmoulckers/studio/tree/efe6aa3b5ad020331a91f533844b0b9f70d70b76/principles)
has the immutable ID:

```text
studio-legacy:<realm-file-slug>:<top-level-number>
```

For example, `studio-legacy:design:5` identifies Design principle 5 and includes every
nested `5.x` sub-principle under it. Realm slugs and numbers are never reused, renumbered,
or reassigned. Editorial heading changes do not change the ID.

## Dispositions

Every legacy ID receives exactly one disposition:

| Disposition | Meaning                                                                                        | Successors                              |
| ----------- | ---------------------------------------------------------------------------------------------- | --------------------------------------- |
| `rewrite`   | Replace the legacy principle with one materially revised principle in the correct authority.   | Exactly one authority/ID pair.          |
| `split`     | Separate a mixed legacy principle across independently owned successors.                       | Two or more authority/ID pairs.         |
| `reference` | Replace duplicated normative text with a durable reference to an existing canonical principle. | Exactly one authority/ID pair.          |
| `retire`    | Remove guidance that is obsolete, non-principle commentary, or intentionally unsupported.      | None; evidence must justify retirement. |

Successor authorities are exactly `Studio`, `Engineering`, `Product`, or `.github`.
Successor IDs must be stable canonical identifiers, not headings or copied prose.

## Status and ratification

| Status        | Meaning                                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------- |
| `proposed`    | A contributor or agent has drafted the disposition. It is non-normative.                           |
| `ratified`    | The repository owner has accepted the disposition and successor assignment.                        |
| `implemented` | The successor or reference exists in its canonical authority, or the approved retirement is ready. |
| `verified`    | Evidence confirms the successor/reference, ownership, and inbound-link migration.                  |

Only the repository owner may move an entry to `ratified`. Agents may add or revise
`proposed` entries and collect evidence.

Each JSON entry records:

- `legacyId`
- one `disposition`
- one or more `successors` when required, each with `authority` and canonical `id`
- `status`
- at least one durable `evidence` URL or repository identifier
- an accountable `owner`

The ledger must contain at most one entry per `legacyId`. A pull request that introduces a
duplicate ID, an unknown legacy ID, the wrong successor cardinality, or a status transition
without evidence is invalid.

## Removal gate

A top-level legacy principle may be deleted only when:

1. its one ledger entry is owner-ratified;
2. the entry reaches `verified`;
3. every successor or retirement claim has durable evidence;
4. references to the legacy text have been updated; and
5. deletion does not remove an unmapped nested rule outside the disposition's recorded
   scope.

A realm file may be deleted only after every stable ID in its range passes all five checks.
Until then, the file remains intact. This makes deletion a measurable consequence of
completed migration rather than an informal cleanup decision.
