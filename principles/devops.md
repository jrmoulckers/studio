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
  `pull_request`, executing install → build → typecheck → lint → format check → tokens
  freshness in order. Branch protection requires the `build` job on `main`.
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

#### 1.3 A required check must run on every PR — never trigger-level path-skip it

- **Statement:** A workflow that emits a required status check must trigger on every pull
  request. Never narrow it with `on.pull_request.paths` / `paths-ignore`; scope the work with an
  in-workflow change detector and let the real job skip instead.
- **Why:** If a required context is gated by a trigger-level path filter, a PR that doesn't
  match it never reports that context at all — so branch protection holds the PR in a
  permanently pending `BLOCKED` state that only an admin override can clear. The check appears
  to be protecting you while actually just blocking the queue.
- **In practice:** A cheap always-on `changes` job computes a `relevant` output; real jobs
  `needs: changes` and guard with an `if:` condition, so an irrelevant PR reports the context as
  a _skip_, which branch protection counts as a pass. Each workflow includes its own file in its
  filter so changes to the workflow always validate themselves.
- **Anti-patterns:** `paths:` on `on.pull_request` for a workflow that emits a required check;
  clearing a stuck PR with `--admin` instead of fixing the trigger; renaming a workflow or job
  without updating the required-context name it publishes.

#### 1.4 CI verifies with no real secrets

- **Statement:** The full verification pipeline — build, typecheck, lint, tests, migrations —
  must pass with no production credentials available, using ephemeral throwaway services and
  placeholder config instead.
- **Why:** A pipeline that needs real secrets cannot run safely on a fork or an untrusted
  contribution, and every secret exposed to CI is a secret exposed to anything CI executes.
  Requiring them also means the checks quietly stop running exactly when they matter — on
  outside PRs.
- **In practice:** Database-backed jobs spin up a disposable service container; optional
  integrations resolve to no-ops when unconfigured (see [Local-First](local-first.md) principle
  4); any test needing a real credential is the rare, explicitly-scoped exception rather than
  the default.
- **Anti-patterns:** Tests skipped in CI because a secret is missing; a production connection
  string in repository secrets used by ordinary test jobs; a pipeline that cannot run on a fork.

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
  it needs (`contents: read` by default), elevating per-job only where required. The same rule
  governs long-lived credentials: derive a token's scopes from the paths a tool provably writes,
  not from the category of tool it is.
- **Why:** A workflow token with write scope is a supply-chain blast radius. Default-deny is
  the only safe posture for a package everyone installs. A stored PAT is worse than a job
  token because it does not expire with the run, so an unnecessary scope persists indefinitely
  and is almost never revoked once granted.
- **In practice:** `ci.yml` sets `permissions: contents: read`. Release jobs that need to push
  tags or write releases request `contents: write` on that job alone, not repo-wide. Before
  requesting a credential scope, enumerate the tool's actual write targets — a sync engine that
  resolves workflows but never writes them needs no `workflow` scope, and a fine-grained token
  naming specific repositories beats a classic one carrying blanket `repo`. Where a test already
  asserts the write targets, cite it rather than re-deriving the scope by reading the code.
- **Put the scope where the credential is created:** the error message a missing secret produces is
  the most likely place anyone ever reads about it, so the required permissions belong there in
  full — not only in the docs it beat to the reader. Guidance that lives only in documentation
  loses to the string printed at the moment of failure. There is usually more than one such
  surface — a `--help` string, a preflight error, the comment above the constant — and tightening
  the documented scope in the places you remember leaves the old advice in the most-read one. Grep
  for the superseded wording instead, and treat every copy the tool can print as documentation.
- **Name the widening failure mode:** state, at the point of failure, that a permission error on a
  path the tool is not supposed to write is a **bug in the tool**, not a missing scope. Otherwise
  the first such error is "fixed" by granting the scope, and the guarantee is gone permanently in
  exchange for one green run. A narrow scope is only as durable as the first 403 against it.
