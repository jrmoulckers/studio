# Principles — Process

> **Status:** Draft · **Owner:** _you_ · **Aligned agent:** `release-manager`
>
> This file is authored in a dedicated worktree session. Fill in the tree below.
> Keep each principle short, testable, and specific to this realm.

## Purpose

This realm governs how a change travels from idea to merged: branching and worktrees,
commit and PR conventions, changeset-driven versioning, and release cadence. It exists so
every change is small, traceable, reversible, and releasable on demand — even while the repo
is private, unpublished, and pinned at `0.0.0`.

## Principles

### 1. Every change moves through a disposable worktree branched off `main`

- **Statement:** Branch from `main` into a dedicated worktree per unit of work; never commit
  directly to `main`.
- **Why:** `main` is the changeset `baseBranch`, the integration point, and the source every
  release captures. Direct commits bypass CI and break the "always releasable" guarantee.
- **In practice:** One worktree = one topic (realm draft, package change, fix). Branch names
  are kebab-case and scoped (e.g. `process-principles`, `fix-tokens-dark-css`). The feature or
  bug is handled in its entirety within the worktree — including local testing — before the PR
  opens. Keep the worktree focused; open a new one for unrelated work.
- **Anti-patterns:** Committing to `main`; reusing one branch for several unrelated changes;
  long-lived branches that drift far behind `main`.

#### 1.1 Keep branches short-lived and rebased

- **Statement:** Land or close a branch quickly; rebase on `main` before merge.
- **Why:** Small, current branches merge cleanly and keep `main` releasable.

#### 1.2 A worktree is disposable and leaves no trace

- **Statement:** Once its PR is merged, delete the worktree and its branch, returning system
  state to what it was before the work began.
- **Why:** Worktrees are ephemeral dispatch units, not durable state. Deleting them keeps the
  checkout set clean and prevents stale branches from accumulating.
- **Anti-patterns:** Leaving merged worktrees around; keeping dead branches; carrying local-only
  changes forward between unrelated tasks.

### 2. Commits are conventional and atomic

- **Statement:** Use Conventional Commits (`type(scope): summary`) and keep each commit one
  coherent, buildable change.
- **Why:** Conventional prefixes make history scannable and let tooling infer intent; atomic
  commits are reviewable and revertable in isolation.
