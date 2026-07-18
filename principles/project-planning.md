# Principles — Project Planning

> **Status:** Draft · **Owner:** _you_ · **Aligned agent:** `product-manager`
>
> This file is authored in a dedicated worktree session. Fill in the tree below.
> Keep each principle short, testable, and specific to this realm.

## Purpose

This realm governs how work is planned and sequenced across the JRM Studio kernel: how the
roadmap is set, sprints are decomposed, issues are triaged, the backlog is groomed, scope is
held, and work is coordinated across the product apps that consume `@jrm` packages. It exists
so that a small, shared kernel can ship predictable changes without breaking its downstream
consumers.

## Principles

### 1. Plan the roadmap around the kernel's contract, not features

- **Statement:** Sequence roadmap work by its impact on the published contract (token names,
  config presets, build outputs) — contract-affecting changes lead, additive work follows.
- **Why:** Every product app (`jrm-recipes`, `score-king`, `finance`) depends on that contract.
  Reordering it late forces downstream rework and breaks the "one source of truth" promise.
- **In practice:** Each roadmap item names the packages it touches and whether it changes,
  extends, or preserves the contract; breaking changes get a migration note before they're
  scheduled.
- **Anti-patterns:** A roadmap organized only by app feature; scheduling a token rename with no
  downstream migration plan; "we'll see who breaks" as a rollout strategy.

#### 1.1 Milestones map to consumable releases

- **Statement:** Define milestones as coherent, consumable states of the kernel, not calendar
  buckets.
- **Why:** Consumers upgrade at milestone boundaries; a milestone that leaves the contract
  half-changed can't be adopted.

### 2. Decompose sprints into independently shippable, ordered slices

- **Statement:** Break each sprint into issues small enough to finish and verify within it, and
  order them so dependencies land before dependents.
- **Why:** The kernel builds in order (`tokens → tailwind-preset`); planning that ignores that
  order stalls the whole chain and hides risk until integration.
- **In practice:** Dependency edges are explicit on the board; a token change is scheduled and
  merged before the preset work that consumes it; each issue is verifiable with `pnpm build` /
  `pnpm typecheck` on its own.
- **Anti-patterns:** A single "redo theming" mega-issue; two issues that can only merge together;
  sprint items whose "done" can't be checked until a later sprint.

### 3. Triage every issue with a priority and an owner

- **Statement:** No issue leaves triage without a P0–P3 priority, a single accountable owner
  agent, a clear scope, and testable acceptance criteria.
- **Why:** Unprioritized, unowned issues stall silently and get re-litigated; explicit priority
  makes interrupt-vs-defer decisions repeatable.
- **In practice:** P0 = kernel-down / broken published build → interrupt the sprint; P1 = core
  flow or parity regression → current sprint; P2 = new capability or DX improvement → upcoming;
  P3 = cosmetic / small tech debt → backlog. Owner is the aligned realm agent.
- **Anti-patterns:** "Priority: normal"; issues assigned to a team rather than a role; acceptance
  criteria like "make it better"; treating every incoming bug as P0.

#### 3.1 Route by realm, don't hoard

- **Statement:** Assign each issue to its realm's aligned agent and hand off cross-cutting work
  to every realm it touches.
- **Why:** Planning owns sequencing, not implementation; mis-routed work bottlenecks on the
  wrong specialist.

### 4. Groom the backlog on a regular cadence

- **Statement:** Review the backlog every sprint to close duplicates, merge overlaps, refresh or
  retire stale items, and keep only work that is still real.
- **Why:** A backlog nobody prunes becomes noise, hiding the few items that matter and inflating
  planning cost.
- **In practice:** A recurring grooming pass links duplicates, marks items stale after a set
  period of inactivity, and re-validates that top-of-backlog issues still have a live rationale.
- **Anti-patterns:** A backlog that only grows; five open issues describing the same token bug;
  year-old "someday" items competing with this sprint's work.

### 5. Hold scope with an explicit definition of done

- **Statement:** Fix scope and acceptance criteria before work starts; changes to scope go
  through a visible change, never silent growth.
- **Why:** The kernel's value is predictability. Scope creep in a shared package multiplies
  across every consumer and blows sprint commitments.
- **In practice:** Each issue carries a short definition of done and an explicit non-goals list;
  new requirements become new issues rather than expanding an in-flight one.
- **Anti-patterns:** "While we're in here…" additions; a PR that quietly grows past its issue;
  acceptance criteria written after the work is done to match it.

### 6. Coordinate cross-team work through explicit dependencies and parity

- **Statement:** Make cross-realm and cross-app dependencies visible before scheduling, and track
  parity gaps between the consuming apps as first-class items.
- **Why:** A kernel change ripples to Next.js, Svelte, and Gradle consumers at once; undocumented
  dependencies and silent parity drift surface as integration failures late.
- **In practice:** Dependency chains (architecture → backend → UI → QA → docs → release) are
  mapped on the plan; known parity gaps across apps are documented, not assumed away; handoffs
  name the receiving agent and the artifact they need.
- **Anti-patterns:** Discovering a blocking dependency at merge time; "it works in score-king"
  standing in for cross-app validation; coordination that lives only in one person's head.

### 7. Gate releases on an explicit go/no-go

- **Statement:** Ship only after a checked go/no-go: P0/P1 resolved or accepted, required reviews
  done, docs/release notes drafted, and parity or known gaps documented.
- **Why:** A shared kernel with no release gate exports its defects to every consumer
  simultaneously; the gate is the last cheap place to catch that.
- **In practice:** The go/no-go checklist is filled per release; unresolved P0/P1s block or are
  explicitly accepted by a human; security and accessibility sign-offs are attached when the
  change warrants them.
- **Anti-patterns:** Merging with open P0s "to unblock"; release notes written after the fact;
  skipping the checklist because the change "felt small".

## Aligned agent

`product-manager` — this specialist should treat the principles above as binding practice
when working in this realm.

## Related realms

- [Architecture](architecture.md) — contract and dependency decisions this realm sequences.
- [Process](process.md) — release cadence and the go/no-go handoff (Principle 7).
- [Business](business.md) — priorities and value that feed roadmap ordering (Principle 1).
- [Testing](testing.md) — acceptance criteria and verifiable "done" (Principles 3, 5).
- [Documentation](documentation.md) — release notes and migration docs at handoff.
