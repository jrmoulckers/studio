# Principles — Backend

> **Status:** Draft · **Owner:** _you_ · **Aligned agent:** `backend-engineer`
>
> This file is authored in a dedicated worktree session. Fill in the tree below.
> Keep each principle short, testable, and specific to this realm.

## Purpose

Backend governs the server-side surface of JRM Studio's **product apps** (Next.js
`jrm-recipes`, Svelte PWA `score-king`, Gradle `finance`) — their APIs, data and
persistence, auth, migrations, service reliability, and privacy. The `@jrm` kernel ships no
runtime backend, so this realm exists to keep the **polyglot** backends of the products
consistent, safe, and recoverable while they consume the same shared config presets.

> **Scope note:** These principles are stack-agnostic by design — they must hold whether the
> backend is a Next.js route handler, a Svelte PWA sync endpoint, or a Gradle/JVM service.
> Where a product overrides the stack, it does so in its own `AGENTS.md`, not by dropping a
> principle.

## Principles

### 1. Every API is a versioned, typed contract

- **Statement:** Treat each endpoint as a stable, explicitly versioned contract with typed
  request and response schemas; never change a shipped shape in a breaking way without a new
  version.
- **Why:** Products ship independently and cache aggressively (score-king is an offline PWA).
  A silent shape change strands already-deployed and offline clients.
- **In practice:** Define request/response types once and share them; extend the `@jrm/tokens`
  pattern of "one source of truth" to API types. Additive changes only within a version;
  breaking changes get `/v2` (or an equivalent) and a deprecation window.
- **Anti-patterns:** Renaming or removing a JSON field in place; returning different shapes for
  the same route depending on caller; hand-writing client types that drift from the server.

#### 1.1 Validate at every trust boundary

- **Statement:** Parse and validate all inbound data (body, params, query, headers) at the
  edge of the service before it reaches business logic.
- **Why:** Untrusted input is the root of most correctness and security defects; validating
  once at the boundary keeps the core total and typed.

#### 1.2 Errors are structured and safe

- **Statement:** Return stable, typed error responses with a machine-readable code and a safe
  message; never leak stack traces, SQL, or internal identifiers.
- **Why:** Clients need to branch on errors reliably, and error bodies are an exfiltration
  vector. See **Security** and **Privacy**.

#### 1.3 Fallible operations return a typed result through one exhaustive mapper

- **Statement:** Model expected failure as a value in the return type rather than as a thrown
  exception, and translate raw faults into safe client-facing errors in a single exhaustive
  mapper — not ad hoc at each call site.
- **Why:** Exceptions are invisible to the type system, so a forgotten `catch` becomes a 500 and
  a leaked stack trace. One mapper is the only place that can leak internals, which makes it the
  only place that has to be audited — and exhaustiveness means a new error variant fails to
  compile until it is handled.
- **In practice:** Operations return a discriminated result (`ok` / `error` with a code) that
  callers must narrow before use. The mapper converts driver, validation, and constraint faults
  into stable codes, and unknown faults collapse to a generic error rather than passing the
  original message through.
- **Anti-patterns:** Throwing raw driver errors across a trust boundary; `catch (e) { return
{ error: e.message } }`; per-route error translation that drifts; a mapper with a default case
  that forwards the underlying text.

#### 1.4 Reject unrecognized data on import and restore

- **Statement:** Validate imported, restored, or synced payloads against the current schema and
  refuse anything unrecognized, rather than merging it in on trust.
- **Why:** Backups and exports are attacker-reachable input that arrives wearing the costume of
  your own data. Silently accepting unknown fields lets a stale or hostile file corrupt state or
  smuggle in properties the code later reads.
- **Why it matters here:** This is the trust boundary teams most often forget, because the data
  "came from us". It did not.

### 2. Persistence is explicit and owned by the service

- **Statement:** Access data only through the owning service's data layer using parameterized
  queries or safe ORM bindings; no raw string-built SQL and no cross-service table reach-in.
- **Why:** Parameterization prevents injection; clear ownership keeps schemas evolvable without
  hidden coupling across products.
- **In practice:** Each product owns its own store and schema. Constraints (not-null, unique,
  foreign keys) and indexes live in the schema, enforced by the database — not assumed in app
  code.
- **Anti-patterns:** Concatenating user input into a query; one app querying another app's
  tables directly; "we'll enforce that in code" instead of a constraint.

#### 2.1 Row conventions are uniform across every table

