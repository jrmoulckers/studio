# Principles — Testing

> **Status:** Draft · **Owner:** _you_ · **Aligned agent:** `qa-tester`
>
> This file is authored in a dedicated worktree session. Fill in the tree below.
> Keep each principle short, testable, and specific to this realm.

## Purpose

This realm governs how we prove JRM Studio works before it ships: what we test, at
which layer, and which checks gate a merge. Because `@jrm/*` packages are the shared
kernel every product repo consumes, a regression here fans out to every consumer — so
testing exists to catch breaks at the source, not in downstream apps.

## Principles

### 1. Shape the suite like a pyramid

- **Statement:** Prefer many fast unit tests, fewer integration tests, and a thin layer of end-to-end tests.
- **Why:** Cost and flake rise with scope. A pyramid keeps feedback fast and failures easy to localize; an inverted suite is slow, brittle, and vague about root cause.
- **In practice:** Most coverage lives in package-level unit tests (token transforms, preset resolution, config exports). Integration tests assert cross-package wiring. E2E is reserved for a few critical flows in consuming apps.
- **Anti-patterns:** Driving unit-testable logic through a full browser; a suite that takes minutes to catch a one-line bug; "we'll cover it in e2e" as a reason to skip unit tests.

#### 1.1 Unit tests isolate one unit

- **Statement:** A unit test exercises a single function/module with no network, filesystem, or sibling-package dependency.
- **Why:** Isolation makes failures unambiguous and keeps tests fast and parallelizable.

#### 1.2 Integration tests verify real seams

- **Statement:** Integration tests assert that packages compose as published — e.g. the Tailwind preset resolves against real `@jrm/tokens` build output.
- **Why:** Most breakages here are contract mismatches between packages, which unit tests mock away and never see.

#### 1.3 E2E covers critical user paths only

- **Statement:** Reserve end-to-end tests for high-value flows (theme/mode switch renders correct tokens, app boots with the preset applied).
- **Why:** E2E is the slowest and flakiest layer; spend it where a failure means a broken user experience.

### 2. Test the contract, not the implementation

- **Statement:** Assert public behavior and stable outputs; do not pin internal structure that is free to change.
- **Why:** The semantic token names and build-output shapes are the contract consumers depend on; internals (how Style Dictionary composes) are not. Over-specified tests break on safe refactors and under-protect the real contract.
- **In practice:** Test that `@jrm/tokens` exports the semantic names and CSS custom properties consumers import, and that `[data-theme]` blocks restate the semantic colors. Don't snapshot incidental key ordering or generated comments.
- **Anti-patterns:** Snapshotting entire generated files so every rebuild "fails"; asserting private helper signatures; tests that must change on every non-behavioral edit.

### 3. Guard token and visual output with regression tests

- **Statement:** Lock the generated token surface and rendered appearance behind regression checks.
- **Why:** Tokens feed CSS variables, a Tailwind preset, and typed JS — a silent shift in a value or name re-flows every consuming app with no compile error to catch it.
- **In practice:** Regression-test the built `css/`, `tailwind/`, and `js/` outputs for the semantic contract (names present, three theme layers, reduced-motion block). Add visual snapshots for representative components across light, dark, and high-contrast. Review and re-baseline diffs deliberately.
- **Anti-patterns:** Blindly re-approving visual/token snapshots to make CI green; no coverage of dark or high-contrast modes; treating a token-value change as invisible because types still pass.

### 4. Typecheck and lint are gates, not substitutes for tests

- **Statement:** `pnpm typecheck` and `pnpm lint` must pass on every change, and they run before the test suite — but green types are not proof of correct behavior.
- **Why:** Types and lint catch a whole class of errors cheaply and repo-wide, yet they say nothing about runtime behavior. Treating them as "the tests" leaves logic unverified.
- **In practice:** CI runs `pnpm typecheck` and `pnpm lint` as required gates alongside `pnpm build`; a red gate blocks merge. Behavior still needs its own assertions.
- **Anti-patterns:** Shipping untested logic because "it compiles"; `// @ts-expect-error` or disabled lint rules to dodge a gate; skipping the gate locally and relying on CI to notice.

### 5. Build must be green and reproducible

- **Statement:** `pnpm build` (and `pnpm -r build`) must succeed from a clean install, and generated output must not be committed.
- **Why:** The build is the artifact consumers get. A build that only works with stale local `build/` dirs hides breakage until a downstream repo pulls the package.
- **In practice:** Validate on a clean checkout with `pnpm install` then `pnpm build`; keep `packages/tokens/build/` git-ignored and regenerated. CI treats a build failure as a blocking defect.
- **Anti-patterns:** Committing regenerated `build/` artifacts; tests that pass only against a hand-edited build dir; "works on my machine" builds that skip a clean install.

### 6. Set coverage expectations that mean something

- **Statement:** Cover behavior and edge cases, not lines for their own sake; hold transform/logic code to a high bar and don't chase 100%.
- **Why:** A coverage number is a proxy. Gaming it with assertion-free tests wastes effort and gives false confidence; ignoring it lets critical paths rot untested.
- **In practice:** Token transforms, config resolution, and other logic carry meaningful assertions on happy paths and edge cases (missing theme, empty scale). Coverage reports flag untested critical code, not trivial re-exports.
- **Anti-patterns:** A coverage gate satisfied by tests with no assertions; excluding hard-to-test code just to hit a threshold; treating a percentage as the goal instead of confidence.

### 7. Require tests where risk lives

- **Statement:** New behavior, the fixed cause of a bug, and any change to a shared contract ship with tests in the same change.
- **Why:** Tests written later are usually not written at all, and a bug without a regression test invites its own return. Contract changes are the highest-blast-radius edits in this repo.
- **In practice:** A feature PR includes tests for the new behavior; a bugfix PR adds a test that fails before the fix; changes to token names/outputs or config exports update the regression suite. Pure docs or comment changes need none.
- **Anti-patterns:** "Tests in a follow-up PR"; closing a bug with no reproducing test; altering a semantic token name with no updated assertion.

## Aligned agent

`qa-tester` — this specialist should treat the principles above as binding practice
when working in this realm.

## Related realms

- **[Frontend](frontend.md)** — owns component behavior and visual snapshots this realm regresses.
- **[Design](design.md)** — defines the token and theme contract that token-regression tests protect.
- **[DevOps](devops.md)** / **[Process](process.md)** — run the typecheck/lint/build/test gates in CI and enforce them at merge.
- **[Accessibility](accessibility.md)** — contributes checks (contrast, reduced-motion) that ride the same suites.
- **[Performance](performance.md)** — shares e2e/critical-path coverage and guards against regressions in build output.
