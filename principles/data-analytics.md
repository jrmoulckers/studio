# Principles — Data & Analytics

> **Status:** Draft · **Owner:** _you_ · **Aligned agent:** `data-engineer`
>
> This file is authored in a dedicated worktree session. Fill in the tree below.
> Keep each principle short, testable, and specific to this realm.

## Purpose

This realm governs **product analytics** across the JRM Studio apps (`jrm-recipes`,
`score-king`, `finance`, and future products): the events we emit, the metrics we derive,
and the privacy guarantees around both. It exists so we can answer "does the product work
for users?" from telemetry that is purpose-bound, consent-gated, free of PII, and
aggregated by design — never from ad-hoc logging or raw personal data.

## Principles

### 1. Privacy is the default, not a feature

- **Statement:** Capture the minimum needed to answer a stated question; never emit PII,
  secrets, or sensitive raw product content (recipe text, player names, transaction
  amounts, account numbers).
- **Why:** Product apps hold personal and financial data. Analytics that leaks it turns a
  measurement tool into a breach surface and a compliance liability. Minimized data can't
  leak what it never held.
- **In practice:** Payloads carry IDs, enums, and bucketed values only; strings are scrubbed
  at the trust boundary before emission; any new data flow is routed for privacy review
  (see Compliance) before it ships.
- **Anti-patterns:** Logging a raw search query, a recipe title, a player's display name, or
  a dollar amount; adding a `notes` free-text property "just in case"; shipping a new event
  without a documented purpose.

#### 1.1 Bucket and aggregate continuous values

- **Statement:** Emit continuous or high-cardinality values only as bounded buckets
  (e.g. `duration_bucket: "5-15s"`, `party_size: "3-4"`), never as raw numbers.
- **Why:** Raw values are re-identifying in aggregate and explode cardinality. Buckets keep
  metrics privacy-safe and storage-bounded.

#### 1.2 No cross-app identity graph

- **Statement:** Analytics IDs are per-app, rotating, and non-reversible; never join
  telemetry to an authenticated user identity or across products.
- **Why:** Linking behavior to a person (or stitching one person across apps) is exactly the
  profiling we opt out of. Product questions are answerable from anonymized cohorts.

### 2. Consent gates every event

- **Statement:** No analytics event is emitted without an explicit, revocable `analytics`
  consent grant; revoking consent stops emission immediately.
- **Why:** Consent is the legal and ethical basis for collection. An event that fires before
  or after consent is withdrawn is an unlawful collection, not a bug.
- **In practice:** Every schema declares a `consent` scope; the emission SDK checks the live
  consent state at call time and drops the event (no queueing) when the grant is absent;
  default state is "no consent."
- **Anti-patterns:** Buffering events until consent arrives and then flushing them;
  defaulting consent to on; gating the UI but not the emit path.

### 3. Events follow the taxonomy

- **Statement:** Name every event `<object>_<action>` in snake_case (e.g. `recipe_saved`,
  `game_completed`, `budget_created`); properties are snake_case, typed, and documented.
- **Why:** A consistent grammar makes events discoverable, queryable, and diffable across
  apps. Naming drift makes the catalog unusable and metrics ambiguous.
- **In practice:** Names and properties are validated against the taxonomy in CI; new events
  are added to the metrics catalog in the same change that emits them.
- **Anti-patterns:** `clickButton`, `RecipeSaved`, `event_1`; the same concept named three
  ways across three apps; a property that's a string in one event and an int in another.

#### 3.1 Bound dimensional cardinality

- **Statement:** Every property is a typed enum or bounded bucket with a documented value
  set; free-form strings are prohibited as dimensions.
- **Why:** Unbounded dimensions break aggregation, blow up storage, and smuggle in PII.

### 4. Schemas are versioned contracts

- **Statement:** Each event has a numbered schema; changes are additive, and any breaking
  change ships as a new `version` rather than mutating the existing one.
- **Why:** Emission (apps) and storage (pipeline) are decoupled in time. A silently changed
  schema corrupts historical metrics and breaks downstream consumers.
- **In practice:** Schemas live in `config/analytics/` as the source of truth; a validation
  step rejects events that don't match a registered schema/version; deprecations are
  announced with a migration window.
- **Anti-patterns:** Renaming or retyping a property in place; reusing a property name for a
  new meaning; emitting an event that no schema describes.

### 5. Every metric has one definition

- **Statement:** Each metric (activation, retention, funnel step, feature adoption) has a
  single documented definition in the metrics catalog, tracing back to the events that
  compute it.
- **Why:** Two dashboards showing different "active users" destroys trust in the data. One
  source of truth makes metrics comparable and auditable.
- **In practice:** `docs/analytics/` holds the catalog: metric name, question it answers,
  formula, source events, and owner; dashboards reference catalog definitions, not bespoke
  SQL.
- **Anti-patterns:** Redefining "retention" per dashboard; a metric with no source events;
  business KPIs computed here instead of in the Business realm's domain reporting.

### 6. Retention is bounded and documented

- **Statement:** Every event class has a declared retention window and is deleted or further
  aggregated when it expires; raw event storage is short-lived, aggregates are long-lived.
- **Why:** Indefinite retention is both a privacy risk and a cost. Old raw events rarely
  answer new questions that pre-aggregated rollups can't.
- **In practice:** Retention is a required field on each schema; a scheduled job enforces
  deletion/rollup; consent revocation triggers deletion of that subject's raw events.
- **Anti-patterns:** "Keep everything forever"; retention defined in tribal knowledge instead
  of the schema; raw payloads outliving the aggregates built from them.

### 7. Instrumentation is reviewed like data, not like logging

- **Statement:** Treat each event as a QA'd data asset: schema-validate, check naming, verify
  bounded cardinality, and confirm the consent gate before merge.
- **Why:** Analytics silently degrades — a mislabeled or double-fired event produces
  plausible-but-wrong numbers that nobody notices until a decision is made on them.
- **In practice:** Event QA runs in CI (schema validation, taxonomy lint, cardinality check);
  new or changed events require a metrics-catalog entry and a privacy note in the PR.
- **Anti-patterns:** Shipping instrumentation with no test; discovering a double-fire in
  production; using the product's app logging channel to smuggle in untyped analytics.

## Aligned agent

`data-engineer` — this specialist should treat the principles above as binding practice
when working in this realm.

## Related realms

- **[Compliance](compliance.md)** — owns privacy/legal review; every new data flow and
  consent change routes here.
- **[Security](security.md)** — payload scrubbing at the trust boundary, secrets handling,
  and access control on stored telemetry.
- **[Backend](backend.md)** — owns the storage/pipeline implementation this realm defines the
  contract for (schemas in, aggregates out).
- **[Business](business.md)** — consumes metrics for domain reporting/KPIs; that reporting
  lives there, not in product telemetry.
- **[Featuring](featuring.md)** — experiments consume these events for exposure and outcome
  metrics; shares the taxonomy and consent gate.
- **[Frontend](frontend.md)** — owns the emission callsites in the apps; this realm defines
  what and when they emit.
