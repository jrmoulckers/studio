# Principles — AI Process

> **Status:** Draft · **Owner:** _you_ · **Aligned agent:** `ai-ops-engineer`
>
> This file is authored in a dedicated worktree session. Fill in the tree below.
> Keep each principle short, testable, and specific to this realm.

## Purpose

This realm governs **AI used in how we build** — the coding agents, skills, instructions,
and prompt configuration that drive our development workflow — plus the meta-practice in
[`AGENTS.md`](AGENTS.md) that aligns specialist agents to realms. It exists so that the AI
layer is consistent, reproducible, least-privilege, and reviewable, rather than a pile of
ad-hoc prompts. It does **not** cover user-facing AI features (see [AI Products](ai-products.md)).

## Principles

<!--
Add principles as a tree. Each top-level principle may have sub-principles.
Copy the block below for each principle.
-->

### 1. One canonical source for AI configuration

- **Statement:** Author every agent, skill, instruction, and prompt once in the
  `jrmoulckers/.github` backbone; product repos consume synced copies and never hand-edit them.
- **Why:** Divergent copies drift, and a fix in one repo silently misses the others. A single
  source keeps behavior identical across `jrm-recipes`, `score-king`, `finance`, and future repos.
- **In practice:** AI-layer files live under `agents/`, `skills/`, `instructions/`, `prompts/`,
  and `evals/` in the backbone. Synced files carry a "generated — do not edit" header; changes
  go to the backbone and re-sync. A product repo may pin _additional_ tooling only in its own
  `AGENTS.md`.
- **Anti-patterns:** Editing a synced agent in a product repo; copy-pasting a prompt between
  repos; two files defining the same agent.

#### 1.1 Consistent frontmatter schema

- **Statement:** Every agent definition carries the full frontmatter schema — `name`,
  `description`, `model`, `when_to_use`, `primary_paths`, `write_scope`, `risk_level`, `tools` —
  with values drawn only from the allowed set for each field.
- **Why:** A uniform schema lets the roster, dispatch, and permission tooling read every agent
  the same way; missing or free-form fields break automation and hide risk.
- **In practice:** Validate frontmatter in a pre-push check; `model` is `strong-reasoning` or
  `standard`, `write_scope` is `read-only`/`scoped-write`/`full`, `risk_level` is `low`/`medium`/`high`.
- **Anti-patterns:** An agent with no `write_scope`; a `risk_level: critical` that isn't in the
  schema; `tools` described in prose instead of the `read`/`edit`/`search`/`shell` grants.

### 2. Least-privilege tools and write scope

- **Statement:** Grant each agent the smallest tool set and narrowest `write_scope` that lets it
  complete its documented workflow — add `edit` only when it authors files, `shell` only when
  validation requires it.
- **Why:** Every extra capability widens blast radius. An agent that only reviews should not be
  able to write; one that never runs commands should not hold `shell`.
- **In practice:** Map each tool grant to a concrete workflow step in the agent definition.
  `write_scope` and `primary_paths` together bound what the agent can change.
- **Anti-patterns:** Granting `full` write "to be safe"; `shell` on a read-only reviewer;
  broadening permissions without a documented rationale in the PR.

### 3. Non-overlapping ownership boundaries

- **Statement:** Every path has exactly one lead agent; ownership globs must not collide, and each
  agent's "do NOT edit" zones name the owning agent.
- **Why:** Overlapping ownership produces conflicting edits and unclear accountability. One lead
  per path keeps changes coherent and reviewable.
- **In practice:** `primary_paths` across agents are disjoint; the realm→agent map in
  [`AGENTS.md`](AGENTS.md) and each realm file's "Aligned agent" stay in sync. Cross-cutting work
  hands off rather than reaching into another agent's zone.
- **Anti-patterns:** Two agents claiming `.github/workflows/`; an AI-ops agent editing product
  code or CI; a realm with no aligned agent.

### 4. Capability manifest is the source of truth for the roster

- **Statement:** Keep a single capability manifest / roster that lists every agent and skill, and
  reconcile it with the actual definition files on every change.
- **Why:** If the manifest and the files disagree, dispatch and discovery break — an agent exists
  but nothing routes to it, or the roster advertises a capability that no longer exists.
- **In practice:** The manifest, the realm→agent map, and the `agents/` files agree on names and
  responsibilities. A CI check fails when an agent file has no roster entry or vice versa.
- **Anti-patterns:** Adding an agent file without a manifest entry; a roster row pointing at a
  deleted skill; manually maintained lists that silently fall out of date.

