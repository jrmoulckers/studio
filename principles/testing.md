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

#### 1.4 Keep domain logic framework-free so it can be tested directly

- **Statement:** Extract rules, scoring, calculations, and state transitions into plain modules with no framework, DOM, or store imports, and unit-test them directly rather than through a rendered component.
- **Why:** Logic reachable only through a component can only be tested through a renderer, which is slower, flakier, and tests the framework as much as the rule. It also makes the logic unusable anywhere else — a background worker, a CLI, or a second product — because using it drags the whole UI stack along.
- **In practice:** The domain module takes values and returns values; the component reads it and renders. Edge cases are covered against the module directly, so component tests can stay focused on rendering and interaction.
- **Anti-patterns:** A scoring rule living inside a component body or a store subscription; testing arithmetic by mounting a view and reading text out of the DOM; domain modules importing framework primitives for convenience.

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

#### 4.1 Encode statically-detectable invariants as lint rules, not review guidance

- **Statement:** When a convention matters enough to be a principle and can be detected statically, ship it as a custom lint rule scoped to the paths it governs and run it at `--max-warnings 0` — don't rely on reviewers to remember it.
- **Why:** Review-only rules are enforced inconsistently and decay as the team and the codebase grow. A rule makes the invariant self-documenting, fails at the moment of authorship with an actionable message, and blocks regressions deterministically. Several principles here already _assume_ such a check exists; this makes writing one the default rather than the exception.
- **In practice:** Repo-local ESLint rules carry a message explaining the fix, are scoped by `files:` globs to the paths that must comply, and are set to `error` there. A green lint run then constitutes proof the invariant holds.
- **Anti-patterns:** A "please always…" note in a doc with no rule behind it; a rule authored then left at `warn` forever; blanket `eslint-disable` comments to dodge an invariant instead of changing the code or the rule.

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

### 8. Show a test can fail before trusting that it passes

- **Statement:** A green test is not evidence until it has been demonstrated capable of failing. Break the behavior it claims to guard, confirm it goes red, then restore the code.
- **Why:** The most dangerous test is one that asserts something already guaranteed by its own setup, or that never exercises the branch it names — it looks like coverage, is counted as coverage, and protects nothing. Silent failure modes are exactly where this matters: a guard against "the tool reports success while doing nothing" is itself a candidate for reporting success while doing nothing.
- **In practice:** Deleting the line under test is the cheapest mutation and usually enough. Assert the complement too — a test that a change is delivered should be paired with one that a local edit is still refused, or both are satisfied by code that stopped checking. Where the claim is that a state _persists_, run the operation twice and assert it again: "never self-heals" asserted only on the first pass is a claim, and asserted on the second is a property. Record which mutation kills which test in the PR body so a later reader can re-run it.
- **Assert the precondition, not just the outcome:** a test named for one code path often reaches it by the cheapest available setup, which is usually a different path. Assert that the system entered the state the test is named for — `adopted: 1` with `added + updated == 0` before exercising what happens to an adopted file — or the test passes without ever visiting the case it exists to cover.
- **A detected mutation evidences a gap in the subset that missed it, never in the suite that caught it.** Mutation testing measures whether a _suite_ detects a fault, so a mutation that survives one file and dies against the full run says something about that file's scope and nothing about the suite's. Run every mutation against the whole suite before quoting it, and where a new test is proposed for a fault the suite already detects, argue it from the uncovered scenario instead — a reviewer who reproduces "the suite is blind to this" and sees it go red discounts a test that deserved to land.
- **Some scenarios admit no mutation, and that is itself the finding.** Where two paths converge on a record that does not distinguish them — a lockfile entry that stores hashes but not how it was created — no edit to the shared code can break one path and spare the other, so the gap cannot be demonstrated by breaking anything. Provenance unobservable after the fact is a property of the design, and the scenario needs a test written from the scenario rather than evidence manufactured from a mutation. **Do not treat the unobservability as the defect and add a field to make the mutation possible.** Where nothing in the system's behaviour should depend on how a record came to exist, a `createdBy` marker would make the path mutable and the data model worse — the absence is the invariant, and the difficulty of testing it is the invariant reporting itself. Testability is a reason to write a different test, not a reason to weaken a design that earns its strength by forgetting.
- **Test a guard at the layer where it takes effect, not where it is computed.** A unit test cannot see a guard that is called but not obeyed: a library can return the right verdict, have thorough tests, and be wired into the caller as a warning that proceeds anyway — so the defect lives entirely in the gap between the two, where no test at the library boundary can reach it. The discriminator is a mutation that unwires the call: if it kills nothing, every existing test stops short of the decision. Exercise the real entry point, and include the read-only modes, because a plan a human reads as evidence and a run that writes fail the same way.
- **An ordering assertion must establish presence first.** `indexOf` returns `-1` for absent, and `-1` sorts before everything — so `indexOf(remedy) < indexOf(alternative)` passes when the remedy was deleted entirely, which is the regression the assertion exists to catch. Any comparison over positions, indices or timestamps needs the operands asserted present before their order is compared. This is the general case of a test satisfied by absence, and it is only ever found by deleting the thing the test is about.
- **Anti-patterns:** Deriving an expected value from the system under test; a timing-sensitive assertion with no wait, so it passes whether or not the code is correct; a fixture teardown that races an async body and makes the second half of the test run against nothing; counting a test as coverage because it names the behavior in its title; quoting a mutation result measured against one file as though it were measured against the suite; a suite that covers a guard's logic thoroughly and never asserts the caller honours it.