- **Anti-patterns:** Relying on the default token scope; `permissions: write-all`; secrets
  exposed to PR workflows from forks; requesting a scope because the tool touches a concept
  rather than because it writes those files; documenting a minimal scope while the runtime error
  message still tells people to create a broad one.

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
  lockfile is authoritative. Every third-party action is pinned to a **full 40-character commit
  SHA** with an adjacent version comment (`uses: actions/checkout@<sha> # v6.0.3`) — the SHA is
  what's enforced, the comment is what makes it reviewable and updatable.
- **Anti-patterns:** Hand-editing versions without updating the lockfile; auto-merging
  dependency PRs that skipped CI; unpinned `@latest` third-party actions; a floating tag such
  as `@v4`, which is mutable remote code executing with repository write scope.

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

### 9. A deployed service reports its own health and identity

- **Statement:** Every deployed service exposes an unauthenticated health endpoint that runs a
  cheap, time-bounded dependency check, is never cached, leaks no internals, and reports the
  running version and build SHA.
- **Why:** An outage should be found by tooling, not by users. A standard probe is the contract
  every uptime monitor and load balancer binds to, and a self-identifying artifact answers
  "which version is actually live?" without correlating deploy logs to commits.
- **In practice:** The endpoint runs a short-timeout dependency check and distinguishes
  _degraded_ (a configured dependency is unreachable → `503`) from _not configured_ (the
  dependency is intentionally absent → still `200`). It returns coarse enum status plus version
  and SHA — never a driver error, stack trace, or connection string — and sets `no-store` so
  every hit is live. It stays unauthenticated so external monitors can reach it.
- **Anti-patterns:** No health endpoint; a "health" route served from cache; a probe that dumps
  exception details; auth-gating the liveness check; treating "the process is up" as healthy
  while its database is unreachable; an app that can only identify itself by raw commit SHA.

> **Scope note:** Client-only products (`libro`, `cartridge`) host no service and cannot serve a
> probe. The portable half still applies — the built artifact records its version and build SHA
> so a running client can identify itself in a bug report.

### 10. Unvalidated configuration needs more discipline, not less

- **Statement:** Configuration that no tool reads, validates, or fails on is the configuration
  most likely to be silently wrong forever. Treat descriptive fields as a stricter obligation
  than load-bearing ones, and say so where they are declared.
- **Why:** A wrong load-bearing value is self-correcting — the build breaks, someone fixes it,
  and the config converges on truth. A wrong descriptive value has no failure mode at all. Its
  only readers are humans and agents deciding how to treat a repo, and they have no independent
  source to check it against.
- **In practice:** Where a field is descriptive, the schema or docs say plainly that it is
  unvalidated and unenforced. Better still, add the cheap check that would have caught it —
  asserting a declared package manager matches the lockfile actually present costs one test.
- **Anti-patterns:** Assuming a field is enforced because its name sounds functional
  (`packageManager` that only feeds a log line); a registry entry describing a repo's stack
  that nothing ever reconciles against the repo; treating "it can't break anything" as a
  reason to review it less carefully.

### 11. A local copy of an inherited default silently opts you out

- **Statement:** Where a platform supplies defaults by inheritance, a member repo must not keep
  its own copy of an inherited file. Having a stale copy is worse than having none.
- **Why:** Inheritance is resolved by absence. The moment a local file exists it wins, and the
  repo is frozen at that snapshot — while still appearing to participate in the shared standard.
  The failure is invisible: nothing errors, the file is simply never updated again.
- **In practice:** Org-level community health files, shared workflow definitions, and base
  configs are referenced (`uses: org/.github/...@main`, `extends:`) rather than vendored. Sync
  tooling resolves such files, reports them, and deliberately does not write them. Docs state
  the prohibition explicitly rather than only stating that the file is "not synced."
