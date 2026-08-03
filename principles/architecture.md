# Principles — Architecture

> **Status:** Draft · **Owner:** _you_ · **Aligned agent:** `architect`
>
> This file is authored in a dedicated worktree session. Fill in the tree below.
> Keep each principle short, testable, and specific to this realm.

## Purpose

Architecture governs the **shape of the kernel**: how packages are layered, which way
dependencies point, what contracts the monorepo exposes to product repos, and how those
decisions are recorded. It exists so the design + tooling kernel stays coherent, swappable,
and framework-agnostic as products (`jrm-recipes`, `score-king`, `finance`, …) multiply.

## Principles

### 1. Respect the package layering

- **Statement:** Packages form a strict, acyclic layering — primitives at the bottom,
  presets above, consumers at the top — and a package may only depend on layers below it.
- **Why:** The build is ordered (`tokens → tailwind-preset`); a back-edge creates a cycle
  that breaks `turbo run build`, makes outputs non-deterministic, and couples layers that
  must evolve independently.
- **In practice:** `@jrm/tokens` depends on nothing in the repo; `@jrm/tailwind-preset`
  consumes `@jrm/tokens`; config packages (`eslint-config`, `tsconfig`, `prettier-config`)
  are leaves. Turbo's `dependsOn` graph matches this order.
- **Anti-patterns:** `@jrm/tokens` importing the Tailwind preset; two packages importing
  each other; a config package reaching into tokens; hidden coupling through relative
  `../../` paths that cross a package boundary.

#### 1.1 Depend inward, never outward

- **Statement:** Dependencies point down the stack toward primitives; a lower layer never
  imports a higher one, and no package imports a product app.
- **Why:** Stable things (tokens, scales) must not depend on volatile things (product UI).
  Inward-only dependencies keep the kernel reusable across every consumer.

#### 1.2 One responsibility per package

- **Statement:** Each package owns exactly one concern (tokens, a Tailwind preset, one
  shared config family) and exposes it through a single documented entry point.
- **Why:** Single-purpose packages can be versioned, replaced, or themed without dragging
  unrelated concerns along.

### 2. The semantic-token contract is the boundary

- **Statement:** Products bind to **semantic token names**, never to primitive values or
  per-theme literals; a theme may restyle primitives but must keep the full semantic name
  set intact.
- **Why:** The whole theming model — runtime mode swaps with no rebuild — depends on
  `~16` semantic names staying constant. Renaming or dropping one silently breaks every
  consumer and every theme at once.
- **In practice:** Add a product theme by copying `themes/default/`, restyling the four
  color files, and keeping every semantic name. Components reference `var(--color-primary)`,
  not `#7c5cff`; charts read `tokens.color.success`, not a hex literal.
- **Anti-patterns:** A theme that omits or renames a semantic token; a component hard-coding
  a primitive/hex value; a consumer reaching into `themes.dark.*` primitives to reconstruct a
  value the semantic layer already provides.

### 3. Outputs stay framework-agnostic

- **Statement:** Kernel outputs must work in plain CSS, Svelte, and React without
  framework-specific glue; the lowest-common-denominator artifact is CSS custom properties.
- **Why:** One source of truth only pays off if every product can consume it as-is. A
  React-only or Svelte-only output forks the kernel and defeats the design.
- **In practice:** `@jrm/tokens` emits CSS variables, a Tailwind preset, and typed JS/TS
  objects — three views of the same DTCG source. No package ships a component that assumes a
  particular renderer or bundler.
- **Anti-patterns:** Shipping a React component from a shared package; emitting output that
  requires a specific framework runtime; theming that only re-flows under one framework.

### 4. Contracts are explicit, stable, and typed

- **Statement:** Every package's public surface — exports, CSS variable names, config
  entry points — is an intentional contract: documented, typed where possible, and changed
  only deliberately.
- **Why:** Product repos couple to these surfaces. An accidental export change or a moved
  file is a breaking change even without a version bump, and everything here is `0.0.0`.
- **In practice:** Public API lives behind named entry points (`@jrm/tokens`,
  `@jrm/tokens/css`, `@jrm/eslint-config/react`). Typed tokens ship `.d.ts`. Internal files
  are not part of the contract and stay unimported by consumers.
- **Anti-patterns:** Consumers deep-importing build artifacts or internal paths; adding an
  export "just for one app"; changing a CSS variable name without treating it as a break.

#### 4.1 Version contracts intentionally

