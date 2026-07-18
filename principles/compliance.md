# Principles — Compliance

> **Status:** Draft · **Owner:** _you_ · **Aligned agent:** `compliance-specialist`
>
> This file is authored in a dedicated worktree session. Fill in the tree below.
> Keep each principle short, testable, and specific to this realm.

## Purpose

This realm governs how JRM Studio meets its external legal, regulatory, and contractual
obligations — privacy, data residency, retention, OSS licensing, audit-readiness, and consent —
so that shared packages and the products that consume them (especially the regulated `finance`
app) stay defensible without slowing delivery.

> Compliance here is **advisory**: it translates obligations into traceable requirements and routes
> implementation to the owning realm. It never weakens a security or privacy control for convenience,
> and it flags interpretations that need formal legal sign-off.

## Principles

### 1. Every obligation is traceable to an owner and evidence

- **Statement:** Each compliance obligation must map to a source, the data it touches, an
  implementing owner, and a verification method before the feature ships.
- **Why:** Untracked obligations become audit gaps. Traceability is what turns "we think we comply"
  into "here is the control and the evidence."
- **In practice:** Maintain an obligation matrix under `docs/compliance/` with columns
  _Obligation · Source · Jurisdiction · Data category · Owner · Control · Status_. No obligation sits
  in `Planned` without a named owner; none reaches `Verified` without linked evidence.
- **Anti-patterns:** "We're probably fine"; obligations living only in a person's head; a `Verified`
  row with no artifact behind it.

#### 1.1 Route implementation, don't self-implement

- **Statement:** Compliance authors requirements; the owning realm implements them.
- **Why:** Controls belong with the code and the expertise. Compliance editing production
  code or schema splits ownership and hides the control from its real maintainer.
- **In practice:** Technical controls → `security-reviewer`; storage/residency/retention/deletion →
  `backend-engineer`; region-gated UI and disclosures → the owning feature realm; experiment data
  minimization → `experimentation-engineer`.

### 2. Map privacy rights to concrete product behavior (GDPR / CCPA)

- **Statement:** For every category of personal data, name the lawful basis and implement the data
  subject rights it triggers: access, deletion, portability, correction, and opt-out.
- **Why:** GDPR and CCPA grant enforceable rights with hard deadlines. A right you can't fulfill on
  request is a violation regardless of intent.
- **In practice:** Personal data (primarily in the `finance` app) has a documented lawful basis and
  a working path for each right. `@jrm/*` shared packages carry **no** personal data — they emit
  tokens, config, and types only — which keeps most of the monorepo out of scope.
- **Anti-patterns:** Collecting personal data "just in case"; a deletion request that leaves copies
  in logs, backups, or analytics; treating CCPA opt-out as optional for non-EU users.

### 3. Know where data lives and why it may move (residency & transfer)

- **Statement:** Document where each data category may be stored and processed, and require a
  documented lawful basis before any cross-border transfer.
- **Why:** Residency rules and transfer restrictions carry regulatory and contractual penalties, and
  the finance domain is especially sensitive to where records are held.
- **In practice:** Keep a residency map in `docs/compliance/` that reflects the **actual**
  architecture (verified with `architect` / `backend-engineer`), not the intended one. New storage
  locations or sub-processors update the map before launch.
- **Anti-patterns:** A residency claim that doesn't match deployed infrastructure; adding a
  sub-processor or region silently; assuming shared-package builds imply data movement.

### 4. Retention is bounded, deletion is enforced

- **Statement:** Every personal-data category has a defined retention period, an automatic deletion
  trigger, and documented exceptions (e.g. legal hold).
- **Why:** "Keep everything forever" maximizes breach exposure and violates storage-limitation
  principles. Deletion must be a scheduled control, not a manual favor.
- **In practice:** Retention periods and triggers are recorded in the matrix and implemented by the
  owning storage realm; deletion is testable and produces audit evidence.
- **Anti-patterns:** Unbounded retention; deletion that only tombstones rows; retention periods that
  exist on paper but nothing enforces.

