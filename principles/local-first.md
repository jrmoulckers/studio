# Principles — Local-First

> **Status:** Draft · **Owner:** _you_ · **Aligned agent:** `web-engineer`
>
> This file is authored in a dedicated worktree session. Fill in the tree below.
> Keep each principle short, testable, and specific to this realm.

## Purpose

Local-First governs **client-owned data**: where a product's data lives, how it survives
offline, how it syncs when a network appears, and how conflicts resolve. It exists because
[Architecture](architecture.md) is scoped to the shape of the `@jrm` kernel and
[Backend](backend.md) to the server-side surface — so neither owned the data tier of a client
that has no server at all. Several products are exactly that: `score-king` is an offline PWA,
`libro` is a pure-client media hub with no server tier, and `cartridge` is offline-capable.

> **Scope note:** These principles apply wherever the client is the system of record, whether
> or not a backend also exists. A product with a conventional server still follows
> [Backend](backend.md) for its server tier; this realm governs only the data the client
> owns.

## Principles

### 1. Local-first is a trust contract, not a cache strategy

- **Statement:** When a product is local-first, the device is the system of record. Every
  read and write must succeed with no network, and the user's data must remain fully usable
  and exportable if every remote service disappears permanently.
- **Why:** "Offline support" framed as a cache implies the server holds the truth and the
  client holds a convenience copy — so offline gaps get treated as acceptable degradation.
  Framed as a trust contract, the obligation inverts: the product owes the user continued
  access to their own data, and losing it is a correctness failure rather than a missing
  feature.
- **In practice:** Writes commit to durable local storage first and the UI reflects committed
  local state, never a pending remote round-trip. The full data set is exportable in an open
  format without a server. Feature work is judged offline-first: a feature that only works
  online is incomplete, not "partially shipped".
- **Anti-patterns:** Treating the local store as a cache that can be cleared to "fix" a bug;
  a write path that fails or blocks when the network is absent; data that can only be
  exported by an authenticated server endpoint; spinners that gate local reads.

#### 1.1 Durable-storage faults are surfaced, never swallowed

- **Statement:** If a durable write fails or persistent storage is unavailable, evicted, or
  denied, tell the user plainly and stop pretending the write succeeded.
- **Why:** Browser storage can be evicted under pressure or blocked by privacy settings. A
  local-first product that silently drops writes is worse than one that never claimed
  durability, because the user has already stopped keeping their own copy.

#### 1.2 Portable data and device-local state are separated at the type level

- **Statement:** Draw an explicit line between data the user owns and must travel with them, and
  state that is meaningful only on this device — then make the boundary structural, so
  device-local state cannot end up in an export or a sync payload.
- **Why:** Left undivided, UI scratch state, scroll positions, cached derivations, and device
  identifiers leak into exports and sync — bloating payloads, creating false conflicts between
  devices, and quietly exporting more about the user than they asked for. Enforced only by
  convention, the boundary erodes with the first hurried feature.
- **In practice:** The two live in separate types and separate stores, so serializing the
  portable set cannot accidentally include the local set. The export shape is the type, which
  means adding a field to the wrong side is a compile error rather than a review comment.
- **Anti-patterns:** One store holding both, filtered by a hand-maintained key list on export;
  device identifiers in a synced record; ephemeral UI state provoking a sync conflict.

### 2. Sync is optional and layers onto owned data behind a seam

- **Statement:** Build the product fully functional against local data first, then add sync
  as an optional layer behind a narrow provider interface — never let a sync SDK become a
  load-bearing dependency of core features.
- **Why:** If sync is entangled with feature code, the product stops working when the
  provider is unconfigured, rate-limited, or discontinued, and the vendor becomes impossible
  to replace. A seam keeps the local guarantee in principle 1 intact and keeps the vendor
  swappable.
- **In practice:** A single `SyncProvider`-style interface defines the contract; the concrete
  implementation is lazy-loaded so the vendor SDK stays out of the main bundle and out of the
  boot path. With no provider configured the app is fully usable, and nothing in the UI layer
  imports the SDK directly.
- **Anti-patterns:** Feature code importing the sync vendor's client directly; core reads
  awaiting a sync handshake; a provider SDK in the initial bundle of an app that works
  offline; "we'll extract the interface later".

### 3. Conflict resolution is an explicit, written-down merge model

- **Statement:** Choose and document a specific merge model for concurrent edits — including
  deletes — rather than relying on whichever write happens to arrive last.
- **Why:** Multi-device local-first editing guarantees conflicts. Undefined merge behavior
  does not mean "rare"; it means data loss that is unreproducible and impossible to support,
  and deletes that resurrect because a stale device re-sent a row.
- **In practice:** Per-entity last-write-wins with monotonic timestamps, tombstones so
  deletions propagate instead of being reintroduced by a stale peer, and ETag/version-based
  optimistic concurrency so a client that has fallen behind is told to reconcile rather than
  silently overwriting. The chosen model is written down where feature authors will find it,
  and conflict behavior is covered by tests.
- **Anti-patterns:** Whole-document LWW that discards concurrent edits to unrelated fields;
  hard deletes in a synced store; ignoring version conflicts and taking the newest payload;
  a merge model that exists only in one engineer's head.

### 4. Optional external services degrade to a no-op, and the app boots with zero config

- **Statement:** Every external dependency that is not essential to core function must be
  optional at runtime: absent configuration disables the integration silently and leaves the
  product fully usable. A fresh clone runs with no secrets.
- **Why:** Zero-config boot is what makes a repo contributable, reviewable in CI, and safe to
  run in preview environments without production credentials. It also prevents an outage in a
  peripheral service — analytics, sync, telemetry — from becoming an outage in the product.
- **In practice:** Config for optional services is validated as optional; when it is missing
  the integration resolves to a no-op rather than throwing, and CI runs the full suite with
  no secrets configured. This is the permissive half of a deliberate pair — see
  [Security](security.md) for the fail-closed production preflight that ensures the same
  leniency never ships to production.
- **Anti-patterns:** A missing analytics key crashing boot; `README` setup steps that require
  provisioning a third-party account before `dev` runs; tests that are skipped in CI because
  a secret is absent; optional-service failures surfacing as user-visible errors.

## Aligned agent

`web-engineer` — this specialist should treat the principles above as binding practice
when working in this realm.

## Related realms

- **[Architecture](architecture.md)** (`architect`) — owns the shape of the `@jrm` kernel and
  its contracts; this realm owns the data tier of the products that consume it. Architecture
  #14 defines the credential-proxy boundary a local-first product uses when it must reach a
  secret-bearing third-party API without giving up client-owned data.
- **[Backend](backend.md)** (`backend-engineer`) — owns the server-side surface. A product
  with both a server and client-owned data follows both realms; migrations and server
  persistence stay there.
- **[Frontend](frontend.md)** (`web-engineer`) — shares this agent; owns rendering and
  capability-detection of optional platform APIs, while this realm owns what is stored.
- **[Security](security.md)** (`security-reviewer`) — owns the fail-closed production
  counterpart to principle 4, and the handling of data at rest on the device.
- **[Performance](performance.md)** (`performance-engineer`) — the lazy-loaded provider seam
  in principle 2 is also what keeps vendor SDKs out of the initial bundle.
