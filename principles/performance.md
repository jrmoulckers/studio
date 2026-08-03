# Principles — Performance

> **Status:** Draft · **Owner:** _you_ · **Aligned agent:** `performance-engineer`
>
> This file is authored in a dedicated worktree session. Fill in the tree below.
> Keep each principle short, testable, and specific to this realm.

## Purpose

This realm governs the speed and cost of everything JRM Studio ships and produces:
the size of the shared packages product repos consume, the build/CI time of the
monorepo, and the runtime cost of the token/theming system. It exists to keep the
kernel cheap to build with and cheap to run, and to catch regressions with
reproducible measurement rather than opinion.

## Principles

<!--
Add principles as a tree. Each top-level principle may have sub-principles.
Copy the block below for each principle.
-->

### 1. Every performance claim is backed by a reproducible measurement

- **Statement:** Never optimize, accept, or reject a change on a hunch — measure it against a recorded baseline with a deterministic method.
- **Why:** Unmeasured "optimizations" waste effort, can regress correctness, and can't be defended in review. A baseline is the only way to prove a delta is real.
- **In practice:** Each budgeted metric has a documented command, environment, and baseline in `docs/performance/`. Report before/after numbers, not adjectives. Prefer `pnpm build --filter` and cache-cleared runs for build timings.
- **Anti-patterns:** "Feels faster." Comparing numbers from different machines or warm-vs-cold caches. Landing a perf fix with no delta recorded.

### 2. Performance budgets are explicit, versioned, and enforced

- **Statement:** Keep every performance threshold in `performance.budget.json`; a breach is a failing signal, not a discussion.
- **Why:** Budgets turn "fast enough" into a testable contract. Without a number, regressions accumulate silently until a product repo feels the pain.
- **In practice:** Budgets cover shared-package size, build/CI time, and token runtime cost. Changing a threshold is a reviewed edit to `performance.budget.json` with rationale, coordinated with `@devops-engineer` for CI enforcement.
- **Anti-patterns:** Thresholds living only in someone's head or a CI script. Silently raising a budget to make a red check green.

#### 2.1 Budgets have owners and review triggers

- **Statement:** Every budget names the metric, platform, method, and threshold, and is revisited when the consuming products or build pipeline change materially.
- **Why:** A budget with no method or owner can't be reproduced or defended, and drifts out of date.

#### 2.2 Budget the static artifact and the real-world experience separately

- **Statement:** Enforce two complementary budgets: a deterministic per-route bundle-size limit that blocks merges, and a Core Web Vitals budget measured against a running build.
- **Why:** They fail differently and catch different regressions. Bundle size is deterministic and attributable, so it can block a PR — but a small bundle can still deliver terrible LCP or CLS. Lab CWV numbers are noisy on shared CI runners, so gating merges on them trains everyone to ignore the check.
- **In practice:** Per-route byte budgets are versioned and blocking. CWV thresholds start advisory while a baseline is established, and are tightened to blocking once the measurement is stable enough to trust. Which of the two is authoritative is stated explicitly, so a warning is never mistaken for a gate.
- **Anti-patterns:** Only measuring total bundle size while per-route weight grows; treating a flaky lab CWV score as a hard gate; leaving thresholds advisory forever because nobody revisited them; raising a byte budget to clear a red check without recording why.

### 3. Shared packages ship the smallest surface a consumer needs

- **Statement:** Track and cap the published size of `@jrm/*` packages; every added dependency or export is justified against its size cost.
- **Why:** These packages are consumed by every product repo (Next.js, Svelte/Vite, React). Weight here multiplies across all downstream apps and their bundles.
- **In practice:** Measure package output size (tokens CSS/JS, tailwind preset) in CI. Keep tree-shakeable ESM exports so consumers pull only what they use. The CSS-vars layer stays lean — ~16 restated semantic colors per theme, not full palette duplication.
- **Anti-patterns:** Adding a heavy runtime dependency to a config/token package. Barrel exports that defeat tree-shaking. Duplicating full palettes per theme instead of restating semantic names.

### 4. Turbo cache is treated as load-bearing infrastructure

- **Statement:** Keep tasks correctly scoped, ordered, and cacheable so a warm build/CI run is near-instant; a cache miss is a bug worth investigating.
- **Why:** Build/CI speed is a first-class budget. The `tokens → tailwind-preset` graph only stays fast if `inputs`/`outputs` are declared precisely and tasks stay deterministic.
- **In practice:** Declare accurate `outputs` (e.g. `packages/tokens/build/`) and inputs in `turbo.json`. Prefer `pnpm build` (ordered) and rely on remote/local cache hits. Measure cold vs warm build time and track the hit rate as a budgeted signal.
- **Anti-patterns:** Non-deterministic build outputs (timestamps, unsorted keys) that poison the cache. Undeclared outputs that force rebuilds. Reaching for `--force` to "fix" a flaky task instead of finding the cache-busting input.

### 5. Runtime theming stays a no-rebuild, no-reflow-storm operation