### 5. Prompt engineering is explicit, structured, and testable

- **Statement:** Write internal prompts and instructions as explicit, structured contracts —
  stated role, scope, inputs, outputs, and boundaries — not open-ended prose.
- **Why:** Vague prompts yield non-deterministic, unverifiable behavior. Structure makes intent
  legible to humans and stable across model updates.
- **In practice:** Instructions state the imperative rule, its rationale, and its boundaries;
  prompts declare expected inputs/outputs; shared depth lives in reusable skills
  (e.g. `prompt-engineering`) rather than being restated per agent.
- **Anti-patterns:** A wall-of-text system prompt with no structure; duplicated instructions
  across agents; prompts that assume undocumented context.

### 6. Every internal agent has evals and a quality gate

- **Statement:** No agent or skill ships or changes behavior without golden tasks, a scoring
  rubric, and a regression check that must pass before merge.
- **Why:** Prompt and config changes silently regress. Evals turn "seems fine" into a measurable,
  repeatable gate and catch drift when models or dependencies change.
- **In practice:** `evals/` holds golden tasks per agent; the rubric scores ownership clarity,
  tool least-privilege, instruction precision, boundary completeness, and schema consistency.
  Regression checks run in CI and block merges that broaden permissions without a documented reason.
- **Anti-patterns:** Editing an agent's prompt with no eval run; a rubric that's never scored;
  merging on a red eval "to fix later".

### 7. Human-in-the-loop review of agent output

- **Statement:** Agent-authored changes land through a reviewed PR, and high-risk or gated
  operations stop for explicit human approval before proceeding.
- **Why:** Agents are fast and confident but not accountable. A human gate is the last check
  against wrong, unsafe, or out-of-scope changes.
- **In practice:** Agents open PRs (they do not push to `main`/release); gated operations —
  force-push to protected branches, merging PRs the agent didn't author, remote platform writes,
  secrets, destructive ops — halt and request approval. Self-merge is allowed only for an agent's
  own PR once the quality gate is green and mergeable.
- **Anti-patterns:** Direct pushes to `main`; an agent merging another agent's PR unprompted;
  bypassing review because "it's just a prompt tweak".

### 8. Reproducible, versioned prompts and configs

- **Statement:** Treat every prompt, agent, and config as versioned source — no runtime-only or
  console-edited configuration — and pin what a given output was produced from.
- **Why:** Reproducibility is what lets us diff behavior, bisect regressions, and roll back.
  Untracked config makes failures impossible to explain or revert.
- **In practice:** All AI-layer changes go through git with conventional commits
  (`docs(agents): …`); prompts avoid embedded absolute paths or environment specifics; evals and
  outputs reference the config version/commit they ran against.
- **Anti-patterns:** Tweaking a prompt in a hosted console instead of the repo; unpinned model or
  tool versions; prompts that only work on one machine's paths.

### 9. Strict secrets and data boundaries for agent context

- **Statement:** Never place secrets, credentials, or sensitive data into prompts, instructions,
  skills, eval fixtures, or committed agent context; give agents only the least data their task needs.
- **Why:** Context is logged, synced across repos, and sent to model providers. A secret in a
  prompt is a secret leaked to third parties and to every downstream repo.
- **In practice:** Reference secrets by name via the platform's secret store, never by value;
  eval fixtures use synthetic data; agent `primary_paths` and tools are scoped so context can't
  pull in unrelated sensitive files. Secret-handling and destructive ops are human-gated.
- **Anti-patterns:** An API key pasted into a system prompt; real customer data in a golden task;
  an agent granted read over the whole repo just to reach one config file.

### 10. Explicit, staged agent workflows

- **Statement:** Every agent declares an ordered workflow — Plan → Implement → Verify → Ship →
  Monitor — and follows it; no step is skipped and Verify runs the repo's real checks.
- **Why:** A named workflow makes agent behavior predictable and reviewable, and forces
  verification before shipping instead of after a regression lands.
- **In practice:** The agent definition spells out each stage: Plan lists affected files and
  scope/tool changes; Verify runs `pnpm build`/`typecheck`/`lint` and any eval validation; Ship
  opens a conventional-commit PR that closes the issue; Monitor watches CI and fixes on red.
- **Anti-patterns:** Implementing before planning scope; shipping without running the repo's
  pre-push checks; declaring "done" while CI is red.

### 11. Skills are composable and single-responsibility

- **Statement:** Factor reusable expertise into skills with one clear responsibility, loaded on
  demand; agents reference skills instead of duplicating their content.