- **Statement:** Fix the boring choices once — collision-resistant string primary keys generated
  by the application, timezone-aware timestamps stored in UTC, and a single consistent naming
  convention for columns — and apply them to every table via a shared helper.
- **Why:** Per-table improvisation produces schemas where every join needs a lookup and every
  date bug is subtly different. Application-generated IDs let a client mint a key before it
  reaches the server, which is what makes offline creation and idempotent retries possible;
  naive timestamps silently lose an hour twice a year.
- **In practice:** A shared column helper is spread into each table definition so the
  conventions cannot be forgotten. Sequential integer keys are avoided in anything
  externally visible — they leak volume and invite enumeration.
- **Anti-patterns:** Auto-increment IDs in public URLs; `timestamp without time zone`; mixing
  naming conventions across tables; re-declaring the same columns by hand per table.

#### 2.2 Every foreign key that is queried in reverse has a covering index

- **Statement:** Index the child side of any foreign key that is filtered or joined on, and
  assert it with a test that reads the schema rather than trusting review.
- **Why:** Databases index the primary key automatically but not the referencing column, so
  "find all children of this parent" degrades to a sequential scan. It passes every test on a
  seed dataset and only fails in production, where the table is large.
- **In practice:** A test enumerates the declared foreign keys and fails if any lacks a covering
  index, so the guarantee holds for tables that do not exist yet.

### 3. Migrations are versioned, reviewed, and forward-only

- **Statement:** Change schema only through committed, ordered migrations that roll forward.
  Recover from a bad migration by shipping the next one — never by reversing one that has
  already been applied to production.
- **Why:** A down-migration is a recovery plan that has never been executed against real
  production data. It is the least-tested code in the repo at the exact moment it matters
  most, and reversing an applied change silently discards every row written between the
  deploy and the revert. Making each step independently safe turns recovery into an ordinary
  deploy instead of an untested reversal.
- **In practice:** Migrations are code — generated, committed, reviewed in the PR that needs
  them, and applied automatically on deploy. Risky data changes are two-phase
  (expand → backfill → contract), with each phase in its own release so old and new code
  overlap safely; this is what makes forward-only recovery possible. CI proves the chain:
  regenerating migrations must leave a clean tree (drift gate), and applying the chain twice
  against a throwaway database must be idempotent. Stateful operations are guarded by
  environment — a non-production deploy refuses to migrate shared state unless an isolated
  target is explicitly opted into. Recovery notes go in the PR.
- **Anti-patterns:** Editing a production database by hand; reversing an applied migration in
  production instead of rolling forward; destructive column drops in the same release that
  stops writing them; hand-written migrations that drift from the declared schema; letting a
  preview deploy inherit the production database URL.

### 4. Auth is explicit, least-privilege, and enforced server-side

- **Statement:** Authenticate the caller and authorize the specific action on the specific
  resource on the server, for every protected route — default deny.
- **Why:** Clients (especially an offline PWA) cannot be trusted to gate access; a missing
  check is a data breach, not a bug.
- **In practice:** Centralize authz so every protected handler passes through it; model user
  and tenant isolation explicitly wherever data belongs to someone. Secrets come from the
  environment, never source (see repo constraint: **no secrets**).
- **Anti-patterns:** Relying on the UI hiding a button; checking authentication but not
  authorization; scattering per-route ad-hoc checks that are easy to forget; committing keys.

### 5. Writes are idempotent and safe to retry

- **Statement:** Make any write that can be retried — by a client, a queue, or a webhook —
  idempotent via an idempotency key or a natural unique constraint.
- **Why:** Networks, PWAs syncing after offline, and webhook providers all retry. Non-idempotent
  writes produce duplicates (double-counted scores, duplicate finance entries).
- **In practice:** Dedupe on a client-supplied key or a unique business key; make retried
  requests return the original result rather than creating a second row.
- **Anti-patterns:** `INSERT` on every request with no dedupe; assuming a request arrives
  exactly once; mutating balances without a guard against replay.

### 6. Services are observable and degrade predictably

- **Statement:** Give every service structured logs, health signals, and sane timeouts,
  retries with backoff, and rate limits at its boundaries.
- **Why:** You cannot operate what you cannot see, and an un-bounded dependency call turns one
  slow downstream into a full outage.
- **In practice:** Log with correlation IDs and no sensitive fields; set explicit timeouts on
  outbound calls; bound retries with backoff; rate-limit public endpoints. Fail closed for
  auth, fail soft for non-critical reads where safe.