### 9. A test that asserts a fact about the world must read the world

- **Statement:** When a test claims that a recorded value matches external reality, its expected side must come from somewhere the recorded value cannot reach. Comparing a config file to a hand-written copy of that config file validates the registry against itself.
- **Why:** The two artifacts are then mutually confirming: the fixture matches because it was transcribed from the config, and the config is trusted because the fixture matches. Nothing in the loop has touched the referent, so the pair goes green in exactly the case it exists to catch — a value that was wrong when both were written. Failure is deferred to the moment someone changes one of them, which is drift, not error.
- **In practice:** Derive the expected value from the referent — the member repo's own workflow file, its lockfile, the directory the names are supposed to describe. Where the suite must run offline, pin a snapshot of the referent with the revision it came from, the date, the method used, and the trigger to re-check; that is a dated observation rather than a second assertion. Assert in the direction where being wrong is an error, and say in a comment why the other direction is allowed.
- **Pin a fact only when nothing can derive it:** where an invariant exists, assert the invariant instead. "This member does not call that workflow" is a fact that goes stale the day the member adopts it, and its staleness then propagates into whatever the test was protecting; "every workflow a member calls is listed" survives the member adopting a fifth. Reserve pinned facts for values with no derivable relationship — and give those the revision, date, method and re-check trigger that any pinned observation needs. Where a policy choice must be guarded at all, constrain _how the choice is recorded_ rather than what it is: requiring a justification whenever a setting departs from the default survives the choice changing, which is what makes it safe to keep. And when a test is deleted for being the wrong kind, record why in the test that replaces it, or the next author writes it again.
- **Derive every component, not just the one that broke:** an expected set is built from several inputs — names, locations, transforms — and fixing the one that was wrong while leaving the others hardcoded moves the defect rather than removing it. A probe against a path that cannot exist returns a clean result for every subject, so the check reports zero failures because it never ran. Enumerate each component from the same source the tool reads. Count the artifacts, not the declarations: one declared name can expand to several files, so a total summed from list lengths and a total counted from the tree are different numbers, and only one of them is what the tool will produce.
- **The ratchet:** A wrong value that acquires a passing test becomes defended. Correcting it now also deletes an assertion that looks deliberate and cites a verification, so the fix reads as the regression. Fixing the value is cheap on the day it lands and expensive the day after — which is the argument for validating recorded fields even when nothing executes them.
- **Anti-patterns:** `deepEqual` between a config and a literal transcribed from it; a rationale in the assertion message that is true about the repo but does not support the assertion; an inline comment certifying a verification with no revision or date, which outlives the check and discourages the next reader from repeating it.

### 10. A documented procedure has no failure mode — encode it as an assertion

- **Statement:** When documentation tells someone how to check something, add the test that fails if the instruction stops being correct. Prose describing a procedure cannot detect that the system moved out from under it.
- **Why:** Every other guard in a codebase reports when its premise breaks; a documented method silently becomes wrong and keeps being followed. The people most likely to follow it are the ones with the least context to notice, and they will attribute the bad result to the system rather than to the instruction.
- **In practice:** Identify the condition under which the documented method would stop being valid, and assert its negation against the real configuration — if the docs say "compare against the transformed output", assert that every write is the transformed output _and_ that it is never the raw source. The negative assertion is the load-bearing one: it fails at the moment the documented comparison would start giving wrong answers, which nothing else observes.
- **Report the invariant, not the measurement:** where two people check the same thing and get different numbers, prefer the form that does not depend on whose working tree it was measured in — an equality after normalization rather than a byte count. Sizes, offsets and hashes of raw bytes are artefacts of a checkout; identity under the tool's own comparison is not.
- **Anti-patterns:** A runbook step whose correctness depends on code nobody has linked it to; documenting a diff command without asserting what that diff is supposed to produce; treating "we wrote it down" as equivalent to "it is enforced".

## Aligned agent

`qa-tester` — this specialist should treat the principles above as binding practice
when working in this realm.

## Related realms

- **[Frontend](frontend.md)** — owns component behavior and visual snapshots this realm regresses.
- **[Design](design.md)** — defines the token and theme contract that token-regression tests protect.
- **[DevOps](devops.md)** / **[Process](process.md)** — run the typecheck/lint/build/test gates in CI and enforce them at merge.
- **[Accessibility](accessibility.md)** — contributes checks (contrast, reduced-motion) that ride the same suites.
- **[Performance](performance.md)** — shares e2e/critical-path coverage and guards against regressions in build output.
