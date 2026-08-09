# Ratification decision record — Studio design and experience successors

This is a concise, machine-checkable record of the proposed repository-owner Ratification
decision for exactly 25 Studio successor principle IDs under [`design/`](design) and
[`experience/`](experience). It is evidence about that one decision; it is not itself the
Studio design/UI authority and it does not restate any principle's content.

## Decision and scope

By merging this pull request, the repository owner ratifies the `Status` field of exactly the
25 Studio successor principle IDs below, changing each from `Draft` to `Ratified`. No other
field, no ID, no ordering, no path, and no legacy realm file changes as part of this decision.

## Scope

```text
STUDIO-A11Y-001
STUDIO-A11Y-002
STUDIO-A11Y-003
STUDIO-CMP-001
STUDIO-CMP-002
STUDIO-CMP-003
STUDIO-FND-001
STUDIO-FND-002
STUDIO-FND-003
STUDIO-INT-001
STUDIO-INT-002
STUDIO-INT-003
STUDIO-INT-004
STUDIO-INT-005
STUDIO-L10N-001
STUDIO-L10N-002
STUDIO-L10N-003
STUDIO-TOK-001
STUDIO-TOK-002
STUDIO-TOK-003
STUDIO-TOK-004
STUDIO-UX-001
STUDIO-UX-002
STUDIO-UX-003
STUDIO-UX-004
```

## Authority

Studio locally owns design and UI principles per
[ADR-0003](https://github.com/jrmoulckers/.github/blob/main/docs/architecture/0003-four-authority-topology.md).
The repository owner alone may ratify a Studio principle; this record documents that decision
for the 25 IDs above and for no other ID, in any authority.

## Evidence reviewed

- Source PR #15, which authored the Studio Draft design/UI tree.
- The final review and fixes applied on top of that tree before this decision.
- The executable validators and tests: `scripts/validate-principles.mjs`, run as
  `pnpm principles:check` (chained into `pnpm test`), including its persistent negative
  mutation fixtures.
- Migration ledger PR #21, which reconciled the 192-ID legacy baseline against the Draft
  successor catalogs without ratifying any disposition or successor.

## Content and ownership unchanged

Content, ownership, IDs, and legacy inputs are unchanged. Every imperative statement,
rationale, verification, implementation owner, ratification-owner assignment, handoff, and
`Legacy inputs` citation in the 25 principles above is identical before and after this
decision; only the `Status` field moves from `Draft` to `Ratified`.

## Effective event

Merging this pull request by the repository owner is the effective Ratification approval
event. This record does not itself ratify anything and does not claim owner approval before
merge. Before that merge, the `Status: Ratified` fields in the seven files above are a
proposed change awaiting the owner's merge decision, not a normative claim.

## The pinned migration receipt stays historical

The pinned [`migration-verification-receipt.json`](migration-verification-receipt.json)
remains historical, non-normative evidence; it proves no Ratification and authorizes no
deletion. Its recorded Studio successor statuses, commit pin, and digests are not refreshed by
this decision — they continue to describe the `Draft` state of the reviewed source commit. A
local successor's status may move to `Ratified` while that pinned receipt entry continues to
read `Draft`, because the receipt is dated evidence about a past commit, not a live index of
current status. `scripts/validate-principles.mjs` independently pins a status-normalized
content digest for each of the 25 IDs above so that a `Draft` → `Ratified` status edit can be
told apart from any other change to the same principle.

## Downstream finalization gate

Downstream finalization remains blocked on Ratification by Engineering, Product, and
`.github` plus refreshed live evidence. Ratifying these 25 Studio IDs does not by itself:

- ratify, supersede, or advance any `principles/migration-ledger.json` disposition past
  `proposed`;
- authorize deletion of any of the 21 legacy realm files or their 192 top-level principles;
  or
- ratify any Engineering, Product, or `.github` successor principle.

The legacy removal gate in [`MIGRATION.md`](MIGRATION.md) still requires owner Ratification of
every mapped successor in its own canonical authority, a refreshed and re-verified receipt
(`pnpm principles:verify-live`), and `verified` ledger status before any legacy file or
principle may be removed.

## Owner-review checklist

- [ ] Confirms the Scope list above is exactly the 25 Studio successor IDs, no more, no fewer.
- [ ] Confirms no Statement, Rationale, Verification, Implementation owner, Ratification
      owner, Handoffs, or Legacy inputs text changed for any of the 25 IDs.
- [ ] Confirms the 21 legacy realm files and `principles/migration-ledger.json` dispositions
      are byte-identical to `main` before this PR.
- [ ] Confirms `pnpm test` (including `pnpm principles:check`) passes with this change.
- [ ] Merges this PR to make the Ratification effective; does not treat the open PR as
      already-effective Ratification.

## Non-goals

- This record does not ratify any Engineering, Product, or `.github` principle.
- This record does not change any legacy realm file, migration ledger disposition, or the
  pinned migration-verification receipt.
- This record does not authorize deletion of any legacy principle or realm file.
- This record does not refresh the pinned Engineering, Product, or `.github` authority commits
  in the migration-verification receipt.