- **Anti-patterns:** `console.log` of request bodies; infinite/instant retries that amplify an
  outage; no timeout on a downstream call; unbounded public endpoints.

#### 6.1 Rate limits are default-safe, named, and swappable

- **Statement:** Give each protected operation a named budget rather than one global number,
  keep the limiter behind an interface so the backing store can change, and choose the failure
  mode deliberately per operation.
- **Why:** A single shared limit is always wrong for something — too loose for login, too tight
  for reads. Naming budgets makes the intent reviewable. Keeping the store swappable matters
  because the in-memory default silently stops working the moment the service runs on more than
  one instance.
- **In practice:** Budgets are declared centrally with meaningful names; an in-memory store is
  the zero-config default and a shared store is dropped in for multi-instance deploys. Auth and
  mutation limits fail **closed** when the limiter itself is unavailable; non-critical reads may
  fail open.
- **Anti-patterns:** One global limit for every route; an in-memory limiter silently deployed
  behind several instances; a limiter that fails open on the login path.

### 7. Privacy is built into the data lifecycle

- **Statement:** Collect the minimum personal data needed, know where it lives, and support
  export, deletion, and retention from day one.
- **Why:** Retrofitting privacy is expensive and risky; finance and recipe data include
  personal information that carries legal and trust obligations.
- **In practice:** Classify personal data in the schema; keep it out of logs, analytics, and
  error bodies; implement per-user export and delete paths; set retention windows instead of
  keeping data forever. Coordinate with **Compliance** and **Security**.
- **Anti-patterns:** Logging PII "just in case"; no way to delete a user's data; collecting
  fields no feature uses; treating deletion as a manual DBA task.

#### 7.1 Erasure anonymizes in place where records must survive

- **Statement:** When a record has to outlive its author for integrity or shared-history
  reasons, satisfy deletion by irreversibly stripping the personal data from it — severing the
  link to the person — rather than by cascading a hard delete or leaving a dangling reference.
- **Why:** Hard-deleting a user can destroy data other people still depend on, or leave orphaned
  rows pointing at nothing. Anonymizing in place satisfies the erasure obligation (the person is
  no longer identifiable) while keeping referential integrity intact.
- **In practice:** Identifying columns are overwritten with a neutral placeholder in the same
  transaction that removes the account, and the operation is idempotent so a retried deletion
  request is safe. What is anonymized versus removed is decided per table and written down.
- **Anti-patterns:** `ON DELETE CASCADE` that silently erases shared history; a "deleted" flag
  that leaves the personal data fully readable; anonymization that is reversible via another
  table still holding the mapping.

#### 7.2 Sensitive actions leave an append-only audit trail

- **Statement:** Record who did what and when for security-relevant and destructive actions, to
  an append-only log that is never rewritten — and never let an audit failure break the
  operation it observes.
- **Why:** Without a trail, an incident cannot be reconstructed and an erasure request cannot be
  proven satisfied. But an audit write is a side channel: if it can throw, it becomes a new way
  to fail an otherwise-successful action.
- **In practice:** Entries are written best-effort and are immutable once written. The log holds
  actor, action, target, and timestamp — not the sensitive payload itself, which would recreate
  the exposure the log is meant to police.
- **Anti-patterns:** Audit rows that are updated or deleted; a failed audit insert rolling back a
  successful mutation; dumping full request bodies (and their PII) into the audit log.

## Aligned agent

`backend-engineer` — this specialist should treat the principles above as binding practice
when working in this realm.

## Related realms

- **[Security](security.md)** — authz, input validation, and secret handling are shared
  ground; backend enforces, security reviews.
- **[Compliance](compliance.md)** — export, deletion, and retention obligations that shape the
  data lifecycle (Principle 7).
- **[Data & Analytics](data-analytics.md)** — owns downstream data; backend must not leak PII
  into analytics pipelines.
- **[Architecture](architecture.md)** / **[Middleware](middleware.md)** — service boundaries,
  contracts, and cross-service coupling decisions.
- **[DevOps](devops.md)** — runs migrations in CI/CD and operates the observability the
  services emit.
- **[Testing](testing.md)** — success and failure paths, contract tests, and migration tests.
- **[Local-First](local-first.md)** — owns data the client is the system of record for; this
  realm stays scoped to the server tier. Products with both follow both.
