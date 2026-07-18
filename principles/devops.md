# Principles — DevOps

> **Status:** Draft · **Owner:** _you_ · **Aligned agent:** `devops-engineer`
>
> This file is authored in a dedicated worktree session. Fill in the tree below.
> Keep each principle short, testable, and specific to this realm.

## Purpose

DevOps governs how JRM Studio turns source into verified, reproducible build outputs: the
GitHub Actions delivery pipeline, caching, dependency automation, security scanning, and the
release wiring that every product repo depends on. It exists so the shared kernel stays
green, fast, and trustworthy for every downstream consumer.

## Principles

### 1. CI is the single source of truth for "it works"

- **Statement:** Every push and pull request must pass one authoritative CI workflow before
  it can merge; a green local run is a convenience, never the gate.
- **Why:** Product repos consume this kernel directly — an unverified merge breaks every
  downstream app at once. The pipeline is the contract that says a change is safe.
- **In practice:** `.github/workflows/ci.yml` runs on `push` to all branches and on
  `pull_request`, executing install → build → typecheck → lint → tokens freshness in order.
  Branch protection requires the `build` job on `main`.
- **Anti-patterns:** Merging on a red or skipped run; "fixing" CI by deleting a check;
  verification steps that only exist on a developer's machine.

#### 1.1 Fail fast, fail loud

- **Statement:** Order steps cheapest-and-most-likely-to-fail first, and never mask a failing
  step (no `|| true`, no `continue-on-error` on required checks).
- **Why:** Fast, honest feedback keeps the queue short and stops broken code from advancing.

#### 1.2 Reproducible, pinned environments

- **Statement:** Pin the toolchain (pnpm version, Node major, action versions) and install
  with `--frozen-lockfile`; never let CI float to "latest".
- **Why:** A build that only passes on yesterday's transitive versions is not a build you can
  trust or roll back to.

### 2. Reusable workflows over copy-paste

- **Statement:** Factor shared CI behavior (setup, build, verify) into reusable workflows
  (`.github/workflows/reusable-*.yml`) called by thin entrypoints, rather than duplicating
  steps across jobs or repos.
- **Why:** The monorepo publishes shared config; its CI should be shared the same way. One
  fix propagates instead of drifting across N copies.
- **In practice:** A `reusable-node-verify.yml` encapsulates pnpm + Node setup, install, and
  the verify matrix; `ci.yml` and future release workflows `uses:` it with inputs.
- **Anti-patterns:** Six jobs that each re-declare the same setup block; a bug fixed in one
  workflow but still live in three others.

### 3. Least-privilege, explicitly scoped permissions

- **Statement:** Every workflow declares a top-level `permissions:` block set to the minimum
  it needs (`contents: read` by default), elevating per-job only where required.
- **Why:** A workflow token with write scope is a supply-chain blast radius. Default-deny is
  the only safe posture for a package everyone installs.
- **In practice:** `ci.yml` sets `permissions: contents: read`. Release jobs that need to push
  tags or write releases request `contents: write` on that job alone, not repo-wide.
- **Anti-patterns:** Relying on the default token scope; `permissions: write-all`; secrets
  exposed to PR workflows from forks.

### 4. Cache the deterministic, rebuild the rest

- **Statement:** Cache dependency and build artifacts by content-addressed keys so unchanged
  work is restored, but never let a stale cache substitute for a required verification.
- **Why:** Caching is the biggest CI-time lever in a Turbo + pnpm monorepo; done wrong it
  ships stale outputs or silently skips checks.
- **In practice:** `actions/setup-node` caches the pnpm store keyed on the lockfile; Turbo's
  cache keys on task inputs so `tokens` and `tailwind-preset` rebuild only when their sources
  change. Cache is an optimization layer, not a gate.
- **Anti-patterns:** Cache keys that never invalidate (e.g. keyed only on OS); disabling the
  tokens freshness check because "the cache was warm."

### 5. Honor the build graph — tokens before tailwind-preset

- **Statement:** Let Turbo's dependency graph order the build (`tokens` → `tailwind-preset`);
  never hardcode step ordering or build packages in isolation in CI.
- **Why:** `@jrm/tailwind-preset` consumes `@jrm/tokens` output. Ordering by hand is fragile
  and diverges from `pnpm -r build` the moment a package is added.
- **In practice:** CI runs `pnpm -r build`, delegating ordering to the workspace graph, and
  asserts generated token output is fresh via `pnpm tokens:dist:check`.
- **Anti-patterns:** A CI script that `cd`s into packages in a fixed sequence; committing
  stale `packages/tokens/dist/` that drifts from its DTCG sources.

### 6. Automate dependency and supply-chain hygiene

- **Statement:** Keep dependencies and pinned actions updated through automation with CI as
  the safety net; treat the lockfile and action pins as reviewed artifacts.
- **Why:** Manual, sporadic updates rot into large risky bumps and unpatched CVEs across a
  package every product installs.
- **In practice:** Dependabot (or equivalent) opens grouped PRs for npm deps and GitHub
  Actions; each must pass the full CI gate before merge; `--frozen-lockfile` guarantees the
  lockfile is authoritative.
- **Anti-patterns:** Hand-editing versions without updating the lockfile; auto-merging
  dependency PRs that skipped CI; unpinned `@latest` third-party actions.

### 7. Security scanning is a pipeline stage, not an afterthought

- **Statement:** Run automated code scanning, dependency-vulnerability, and secret scanning in
  CI, and block merges on newly introduced high-severity findings.
- **Why:** The kernel is a single point of compromise for the whole product fleet; scanning
  after release is too late.
- **In practice:** CodeQL analysis and secret scanning run on PRs; `pnpm audit` (or a vetted
  equivalent) surfaces advisory-level issues; findings are triaged, not silently dismissed.
- **Anti-patterns:** Committing secrets to workflow YAML; disabling scanners to get a merge
  through; ignoring alerts until an audit forces it.

### 8. Release automation prepares; humans publish

- **Statement:** Automate everything up to the release boundary — versioning, changelog,
  artifact preparation — but keep publishing and deployment behind an explicit human gate.
- **Why:** These packages are `private` + `0.0.0` today. When publishing is wired, an
  accidental automated publish is unrecoverable; the human gate is the safety interlock.
- **In practice:** A release workflow builds and packs artifacts, generates release notes from
  conventional commits, and stops at a manual approval (environment protection / `workflow_dispatch`)
  before any `npm publish` or tag push.
- **Anti-patterns:** A push to `main` that auto-publishes to a registry; force-pushing tags;
  release notes assembled by hand outside the pipeline.

## Aligned agent

`devops-engineer` — this specialist should treat the principles above as binding practice
when working in this realm.

## Related realms

- **[Process](process.md)** — release cadence, versioning, and changelog gates that this
  realm's automation enforces.
- **[Security](security.md)** — the scanning policies and secret-handling rules CI executes.
- **[Testing](testing.md)** — the verification suite CI runs as its quality gate.
- **[Performance](performance.md)** — CI runtime and build-caching budgets.
- **[Architecture](architecture.md)** — the workspace build graph (tokens → tailwind-preset)
  that CI ordering must honor.