- **When the copy shares canon's name:** the divergence becomes undetectable from either side. A
  registry sees a member that never calls the shared workflow; the member sees a workflow it calls
  every run; and only someone holding both trees notices they are different files wearing one name.
  Any later switch from `uses: ./…` to `uses: org/.github/…@main` then silently swaps in a
  different definition. Give a genuinely local workflow a local name, or reference canon.
- **Anti-patterns:** Vendoring a reusable workflow to "pin" it, then never revisiting the copy;
  a member repo carrying its own health files because a scaffolding step copied them in;
  documentation that says a file is never written without saying it must never be added; a local
  workflow whose filename matches a canon workflow it has diverged from.

### 12. Content-addressed comparison normalizes what the platform rewrites

- **Statement:** When a tool decides "changed or unchanged" by hashing file content, hash a
  normalized form — line endings at minimum — never the raw bytes on disk.
- **Why:** Git, editors and checkout settings rewrite line endings without changing meaning.
  A byte hash makes every file on a Windows checkout with `core.autocrlf=true` look modified,
  so a tool that skips modified files skips _everything_ while reporting success. The blast
  radius is total and the symptom looks like a catastrophic bug rather than an encoding one.
- **In practice:** Hashes are computed over LF-normalized content, so the same logical file
  compares equal regardless of checkout platform. Repos also declare `* text=auto eol=lf` in
  `.gitattributes` so the on-disk form is stable in the first place — belt and braces, because
  the normalization is what actually protects the tool.
- **Idempotence must cover the tool's own metadata:** a run that changes no content must write no
  file at all, including its lockfile, manifest or receipt. Any timestamp stamped on every write
  turns a no-op into a diff, and scheduled automation that opens an empty PR every cycle gets
  switched off — after which nothing syncs at all, which is a strictly worse failure than the noise.
  The guarantee usually rests on a single `changed` flag being honest, so test the second run for a
  byte-identical artifact rather than trusting the flag.
- **Anti-patterns:** `sha256(readFileSync(path))` as a change detector; a drift check that has
  only ever been exercised on Linux CI; assuming `.gitattributes` is present in every consumer
  repo; reporting "N files locally modified" when the real difference is `\r`.

### 13. Audit a generated file against what the generator would emit, not against its source

- **Statement:** When a pipeline transforms an asset on the way out — injecting a provenance
  header, normalizing line endings, splicing frontmatter — verify a downstream copy by running
  it through the same transform, never by diffing it against the upstream source.
- **Why:** Every correctly generated file differs from its source by exactly the transform. Diff
  against the source and the tool's own output reads as local modification, so the audit reports
  drift on the files that are most correct. The failure is quiet and uniform: it flags everything
  equally, which looks like a systemic problem rather than a broken baseline.
- **In practice:** The injector is exported as a pure function, so an audit imports it and
  compares against `inject(path, canon)`. A file matching that is adopted into the lockfile; only
  a difference the generator could not have produced is drift.
- **Small, uniform and always present is the dangerous size:** a baseline error that produces a
  large delta looks catastrophic and gets investigated; one that adds a single plausible line to
  every file reads as a finding. A conclusion drawn that way survives only while the real
  difference dominates the artefact — against a file stale by one line, the method reports one
  added and one removed, and nothing in the output distinguishes the tool's own footprint from the
  defect. It also defeats outlier checks by construction: a systematic error yields a plausible
  value on _every_ row rather than an anomaly on one, so scanning for the odd result out finds
  nothing and returns confidence. Sanity-check a sweep against a known-good row computed a
  different way, not against the shape of its own distribution.
- **Anti-patterns:** `diff canon/x member/.github/x` for an asset the sync stamps; explaining away
  a one-line delta as "just the header" instead of folding the header into the expected value;
  an audit whose "clean" result depends on the transform being trivial today; treating the presence
  of a provenance stamp as evidence a file is current — a hand-copied older revision carries the
  stamp too, so it reads as synced and only a byte comparison against `inject(path, canon)` says
  otherwise.