- **Statement:** Contract changes follow semver semantics — additive in minors, breaking only
  in majors — even while packages sit at `0.0.0` and publishing is not yet wired.
- **Why:** Consumers must be able to reason about upgrade risk from the version alone.
  Practicing this now means the discipline is already in place when publishing lands.

#### 4.2 Evolve contracts additively

- **Statement:** Grow a contract by adding to it; when something must go, deprecate it
  through a documented path with a replacement — never rename or silently remove a
  semantic token, export, or entry point in place.
- **Why:** Every consumer and theme binds to these names. Additive evolution keeps the
  runtime theming model and product repos working across the change instead of breaking
  them all at once.

### 5. Record architectural decisions as ADRs

- **Statement:** Any decision that sets or changes a boundary, contract, dependency
  direction, or cross-cutting technology choice is captured in an ADR under
  `docs/architecture/` before it ships.
- **Why:** Boundaries erode when the reasoning behind them is undocumented. An ADR preserves
  the context and trade-offs so future changes are deliberate, not accidental reversals.
- **In practice:** Use the ADR template (Status / Context / Decision / Consequences). Adding
  a package, introducing a build tool, or altering the token contract each warrants an ADR;
  routine bug fixes do not.
- **Anti-patterns:** A new package or dependency landing with no ADR; an ADR that states the
  decision but omits the rejected alternatives and consequences; decisions relitigated in PR
  threads instead of recorded.

### 6. Prefer the simplest boundary that works

- **Statement:** Introduce a new package, layer, or abstraction only when a concrete need
  demands it; document the trade-off in an ADR when you do.
- **Why:** Every boundary has a cost — build wiring, versioning, cognitive load. Speculative
  structure is complexity without payoff and is the first filter of the decision framework.
- **In practice:** Extend an existing package before creating one. A new package must earn
  its place with a distinct responsibility and a real consumer, not a hypothetical one.
- **Anti-patterns:** Splitting a package "for future flexibility" with one consumer; adding
  an abstraction layer no product uses; premature generalization ahead of a second use case.

### 7. Minimize data and surface by default

- **Statement:** Expose the least an interface needs — the smallest export set, the fewest
  tokens, no data a consumer doesn't require — and keep packages `private` until publishing
  is a deliberate, ADR-backed decision.
- **Why:** Least-data and least-surface reduce the blast radius of change and the privacy
  footprint. Everything published becomes a contract you must keep.
- **In practice:** Packages stay `private` + `0.0.0`; builds are local-verify only. New
  exports are added when a consumer needs them, not preemptively.
- **Anti-patterns:** Publishing before the contract is stable; exporting internals as a
  convenience; broad barrel files that leak implementation details.

### 8. Design for platform parity

- **Statement:** Define every feature in a platform-agnostic form first — its data model,
  contracts, and behavior — so all platforms reach architectural parity; let each platform
  render the intricacies with its own best practice, but never let a platform gain or lose a
  capability by accident.
- **Why:** Users move between products (Next.js, Svelte PWA, Gradle app) and expect the same
  capability everywhere. Designing per-platform first fragments the feature set and turns
  parity into a permanent catch-up effort.
- **In practice:** A feature's contract (tokens, API shape, states) lives in the shared,
  framework-agnostic layer; platform code adapts presentation and interaction to native
  conventions on top of that contract. Parity is on the capability, not on pixel-identical UI.
- **Anti-patterns:** A capability that exists only in one product because it was built into
  that app's code; platform-specific data models that can't be reconciled; "we'll add it to
  the others later" as a standing backlog.

#### 8.1 Platform-native intricacies, shared architecture

- **Statement:** The architectural contract is identical across platforms; the experience
  details (gestures, navigation, motion, input) follow each platform's best practice.
- **Why:** Parity of capability must not force a lowest-common-denominator UX. Shared
  architecture + native detail is how you get both.

### 9. Stay DRY across platforms

- **Statement:** Any logic, contract, or value used by more than one platform lives once in
  a shared package and is consumed everywhere; duplicate it across products only with a
  documented reason.
- **Why:** Cross-platform duplication is where parity and the single source of truth break
  down — the copies drift, and a fix in one product silently leaves the others wrong.
- **In practice:** Tokens, types, validation, and shared behavior are hoisted into the
  kernel (or a shared package) rather than re-implemented per app. The token contract is the
  model: define once, consume in Next.js, Svelte, and React unchanged.