- **In practice:** Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`, `ci`.
  Scope by package or realm (`feat(tokens):`, `docs(principles):`). Breaking changes use `!`
  and a `BREAKING CHANGE:` footer. Subject in the imperative, ≤ ~72 chars.
- **Anti-patterns:** `wip`/`fixup`/`stuff` messages; mixing a refactor and a feature in one
  commit; a commit that doesn't build.

### 3. Semver intent is captured by a changeset, not guessed at release time

- **Statement:** Any change to a package's published behavior ships with a Changeset that
  declares the bump (`major` / `minor` / `patch`) and a user-facing summary.
- **Why:** Changesets are the versioning record. Deciding bumps later, by memory, drifts
  versions and loses the rationale.
- **In practice:** `pnpm changeset` at authoring time. Bumps follow the table below. Summaries
  are written for the consumer of the package, not the author. Changes with no consumer impact
  (internal docs, CI, this `principles/` tree) need no changeset.
- **Anti-patterns:** Editing a package version by hand; a PR that changes package behavior with
  no changeset; a summary that just restates the commit subject.

| Change to a package                       | Bump    |
| ----------------------------------------- | ------- |
| Breaking API / token-name / config change | `major` |
| New backward-compatible feature or token  | `minor` |
| Bug fix or internal change, no API change | `patch` |

#### 3.1 The `0.0.0` / private phase is explicit

- **Statement:** While packages are `private` + `0.0.0`, record changesets but do not publish
  or bump toward a release line until publishing is wired.
- **Why:** Keeps the versioning habit and history intact so the first real release is clean,
  without implying the packages are consumable yet.

### 4. Green CI is the merge gate

- **Statement:** A PR merges automatically once CI is green; passing CI is the only gate.
- **Why:** CI — build, typecheck, lint, and tests — is the objective go/no-go signal. Automating
  the merge on green removes human bottlenecks while still protecting the shared kernel every
  product repo depends on.
- **In practice:** PR title follows Conventional Commit form; release PRs use
  `chore(release): <description>`. The description states scope and semver impact. `pnpm build`,
  `pnpm typecheck`, and `pnpm lint` (and any tests) run in CI and must pass; on green, the PR
  merges and the worktree is torn down (see 1.2).
- **Anti-patterns:** Merging red CI; a "green" pipeline that skips build/typecheck/lint; work
  that reaches `main` without passing the gate.

#### 4.1 Squash to a clean, conventional history

- **Statement:** Squash-merge so each PR becomes one Conventional Commit on `main`.
- **Why:** A linear, conventional `main` history keeps changelog generation and `git bisect`
  reliable.

### 5. Releases capture what is on `main`

- **Statement:** Cut a release from the current state of `main`, consuming accumulated
  changesets into version bumps and changelog entries once the release checks pass.
- **Why:** `main` is always green and always releasable, so it is the single source a release
  snapshots. Deriving releases from anything else risks shipping unmerged or untested state.
- **In practice:** `pnpm changeset version` updates versions + `CHANGELOG.md` from the
  changesets merged into `main`; that generated diff lands via its own `chore(release):` PR
  through the same green-CI gate. Release checks (below) run before the version is cut.
- **Anti-patterns:** Releasing from a feature branch; hand-editing versions or changelogs;
  bundling feature work into a release PR.

#### 5.1 Release checks

- **Statement:** Before cutting a release, confirm `main` is green, P0/P1 issues are
  resolved-or-deferred, changesets exist for every changed package, and the changelog is
  generated — not hand-written.
- **Why:** A single set of checks makes "is `main` ready to snapshot?" objective and auditable.

### 6. Release cadence is on-demand and traceable

- **Statement:** Release when a meaningful set of changesets has accumulated or a fix is needed
  urgently — not on a fixed clock — and every release traces back to its changesets and PRs.
- **Why:** A small, private kernel benefits from shipping when value or risk warrants it, while
  keeping a clear line from released version → changelog → changesets → merged PRs.
- **In practice:** Batch routine changes into a single release PR; fast-track a `patch` for an
  urgent fix. Each released version's changelog links the changes it contains.
- **Anti-patterns:** Silent releases with no changelog; accumulating months of unreleased
  changesets; hotfixes that skip the changeset/PR trail.

### 7. The primary checkout tracks `main` when idle

- **Statement:** Whenever the main repository's `main` worktree is not busy, fast-forward it to
  the latest `main`.
- **Why:** The primary checkout is the reference state new worktrees branch from and releases
  snapshot. Keeping it current means every dispatch starts from an up-to-date base and no work
  is accidentally built on a stale `main`.
- **In practice:** After a PR merges and its worktree is deleted, refresh the idle `main`
  checkout so it reflects the just-merged commit. Never force an update over uncommitted or
  in-progress local work in that checkout.
- **Anti-patterns:** A primary checkout that lingers behind `main`; branching new worktrees off
  a stale base; clobbering local work in the main checkout to force a sync.

## Aligned agent

`release-manager` — this specialist should treat the principles above as binding practice
when working in this realm.

## Related realms

- [DevOps](devops.md) (`devops-engineer`) — owns the CI/CD workflows that run the build /
  typecheck / lint / test gate and (once wired) the publish step this realm's releases feed.
- [Project Planning](project-planning.md) (`product-manager`) — feeds the "idea" end of the
  idea→merged pipeline and prioritizes P0/P1 for the release checks.
- [Testing](testing.md) (`qa-tester`) — the automated quality signals that make CI the merge and
  release gate.
- [Documentation](documentation.md) (`docs-writer`) — changelog and release-note wording.
- [Security](security.md) (`security-reviewer`) — security checks that must be green in CI for
  changes with security impact.