### 14. A tool that refuses to clobber must report what it refused, where a human will look

- **Statement:** "Never overwrite local changes" and "always deliver the current version" are in
  genuine tension. A tool that resolves it conservatively creates a class of content that can never
  arrive, so the skip must surface in the artifact a human reviews — the PR body — not only in the
  run log that nobody reads after a green run.
- **Why:** The skipped file is, by construction, the one most likely to be stale, and staleness is
  self-perpetuating: the tool will refuse it again on every subsequent run and report success each
  time. The failure has no end state and no escalating signal. Worse, the content most worth
  delivering is often documentation of a trap, so the repo missing it is the repo about to hit it.
- **In practice:** Drift is surfaced per-file in the PR description with the reason and the fix, and
  a run that changes nothing but has skips exits distinctly from a clean run. Resolution is a
  targeted deletion or refresh of the offending file, never a global `--force`, which discards every
  other local change indiscriminately in order to fix one. Audit every consumer for pre-existing
  staleness _before_ the first run: any drift on a repo that has never synced predates the tool by
  definition, so the first run flags it and moves on rather than repairing it. Compare against the
  generator's rendered output, and enumerate from the manifest rather than from the consumer, so
  files that are merely absent are visible too.
- **Match the escape hatch's scope to the failure's:** an override taken per run, per member or per
  invocation cannot clear a single file, so reaching for it to fix one stale copy silently discards
  every other local change in its blast radius. Where the conservative behaviour is per-file, the
  override should be too — and until it is, say so at the place someone goes looking for the remedy,
  because the flag's name will read like the answer.
- **Anti-patterns:** A skip counted in a summary line and never named; treating "no failures" as
  "everything delivered"; `--force` as the documented remedy for single-file drift; a warning whose
  only home is stdout of a scheduled job.

### 15. A config format must show which fields the tool executes and which it merely records

- **Statement:** Fields that determine behavior and fields that only describe it must be
  distinguishable by looking at the file. Where they share a shape and a namespace, every reader —
  human or agent — has to trace the code to learn which half of the file is load-bearing, and none
  of them will.
- **Why:** A recorded field is worse than an absent one. An executed field that is wrong turns CI
  red, someone fixes it, and the value converges on truth; a recorded field can be quietly wrong
  forever while looking equally authoritative, and its only readers are the people with no
  independent source to check it against. The unvalidated field therefore needs _more_ care than
  the load-bearing one, which is the opposite of how "this isn't validated" reads at the point of
  edit.
- **The config's grouping is not the engine's grouping, and only the engine's is real.** Entries
  sitting under one key, one kind, or one array look like they share a code path, and often they do
  not: a switch on a literal filename inside the handler splits a category the file presents as
  uniform. Any rule stated at the category's granularity is then wrong in both directions — assume
  the special case is general and you get a false alarm on every ordinary member; assume the
  general case covers everything and the special one is silently cleared. Read the dispatch before
  writing a rule about a category, and where a category has an exception, say so at the config.
- **In practice:** Separate the two classes visibly — key order, a nested object, or a comment at
  the point of editing rather than in a design doc nobody opens first. Prefer deriving a descriptive
  field from the artifact it describes over asserting it: if the tool already clones the subject, it
  can read the real answer. Any field with no consumer at all is a comment with the syntax of data —
  give it a reader or delete it.
- **A recorded field graduates when something asserts on it:** the cheapest repair is not to delete
  the field but to give it a consumer with teeth. A free-text `notes` becomes load-bearing the
  moment a test requires it to be present and specific whenever a related setting departs from the
  default — the field stops being decoration and acquires the convergence pressure that only
  executed fields normally have.
- **Anti-patterns:** Guarding a hand-typed unvalidated field with a hand-typed expected-value table,
  which catches later drift but not a shared initial error, and reproduces the exact mechanism that
  produced the original wrong value — now agreed upon in two places; a validation snapshot dated in
  a comment and described as enforcement.

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