- **Why:** Shared depth in a skill (e.g. `prompt-engineering`, `mcp-agent-tooling`,
  `issue-management`) stays consistent and is fixed once. Inlining it per agent guarantees drift.
- **In practice:** A skill does one thing and names when to load it; agents cite the skills they
  depend on rather than restating them; a product repo can pin extra skills in its `AGENTS.md`.
- **Anti-patterns:** A "kitchen-sink" skill covering unrelated topics; the same guidance copied
  into three agents; a skill no agent references.

### 12. Deterministic agent dispatch

- **Statement:** Route each task to exactly one lead agent using its `when_to_use` and
  `primary_paths`; dispatch criteria must be specific enough that two agents don't both match.
- **Why:** Ambiguous dispatch sends work to the wrong specialist or splits it across agents,
  producing conflicting edits. One clear owner per task keeps accountability intact.
- **In practice:** `when_to_use` states concrete triggers; realm→agent alignment in
  [`AGENTS.md`](AGENTS.md) resolves cross-cutting work to the owning realm; overlaps are resolved
  by tightening criteria, not by letting both run.
- **Anti-patterns:** Two agents with overlapping `when_to_use`; a vague trigger like "any code
  change"; dispatching to an agent whose `primary_paths` don't cover the work.

### 13. Isolated sessions with a single owning agent

- **Statement:** Do each unit of work in an isolated session/worktree bound to one agent and one
  branch; never edit the main checkout or reach outside the session's repo root.
- **Why:** Isolation prevents cross-contamination between parallel workstreams and keeps every
  change traceable to one branch, one agent, and one review.
- **In practice:** One session = one worktree = one feature branch = one owning agent; the agent
  commits to its own branch and opens a PR; file operations stay within the repo root.
- **Anti-patterns:** Two agents writing the same worktree; editing the main checkout directly;
  a session that touches files outside its repository root.

### 14. Vetted, pinned, least-privilege MCP servers

- **Statement:** Connect agents only to reviewed MCP servers, pinned to a known version, granting
  the narrowest tool and scope surface the workflow needs.
- **Why:** An MCP server is remote code with access to repo and platform context; an unpinned or
  over-scoped server is an unaudited supply-chain and data-exfiltration risk.
- **In practice:** Each MCP integration is documented (server, version, purpose) alongside the
  agents that use it; tool grants map to workflow steps; prefer the `gh` CLI for GitHub operations
  where it suffices over adding an MCP surface. Data sent to any server obeys Principle 9.
- **Anti-patterns:** Wiring an agent to an unreviewed MCP server "to try it"; a floating/unpinned
  server version; granting broad MCP tools an agent never invokes.

### 15. A curated repository AI brain

- **Statement:** Maintain a durable, version-controlled "AI brain" — the repository's shared
  knowledge base of decisions, conventions, and context — and have agents read it before acting
  and append to it after learning something reusable.
- **Why:** Without persistent memory, every session rediscovers the same context and repeats past
  mistakes. A curated brain turns one agent's finding into every agent's baseline and keeps
  behavior coherent across sessions and repos.
- **In practice:** Brain entries live in the backbone as tracked files, are cited when they drive
  a decision, and are pruned when stale; agents propose a brain entry instead of hardcoding an
  unwritten rule (mirroring the "propose, don't improvise" shared practice). Entries stay factual,
  scoped, and dated.
- **Anti-patterns:** Knowledge trapped in a single session's history; contradictory brain entries
  left unreconciled; an ever-growing brain no one prunes; secrets or sensitive data written into it.

### 16. Every artifact type has a mandatory template

- **Statement:** Provide and enforce a documentation template for **every** artifact type —
  document, skill, agent, MCP integration, instruction, prompt, brain entry, eval, and log — and
  author each artifact from its template.
- **Why:** Uniform structure makes artifacts scannable, diffable, and machine-readable; it is what
  lets tooling validate frontmatter, reconcile the roster, and score evals. Freeform artifacts
  break automation and hide missing fields.
- **In practice:** Templates live beside the artifacts they govern (like this realm's
  [`_template.md`](_template.md)); each defines the required sections/frontmatter for its type; a
  pre-push check fails artifacts that don't match their template. New artifact types ship with a
  template before they ship instances.
- **Anti-patterns:** A skill with no standard sections; an agent authored freehand instead of from
  the schema; a log or brain entry with an ad-hoc shape; adding an artifact type with no template.

### 17. Cross-session reports carry verified facts, and corrections supersede explicitly