- **Statement:** A theme/mode swap must remain a pure CSS-variable change — no rebuild, no re-import, no per-component JS recompute.
- **Why:** The whole value of the CSS-vars architecture is that flipping `data-theme` re-flows every component for free. Introducing JS-driven theming would trade an O(1) swap for O(components) cost in every consumer.
- **In practice:** Themes restate only the ~16 semantic vars; components reference semantic names. Verify a mode swap triggers style recalculation only, not script execution. Honor `prefers-reduced-motion` (motion collapses to `0ms`) so swaps never animate expensively.
- **Anti-patterns:** Reading tokens into JS to restyle on theme change. Inline per-element style writes on toggle. Theme blocks that redefine primitives instead of the semantic layer.

### 6. Foreground responsiveness has priority, and no work hangs the user silently

- **Statement:** A held interaction always keeps priority over background work, and every operation shows progress or failure — nothing may leave the user's experience hung on unknown state.
- **Why:** Perceived performance is responsiveness. A background task that stalls a foreground interaction, or a hang with no signal, is worse than slow-but-honest: the user can't tell working from broken and loses trust.
- **In practice:** Keep the interaction/main thread free — offload heavy or blocking work (token compilation, large computations) off the critical path so held gestures and renders stay responsive. Guard every async or long operation with a determinate or indeterminate progress signal and an explicit failure/timeout state. Budget interaction latency (e.g. INP) and time-to-feedback as first-class metrics.
- **Anti-patterns:** A background process holding a lock or the main thread while the user waits on an interaction. Spinners with no timeout that spin forever on failure. Silent catches that swallow errors so the UI just stops. Long synchronous work on the thread that owns a live gesture.

#### 6.1 Every wait is bounded and observable

- **Statement:** Give long-running or fallible operations a timeout, a surfaced outcome, and a way to tell progressing from stuck.
- **Why:** An unbounded, unobservable wait is indistinguishable from a hang and turns a transient slowdown into a dead-end for the user.

### 7. Profiling is systematic and uses the platform's native stack

- **Statement:** Profile with the right tool for the target — bundle/size analyzers for packages, Turbo run summaries for build time, browser DevTools/Lighthouse for runtime theming cost — and record the method.
- **Why:** Findings are only actionable and repeatable when the measurement method is native to the thing measured and written down for the next person.
- **In practice:** Use size reporting on `packages/*/build` outputs, `turbo run … --summarize` for task timings, and DevTools Performance/Layout traces to confirm theme swaps are recalc-only. Store profiling recipes in `docs/performance/`.
- **Anti-patterns:** Ad-hoc timing with `console.time` reported as authoritative. Profiling a synthetic case that doesn't match how product repos consume the packages.

### 8. Regressions are triaged with a deterministic bisect-and-route flow

- **Statement:** On a budget breach, reproduce it with a deterministic benchmark, bisect to the introducing change, quantify the delta, then route the fix to the owning realm.
- **Why:** Performance is cross-cutting; the Performance realm measures and diagnoses but does not own product or CI code. Fast, evidence-based routing gets fixes to the right owner without blame or guesswork.
- **In practice:** Capture a minimal repro, `git bisect` where possible, state the delta against the budget, and open/update an issue routed to `@web-engineer`, `@backend-engineer`, `@devops-engineer`, or the owning package agent.
- **Anti-patterns:** Editing another realm's code to "just fix it." Closing a regression without a repro. Filing a report with no quantified delta or baseline.

### 9. Performance never overrides correctness, accessibility, privacy, or security

- **Statement:** Reject any optimization that degrades accessibility, correctness, privacy, or security — speed is a constraint, not the objective function.
- **Why:** A faster product that is wrong, inaccessible, or unsafe is a net loss. These properties are non-negotiable and several are legally or ethically binding.
- **In practice:** When an optimization touches the reduced-motion path, semantic color contrast, or data flow, confirm the relevant realm's principles still hold before recommending it.
- **Anti-patterns:** Dropping `prefers-reduced-motion` handling for a smaller CSS bundle. Skipping a11y-critical tokens to shave size. Trading a security check for latency.

## Aligned agent

`performance-engineer` — this specialist should treat the principles above as binding practice
when working in this realm.

## Related realms

- [DevOps](devops.md) (`devops-engineer`) — owns `.github/workflows/`; co-owns budget enforcement in CI and cache configuration.
- [Frontend](frontend.md) (`web-engineer`) — receives routed fixes for runtime/bundle cost in consuming apps.
- [Backend](backend.md) (`backend-engineer`) — owns service/query performance fixes routed from regression triage.
- [Architecture](architecture.md) (`architect`) — the token/theming architecture whose runtime cost this realm budgets.
- [Accessibility](accessibility.md) (`accessibility-reviewer`) — the reduced-motion and contrast guarantees no optimization may break.
- [Testing](testing.md) (`qa-tester`) — home of the reproducible benchmarks that back budget checks.
