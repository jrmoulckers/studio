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
