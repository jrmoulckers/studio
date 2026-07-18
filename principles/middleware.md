# Principles — Middleware

> **Status:** Draft · **Owner:** _you_ · **Aligned agent:** `architect`
>
> This file is authored in a dedicated worktree session. Fill in the tree below.
> Keep each principle short, testable, and specific to this realm.

## Purpose

The Middleware realm governs the layer that sits **between a product's frontend and its
backend**: request/response handling, adapters that translate between contracts, edge and
runtime middleware, caching, and how errors cross the boundary. It exists so that every
`@jrm` consumer — Next.js (`jrm-recipes`), the Svelte PWA (`score-king`), the Gradle app
(`finance`) — talks to services through **one predictable, typed, and observable seam**
instead of ad-hoc glue re-invented per app.

## Principles

### 1. The boundary is a contract, not a convenience

- **Statement:** Define every frontend↔backend interaction as an explicit, versioned,
  typed contract (schema + types) that both sides import; never let a route shape be
  inferred from its first caller.
- **Why:** Untyped seams drift silently. When three apps in different frameworks share
  services, an implicit shape becomes an unversioned dependency that breaks one consumer
  the moment another changes — with no compiler to catch it.
- **In practice:** Contracts live in a shared `@jrm`-scoped package and are the single
  source of truth; handlers and clients are both generated from or validated against them.
  A contract change is a semver event with a changeset, not a silent edit.
- **Anti-patterns:** Hand-writing the same DTO in each app; `any`/`unknown` at the edge;
  reading undocumented fields "because the response happens to have them."

#### 1.1 Parse, don't trust, at the edge

- **Statement:** Validate and narrow every inbound request and outbound response against
  its schema at the boundary; downstream code receives only already-parsed, typed data.
- **Why:** Trust placed at the edge is trust you never have to re-establish deeper in the
  stack, and it turns malformed input into one clear rejection instead of scattered crashes.

#### 1.2 Version and deprecate deliberately

- **Statement:** Breaking contract changes ship behind a new version; the old version stays
  until every consumer has migrated, then is removed on a stated timeline.
- **Why:** The three products deploy independently, so a boundary must tolerate consumers
  that lag by design.

### 2. Middleware is thin, ordered, and single-purpose

- **Statement:** Each middleware does exactly one thing (auth, logging, rate-limit,
  caching, error handling); compose them in an explicit, documented order.
- **Why:** Fat, multi-purpose middleware hides ordering bugs — auth after logging leaks,
  caching before auth serves private data — and makes the request lifecycle unreadable.
- **In practice:** The pipeline is declared in one place per app and reads top-to-bottom as
  the request's journey. Each layer is independently testable with a fake request.
- **Anti-patterns:** A "misc" middleware that does five unrelated things; business logic
  living in middleware; ordering that only works by accident.

### 3. Adapters isolate the outside world

- **Statement:** Wrap every external service, SDK, and framework-specific API behind an
  adapter that speaks the app's own contract; the rest of the code depends on the adapter,
  not the vendor.
- **Why:** Adapters keep framework churn (Next.js route handlers vs. SvelteKit endpoints vs.
  Gradle) and vendor changes at the boundary, so a swap touches one file, not the app.
- **In practice:** Runtime-specific code (edge `Request`/`Response`, Node streams, Svelte
  `RequestEvent`) is confined to the adapter; core logic receives normalized inputs.
- **Anti-patterns:** Vendor SDK types leaking into feature code; `process.env` or
  `Request` objects read deep in business logic; the same fetch wrapper copied per app.

### 4. Caching is explicit, keyed, and invalidatable

- **Statement:** State a cache's scope, key, TTL, and invalidation trigger wherever it is
  introduced; never cache without a documented way to bust it.
- **Why:** Silent or unbounded caching is the top source of "works on my machine" and stale
  data bugs, and shared middleware amplifies one bad cache across every product.
- **In practice:** Cache keys encode every input that changes the result (including
  auth/tenant/theme); private responses are never stored in a shared or edge cache.
- **Anti-patterns:** Caching authenticated responses in a shared layer; keys that omit a
  varying input; a cache with no expiry and no invalidation path.

### 5. Errors propagate as typed, safe, and observable results

- **Statement:** Convert failures at the boundary into a typed error contract with a stable
  code and a client-safe message; log the full cause with a correlation ID on the server.
- **Why:** Leaking raw stack traces or vendor errors to the client is both a security risk
  and a broken UX; opaque 500s with no correlation make cross-system debugging guesswork.
- **In practice:** One boundary error handler maps internal failures to the error contract;
  every request carries a correlation ID that appears in logs on both sides of the seam.
- **Anti-patterns:** Returning raw exception text to the client; swallowing errors into a
  generic 200; inconsistent error shapes per route.

#### 5.1 Fail fast and degrade predictably

- **Statement:** Apply explicit timeouts, retries with backoff, and fallbacks to every
  outbound call; a slow dependency must fail in a bounded, known way.
- **Why:** Without limits, one slow upstream cascades into exhausted connections and a
  frontend that hangs instead of degrading.

### 6. The boundary is stateless and idempotent where it counts

- **Statement:** Keep middleware and adapters stateless between requests; make retry-exposed
  operations idempotent so a safe retry never double-applies an effect.
- **Why:** Edge/runtime middleware may run on many instances with no shared memory, and
  networks retry. State in the seam and non-idempotent writes turn transient blips into
  data corruption.
- **In practice:** Request-scoped context is passed explicitly, not stored in
  module-level globals; mutating endpoints accept an idempotency key.
- **Anti-patterns:** Module-scoped mutable caches used as per-request state; a retry
  that charges twice; relying on instance affinity.

### 7. The seam is observable by default

- **Statement:** Emit structured logs, metrics, and traces for every boundary crossing —
  latency, status, cache hit/miss, upstream — without logging secrets or PII.
- **Why:** The middleware layer is where cross-system problems surface first; if it's a
  black box, every incident starts from zero.
- **In practice:** A shared logging/telemetry adapter enforces a consistent structured
  shape and redaction rules across all three products.
- **Anti-patterns:** `console.log` debugging left in the pipeline; tokens or request bodies
  written to logs; success paths that emit nothing.

## Aligned agent

`architect` — this specialist should treat the principles above as binding practice
when working in this realm.

## Related realms

- **[Backend](backend.md)** — owns the services behind the seam; middleware consumes and
  adapts their contracts.
- **[Frontend](frontend.md)** — the seam's primary consumer; error and loading contracts
  defined here shape the UI's states.
- **[Architecture](architecture.md)** — module/package boundaries and ADRs that decide
  where the seam lives and what it may depend on.
- **[Security](security.md)** — auth, input validation, and secret handling at the edge.
- **[Performance](performance.md)** — caching, timeouts, and latency budgets across the boundary.
- **[Testing](testing.md)** — contract, adapter, and pipeline tests that keep the seam honest.