- **Anti-patterns:** The same constant, type, or rule copy-pasted into each product; a bug
  fixed in one app but not its siblings; per-app forks of logic that was meant to be shared.

### 10. Builds are deterministic and reproducible

- **Statement:** Generated outputs are produced only by the build (`pnpm build`), kept
  git-ignored, and regenerated from source — never hand-edited or committed.
- **Why:** The tokens → tailwind-preset pipeline only stays trustworthy if the source is the
  single input. A hand-tweaked or committed artifact drifts from its source and makes builds
  irreproducible across machines and consumers.
- **In practice:** `packages/tokens/build/` stays git-ignored and is rebuilt from DTCG
  sources via Style Dictionary. The same `pnpm build` yields the same CSS, preset, and typed
  outputs anywhere. Fixes go into sources or the build config, not the emitted files.
- **Anti-patterns:** Editing `build/` by hand; committing generated CSS/JS; a build whose
  output depends on machine state, install order, or a manual post-step.

### 11. Guard the dependency supply chain

- **Statement:** Taking on a third-party dependency is an architectural decision: evaluate
  it against the technology rubric, require a passing security and license posture, and
  record non-trivial additions in an ADR.
- **Why:** Every dependency is code you ship and a contract you inherit. Unvetted additions
  expand the attack surface, risk license incompatibility, and quietly raise maintenance
  burden across every consumer.
- **In practice:** Score candidates on runtime fit, community health, security, performance,
  maintenance, and license; require at least a 3 on security for anything production-bound.
  Prefer the platform-native or already-present option before adding a new dependency.
- **Anti-patterns:** Pulling in a package without evaluation; adding a heavy dependency for a
  trivial need; an incompatible or unreviewed license entering the tree.

### 12. Enforce a single source of truth per concern

- **Statement:** Each fact — a color, a type, a scale, a config rule — has exactly one
  authoritative home; every other use references it rather than restating it.
- **Why:** Duplicated facts drift. One source of truth is what makes the token contract,
  cross-platform DRY, and platform parity hold together instead of decaying into copies.
- **In practice:** DTCG sources are the sole origin of tokens; shared configs are the sole
  origin of lint/TS/format rules. Consumers import the value; they don't re-declare it.
- **Anti-patterns:** The same value defined in two packages; a config rule duplicated per
  app; a "reference" copy that has to be kept manually in sync.

### 13. Enhance progressively from a safe baseline

- **Statement:** Kernel outputs degrade safely — they assume the least-capable environment
  and layer enhancements on top, never requiring maximum capability to function.
- **Why:** Parity across platforms and users only holds if the baseline works everywhere.
  Accessibility, reduced-motion, and high-contrast are baseline guarantees, not add-ons.
- **In practice:** The CSS output ships `prefers-reduced-motion` and `high-contrast` modes
  as first-class layers; semantic tokens resolve to a working value before any enhancement.
  A feature works without JS-only or high-end-only capabilities where it reasonably can.
- **Anti-patterns:** An experience that breaks without a specific capability; motion or
  contrast handling bolted on per product instead of guaranteed by the kernel; a baseline
  that assumes the best device or network.

## Aligned agent

`architect` — this specialist should treat the principles above as binding practice
when working in this realm.

## Related realms

- **[Middleware](middleware.md)** (`architect`) — shares this agent; the connective/contract
  layer between kernel and products lives here.
- **[Design](design.md)** (`design-engineer`) — owns the semantic-token _values_ and
  component design; Architecture owns the token _contract_ and layering.
- **[Frontend](frontend.md)** (`web-engineer`) — primary consumer of the framework-agnostic
  outputs and the Tailwind preset.
- **[DevOps](devops.md)** (`devops-engineer`) — owns the Turbo/pnpm build wiring that the
  package layering depends on.
- **[Documentation](documentation.md)** (`docs-writer`) — ADRs and contract docs are
  authored here and surfaced to consumers.
- **[Security](security.md)** (`security-reviewer`) — dependency direction, supply-chain
  vetting, and least-surface choices feed the security posture.
- **[Accessibility](accessibility.md)** (`accessibility-reviewer`) — the progressive-baseline
  guarantees (reduced-motion, high-contrast) are owned jointly with this realm.
- **[Testing](testing.md)** (`qa-tester`) — reproducible builds and platform parity are what
  the test suite verifies.
- **[Local-First](local-first.md)** (`web-engineer`) — owns the client-owned data tier of the
  products; Architecture owns the shape of the kernel they consume.
