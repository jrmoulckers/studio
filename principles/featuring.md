# Principles — Featuring

> **Status:** Draft · **Owner:** _you_ · **Aligned agent:** `experimentation-engineer`
>
> This file is authored in a dedicated worktree session. Fill in the tree below.
> Keep each principle short, testable, and specific to this realm.

## Purpose

Featuring governs how changes reach users: how features are flagged, rolled out,
experimented on, measured, and retired. It exists so shared `@jrm` packages and every
product app can ship, test, and kill changes safely, privately, and without dead code
accumulating.

## Principles

### 1. Every flag is a declared, owned, expiring asset

- **Statement:** Define each feature flag in `config/feature-flags/` with a description,
  `enabled` state, an `owner`, and an `expires` date (or an explicit written justification
  for why it is permanent).
- **Why:** Undocumented, ownerless flags become permanent conditional forks nobody dares
  delete — the leading source of config debt and surprise behavior across apps.
- **In practice:** A flag is a schema entry validated in CI; no flag is read in code before
  its definition merges. Long-lived operational switches (e.g. a kill switch) are marked
  permanent with a reason, not left to silently outlive their expiry.
- **Anti-patterns:** Inline `if (process.env.FEATURE_X)` checks; flags with no owner; an
  `expires` that has already passed and is ignored; a flag defined in one app's code instead
  of the shared config.

#### 1.1 One flag, one purpose

- **Statement:** A flag controls exactly one change; do not overload a flag to gate unrelated
  behavior.
- **Why:** Overloaded flags make rollout, analysis, and kill switches ambiguous — you cannot
  disable one effect without disabling the others.

#### 1.2 Flags default off and fail closed

- **Statement:** A missing, unreadable, or errored flag resolves to the safe pre-feature state.
- **Why:** Flag infrastructure will occasionally be unavailable; users must never be dropped
  into an untested state because a lookup failed.

### 2. Roll out in stages, never all at once

- **Statement:** Follow the ladder — `0%` dark launch → internal/allowlist → staged
  `rollout_percentage` ramp → `100%` — and hold at each rung until guardrails are green.
- **Why:** Staged exposure caps blast radius and gives real signal before full commitment;
  a big-bang launch turns every regression into an incident.
- **In practice:** Ramp `rollout_percentage` deliberately (e.g. 1 → 5 → 25 → 50 → 100),
  scoping with `platforms` where a change is platform-specific, and record the current rung.
- **Anti-patterns:** Jumping from internal to 100%; ramping while a guardrail is red; using
  a code deploy where a percentage dial would do.

### 3. Bucketing is deterministic and privacy-first

- **Statement:** Assign users by a deterministic hash of a stable, anonymous identifier with a
  documented seed — never by PII or sensitive raw product data.
- **Why:** Deterministic hashing keeps assignment stable across sessions and reproducible for
  analysis; bucketing on email, name, account id, or product content leaks identity and breaks
  privacy commitments.
- **In practice:** Hash an anonymous, consent-aware id; document the seed and variant
  cardinality; assignment is stable for a given user+experiment.
- **Anti-patterns:** `Math.random()` bucketing; hashing on email or account id; re-rolling
  assignment each session; unbounded variant counts.

### 4. No experiment without a hypothesis and guardrails

- **Statement:** Before an A/B test or holdout ships, document in `docs/experiments/` the
  hypothesis, variants, primary metric, guardrail metrics, sample size, and consent posture.
- **Why:** Experiments without a pre-registered metric and stopping rule invite cherry-picked
  readouts and ship decisions that regress the product on axes nobody was watching.
- **In practice:** One primary metric per experiment; guardrails (errors, latency, retention)
  defined up front; the required analytics events confirmed to exist in the catalog before
  launch.
- **Anti-patterns:** Choosing the winning metric after seeing results; running a test with no
  guardrails; launching before the events it depends on are instrumented.

### 5. Read experiments honestly, then decide

- **Statement:** Conclude an experiment against its pre-declared primary metric and guardrails,
  and record a ship / hold / rollback decision with the evidence.
- **Why:** An experiment that never reaches a documented decision leaves the flag — and the
  dead branch behind it — in limbo forever.
- **In practice:** Only call a result at the planned sample size / significance; a guardrail
  breach blocks ship even on a positive primary metric; the readout links back to the
  experiment doc.
- **Anti-patterns:** Peeking and stopping early on noise; shipping a variant that won the
  primary but breached a guardrail; readouts with no owner or decision.

### 6. Every risky feature ships with a tested kill switch

- **Statement:** Pair each rollout with a kill switch that disables the feature cleanly, and
  verify it works before ramping exposure.
- **Why:** Rollback via redeploy is too slow during an incident; an untested kill switch is a
  hope, not a control.
- **In practice:** Flipping `enabled` to `false` (or `rollout_percentage` to `0`) returns
  every user to the safe state within one refresh cycle, with no orphaned side effects; the
  switch is exercised in staging.
- **Anti-patterns:** "We'll roll back with a deploy"; a kill switch that leaves half-migrated
  state; discovering in the incident that disabling the flag doesn't fully turn the feature off.

### 7. Retire flags and pay down the debt

- **Statement:** When a rollout reaches `100%` or an experiment concludes, remove the flag,
  delete the dead branch, and close the definition — on or before its `expires` date.
- **Why:** A flag with no exit plan is a bug; stale flags multiply code paths, confuse
  analysis, and rot into untestable combinations.
- **In practice:** Concluded experiments and fully-ramped flags are queued for cleanup;
  expired or orphaned flags are surfaced and removed in coordination with the owning feature
  agent; the winning behavior becomes the unconditional default.
- **Anti-patterns:** Flags that sit at 100% for months; `expires` dates that pass unnoticed;
  removing the definition but leaving the branch, or vice versa.

## Aligned agent

`experimentation-engineer` — this specialist should treat the principles above as binding practice
when working in this realm.

## Related realms

- [Data & Analytics](data-analytics.md) (`data-engineer`) — owns the event schemas and
  analytics catalog that experiment metrics and guardrails read from; flags depend on those
  events existing before launch.
- [Compliance](compliance.md) (`compliance-specialist`) — reviews new bucketing/assignment
  data flows and consent posture; privacy-first bucketing routes through here.
- [DevOps](devops.md) (`devops-engineer`) — owns flag validation workflows and rollout
  tooling; partners on ramp validation and kill-switch verification.
- [Process](process.md) (`release-manager`) — rollout ladders and kill switches are part of
  how releases reach users.
- [Testing](testing.md) (`qa-tester`) — kill switches and each variant need coverage before
  exposure ramps.
- [Backend](backend.md) / [Frontend](frontend.md) — own the feature implementation behind each
  flag; Featuring gates the change but does not implement it.