### 5. OSS licenses are inventoried and compatible

- **Statement:** Every dependency's license must be known, permitted, and compatible with how JRM
  Studio ships — attribution obligations satisfied and copyleft terms respected.
- **Why:** License violations are legal liabilities that surface at the worst time (acquisition,
  audit, publish). In a pnpm+Turbo monorepo, one transitive dependency can taint every consumer.
- **In practice:** Maintain an allowed-license policy; scan the workspace on `pnpm install` / CI;
  record attributions. Note the current constraint: packages are `private` + `0.0.0` (no publishing),
  which limits distribution obligations today but **not** the inventory duty.
- **Anti-patterns:** Pulling in a GPL/AGPL dependency into a package meant to be distributed;
  shipping without required attribution; "it's just a dev dependency" as a license waiver.

#### 5.1 Re-check licenses at the publishing boundary

- **Statement:** Before the `no-publishing` constraint is lifted, re-run the full license review for
  distribution, not just internal use.
- **Why:** Obligations that don't bind private packages (attribution, source offers) activate the
  moment a package is published.

### 6. Build for audit-readiness continuously

- **Statement:** Keep compliance evidence current as work lands, not assembled in a scramble before
  an audit.
- **Why:** Evidence reconstructed after the fact is weak and expensive. Continuous mapping means an
  audit is a read, not a project.
- **In practice:** Each obligation links to its control and evidence; the matrix status reflects
  reality; PRs that change data handling update the relevant compliance doc in the same change.
- **Anti-patterns:** A pre-audit fire drill; stale `Verified` rows; controls that exist in code but
  are undocumented as evidence.

### 7. Consent and disclosures are recorded, specific, and revocable

- **Statement:** Where processing relies on consent, capture what was consented to, when, and under
  which disclosure version — and make withdrawal as easy as granting.
- **Why:** Consent without a durable, versioned record is unprovable and therefore worthless in an
  audit or dispute.
- **In practice:** Consent records are versioned against the disclosure text; withdrawal propagates
  to downstream processing and analytics; disclosure language is reviewed with docs/marketing owners
  before it goes live.
- **Anti-patterns:** Bundled "accept all" with no granularity; consent logs missing the disclosure
  version; withdrawal that stops new collection but leaves existing pipelines running.

### 8. Use data categories and synthetic examples — never real PII

- **Statement:** Compliance artifacts describe data by **category**, never by embedding real user
  data, identifiers, or PII; examples are synthetic.
- **Why:** A compliance doc leaking real PII is itself a breach. Docs must be safe to share widely
  with auditors and engineers.
- **In practice:** Matrices, DPIAs, and residency maps reference categories ("email", "transaction
  record") and use fabricated samples.
- **Anti-patterns:** Pasting a production record into a DPIA; using a real customer email as an
  example; screenshots with unredacted identifiers.

## Needs Legal Review

- Final determinations of lawful basis for `finance` data processing.
- Any interpretation of cross-border transfer adequacy or specific copyleft obligations at the
  publishing boundary. These are drafted here for engineering traceability but require human/legal
  sign-off before they are treated as authoritative.

## Aligned agent

`compliance-specialist` — this specialist should treat the principles above as binding practice
when working in this realm.

## Related realms

- [Security](security.md) (`security-reviewer`) — implements the technical privacy/security controls
  compliance requires; primary hand-off for access, encryption, and deletion enforcement.
- [Backend](backend.md) (`backend-engineer`) — owns storage, data residency, retention, and deletion
  implementation.
- [Data & Analytics](data-analytics.md) (`data-engineer`) — retention, minimization, and consent
  propagation into pipelines.
- [Featuring](featuring.md) (`experimentation-engineer`) — experiment data minimization and bucketing.
- [Architecture](architecture.md) (`architect`) — source of truth for where data actually lives,
  used to verify residency claims.
- [Documentation](documentation.md) (`docs-writer`) — consent language and public disclosure review.