- **Statement:** A report another session will act on states each fact at the durability it
  actually has. Immutable observations — a CI run, a hash, a diff — may be quoted as observed, but
  mutable state (merge status, branch head, registry contents) is re-read at report time. A
  correction names the report it replaces. A claim about runtime behavior is settled by executing
  it, not by reading the code — and a claim about what a value _causes_ is a behavioral claim, not
  a factual one, however freshly the value itself was checked.
- **Why:** A stale fact in a report travels further than a stale fact in a file, because the
  recipient cannot distinguish "was true when observed" from "is true now" and will relay it
  onward as fresh. Two analyses that read the same code the same way produce correlated errors, so
  their agreement is not corroboration — it is one conclusion counted twice. A verified fact with
  an unverified consequence bolted onto it passes every freshness check while carrying the error,
  and the relay point amplifies whatever it carries, so the verification burden is heaviest there
  rather than at the origin.
- **In practice:** Say "PR #N open, CI green, not merged" rather than anything that reads as
  landed, and re-read merge state from the API before asserting it. A superseding report opens by
  naming what it kills, because the original stays live in the recipient's context beside it.
  Behavioral claims — what a force-push does, whether a run is idempotent — are reproduced against
  throwaway fixtures before they are escalated, severity-rated, or documented. What a field or
  function is named is a claim about intent; only its call graph is a claim about behavior, so
  trace consumers before asserting a consequence. Relaying another session's claim makes it yours:
  verify the part you relay. A reproduction is only as good as its inputs, so pin and state what it
  ran against — the commit, the config, the fixture — because a sound method on stale inputs yields
  a confident wrong answer. For any claim about runtime behavior the escalation gate is "has anyone
  run it", never "how many agree". The trigger for that gate is not implausibility but leverage:
  if a claim would change what someone else does, trace it or execute it, because the readings
  that go unchecked are the reasonable-sounding ones. Where two sessions disagree, resolve it
  against an artifact — a fixture, a call graph, a `git show` — since an argument with nothing
  executable underneath is won by the more articulate reading rather than the correct one. Before
  restating an earlier finding, re-read what was actually merged: committed text gets diffed and
  corrected, while a report is written once and travels unchallenged, so the repo is often right
  where the summary of it is stale. Ask what a check is structurally unable to see — a verifier
  that enumerates what is present establishes fidelity, never completeness — and remember that
  ruling out one cause does not establish another. When a set looks curated, weigh the null
  hypothesis first: an incomplete set is the ordinary outcome of an interrupted process, so
  promoting it to a decision needs evidence of a decider, not a story that fits.
- **Anti-patterns:** Reporting a green CI run as a landed change; sending a correction as an
  increment that reads as additive; treating agreement between two code reads as verification;
  inferring a consequence from what an identifier sounds like it does rather than from what reads
  it; assigning a severity derived purely from reading; propagating a downstream session's claim
  without re-checking it; documenting inferred behavior that nobody has executed; reporting a
  rehearsal result without saying which revision and configuration it was rehearsed against;
  reviewing your own output by re-reading it, when the defect is invisible precisely because you
  wrote it; mistaking elaboration for verification — severity ratings, impact analyses and ranked
  fix options stacked on an unchecked premise, so that confidence scales with how much has been
  written rather than how much has been checked; deriving a test's expected value from the system
  under test, which confirms only that the derivation ran; narrating a gap into a decision because
  the omissions form a pattern, when nobody has been found who made it.

## Aligned agent

`ai-ops-engineer` — this specialist should treat the principles above as binding practice
when working in this realm.

## Related realms

- **[AI Products](ai-products.md)** — the sibling AI realm. That realm governs _user-facing_ AI
  features; this realm governs _AI in how we build_. Model-quality, prompt, and safety practices
  are shared in spirit, but ownership does not overlap: internal tooling here, shipped AI product
  surfaces there.
- **[Security](security.md)** — secrets/data boundaries for agent context (Principle 9) inherit
  the Security realm's rules; hand off any product-facing exposure there.
- **[DevOps](devops.md)** — owns `.github/workflows/`. This realm defines agent behavior and
  quality gates; DevOps owns the CI that runs them. Keep the ownership line at the workflow files.
- **[Process](process.md)** — PR, review, and release conventions that the human-in-the-loop gate
  (Principle 7) and versioning (Principle 8) build on.
- **[Documentation](documentation.md)** — human-facing docs outside the AI layer are owned by
  `docs-writer`; this realm owns only the agent/skill/instruction/prompt configs.
