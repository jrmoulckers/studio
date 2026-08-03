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
  their agreement is not corroboration — it is one conclusion counted twice. Reports also decay
  faster than the artifacts they describe, because a repository is diffed on every change while a
  message is only ever quoted: put every conclusion somewhere reviewable, and treat the message as
  a pointer to it rather than the record. A verified fact with
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
  executable underneath is won by the more articulate reading rather than the correct one. When
  the open question is intent rather than behavior, the artifact that settles it is a person or a
  session, so ask the author: one message is cheaper than encoding a guess permanently, and no
  amount of evidence about a file reaches the reasoning that produced it. Re-reading mutable state
  is necessary and not sufficient — quote it with its revision (`at <sha>`) rather than in the
  present tense, because a read is not a lock and the value can move while you are still asserting
  it. Report a check as a snapshot, not a state: "clean as of `<sha>`, N sessions active" rather
  than "closed and clean", because durable-sounding language turns a momentary observation into a
  standing guarantee the observer has no power to make. Re-read at send time rather than think time,
  because composing a long message is itself an interval during which the state moves — but freshness
  of the read does not survive a pinned reference: re-resolving a moving branch and re-fetching a
  recorded revision are different acts, and only the first tells you anything new. A read taken
  "just now" against a commit named an hour ago is exactly as stale as the commit. The payoff for
  the notation is that it makes disagreement cheap to settle: when both parties state the revision
  they read, a contradiction resolves in one lookup instead of another round of crossing claims, so
  pinning earns its keep precisely on the occasions it turns out to have been wrong. It also earns
  it on occasions nothing depended on it: re-resolving a reference produces a forward diff over
  every changed path, not just the ones the check was aimed at, so the discipline surfaces defects
  in artifacts nobody was watching. That is an argument for pinning references believed to be
  inert — the value is the diff, not the assertion. Pin **both sides** of a comparison: a
  fidelity result is only meaningful as "clean as of `<subject sha>` against `<reference sha>`",
  because pinning the subject alone leaves the reference floating and the claim decays in silence —
  strictly worse than the subject moving, since there a fetch shows you, whereas here the artifact
  you verified is untouched and the verdict has still expired. Suspect this first when the reference
  is itself under active development, and hardest when your own work is what moved it: a shared
  baseline that has been stable for weeks can take several commits in the span of one exercise,
  making every earlier result in that exercise stale by the exercise's own progress. Onboarding is
  the sharpest case: registering a new participant is itself an edit to the shared baseline, so an
  audit run to authorise the rollout races the very change it exists to authorise. Disclosing a
  method's blind spot and stating a result at its real durability are two separate disciplines, and
  volunteering the first does not supply the second — "here is what this cannot see" still leaves
  the reader to guess how long what it _did_ see remains true. Prefer the
  tool's own output to a reimplementation of it whenever the tool can be run: a projection built by
  re-deriving what a generator would do is a model of the generator, and it inherits every
  assumption the generator's actual inputs have since invalidated. A wrong baseline usually fails
  totally rather than subtly — every artifact differs, not a few — so a plausible-looking pass rate
  is itself evidence the baseline is right, and a near-total failure should be read as a broken
  comparison before a broken subject. The exception is where the generator has more than one mode:
  applying one baseline uniformly leaves exactly the handful of differently-generated artifacts
  looking like drift, which is the most dangerous size of false positive, because a total failure
  gets diagnosed and a single one gets believed. Never write a test that pins a policy choice: assert schema and internal consistency, since a
  test converts a contested inference into a guarded invariant and forces the next person to argue
  with a red suite instead of a config value. The distinction is not how many tests to write but
  what they pin: behaviour the system must always exhibit is precisely what a suite is for, while a
  value that could legitimately have been decided the other way is not. The discriminator is whether
  changing it would be a bug or a decision — and where the worry is that someone might choose badly,
  assert that they recorded a reason rather than asserting which choice they made. Before
  restating an earlier finding, re-read what was actually merged: committed text gets diffed and
  corrected, while a report is written once and travels unchallenged, so the repo is often right
  where the summary of it is stale. Ask what a check is structurally unable to see — a verifier
  that enumerates what is present establishes fidelity, never completeness — and remember that
  ruling out one cause does not establish another — and a ruling-out argument is only as good as
  the list of causes considered, so enumerate the third state before concluding the second. A
  hypothesis space assembled without noticing that assembling it was a choice is the hardest defect
  to see, because everything downstream of it stays rigorous: the elimination is valid, the evidence
  is sound, and the conclusion is wrong. Coherence rather than sloppiness is what carries a bad
  claim between people, so the question that catches it is not "is this argument tight" but "what
  is missing from the list this argument is tight about." Shared
  method is only a weakness when what you share is a peer model: agreeing with the authority itself
  — running the generator's own function rather than a second reimplementation of it — is the point
  rather than a correlation to be discounted, and two independent reimplementations agreeing is the
  weaker evidence, not the stronger. When a
  set looks curated, weigh the null
  hypothesis first: an incomplete set is the ordinary outcome of an interrupted process, so
  promoting it to a decision needs evidence of a decider, not a story that fits. A hand-authored
  first pass is deliberate in mechanism and unreviewed in substance at the same time, so "someone
  typed this on purpose" is not evidence that anyone weighed it: it shares the trace of a considered
  decision and the epistemic status of an accident, which is exactly why the commit history cannot
  separate the two. Look inside the artifact for
  self-contradiction, which distinguishes oversight from judgment far better than its provenance
  does. And qualify the rule that intent questions need an author: an author reconstructing from
  memory produces a plausible account at the same cost as a true one, and only the plausible one can
  be wrong without anyone noticing — so ask the author, and ask whether they still have the receipt.
  An answer sourced to a surviving artifact and an answer sourced to recollection deserve different
  weight even when they come from the same person and agree. Receiving is half
  the discipline: a correction that arrives while you are mid-decision reads as commentary on the
  decision rather than as a change of premise, so when a message contradicts a fact you are
  standing on, stop and re-derive rather than reconcile. In a channel carrying several sessions,
  provenance decays faster than content: an argument is retained accurately while the identity of
  whoever made it is lost, so attributing a position to whoever last relayed it is the default
  outcome rather than a lapse — quote the claim, not the claimant, and let the author correct the
  record. Build the cheap artifact _before_ taking
  a position — once one is argued for, the fixture has to overcome the investment as well as the
  question, which is why everyone reaches for it late.
- **Anti-patterns:** Reporting a green CI run as a landed change; sending a correction as an
  increment that reads as additive; treating agreement between two code reads as verification;
  inferring a consequence from what an identifier sounds like it does rather than from what reads
  it; assigning a severity derived purely from reading; propagating a downstream session's claim
  without re-checking it; documenting inferred behavior that nobody has executed; reporting a
  rehearsal result without saying which revision and configuration it was rehearsed against;
  reviewing your own output by re-reading it, when the defect is invisible precisely because you
  wrote it; checking a claim against the primary artifact instead of the report of it, when the
  claim was itself derived from that artifact — switching medium is not switching source, and
  "I verified against the repo, not the summary" is worthless where the summary was an enumeration
  of the repo; mistaking elaboration for verification — severity ratings, impact analyses and ranked
  fix options stacked on an unchecked premise, so that confidence scales with how much has been
  written rather than how much has been checked; deriving a test's expected value from the system
  under test, which confirms only that the derivation ran; narrating a gap into a decision because
  the omissions form a pattern, when nobody has been found who made it; reading a correction as
  an objection to be answered rather than a premise to re-derive from; attributing a claim to
  whoever relayed it and arguing with them instead of its author; asserting the current contents of
  mutable state in the present tense on the strength of a read taken minutes earlier; a test that
  encodes which option was chosen, and a second test that agrees with it because both were derived
  from the same wrong value; naming a subject's revision while leaving the reference it was compared
  against unnamed; concluding from a tool's disagreement with reality that the tool is broken,
  without checking whether the reference moved between the two runs; correcting a number that came
  out of the real tool with one derived from your own reimplementation of it, when the tool was
  runnable the whole time.

### 18. Route a decision to whoever has standing to judge it, not whoever owns the file

- **Statement:** Central configuration that governs a repository is a change to that repository in
  every sense except which file it lives in. Notify the governed party and give them a channel to
  object before it lands. Where a decision turns on intent, the party who formed the intent decides;
  everyone else supplies evidence.
- **Why:** File ownership and epistemic standing come apart. The reviewers of a registry can verify
  that an entry is internally consistent and still have no way to know it is wrong, because the fact
  that settles it lives in the governed repo or in one contributor's memory. The governed party
  usually holds both, and is the only reader with an incentive to look.
- **In practice:** Raise the objection in the place the decision is recorded, not through the party
  who relayed it — a relay is what loses intent, and adding a hop repeats the failure. Verify the
  state yourself before filing, since the thing may already have moved. Split the objection: concede
  the parts that are defensible, so it reads as a correction rather than a wholesale revert. Prefer
  evidence checkable inside the artifact — an entry that contradicts itself is refutable by any
  reader — over testimony about what someone meant, which only its author can give.
- **The watching gap:** Everyone monitors the artifacts a system produces; nobody monitors the
  config that decides what it will produce, because that config is not one of them. Put the
  governing file on the same diff watch as its outputs. A decision that changes no output today
  still changes every output after it.
- **Anti-patterns:** Landing a policy change about a repo without telling that repo; a config change
  reviewed only for internal consistency; pinning a contested choice in the test suite, which
  converts a line of JSON into a red build and makes it far harder to unwind than the original
  proposal would have been; routing an objection through an intermediary because they are the one
  you were already talking to.

### 19. Verify congenial inputs first

- **Statement:** Unchecked inputs are not distributed evenly. A premise that supports a conclusion
  you already hold is the one least likely to be checked, so spend the verification budget there
  rather than on the premises you were going to argue with anyway.
- **Why:** Scepticism is spent where it is cheap. A claim you disagree with gets traced to source
  because tracing it is the argument; a claim that fits gets absorbed and then repeated, and each
  repetition adds a speaker without adding a check. Errors of this kind are not caught by review,
  because everyone agreeing is the condition that created them.
- **In practice:** Before endorsing a characterisation of a system, look at the part of it your
  conclusion depends on — not the part you have already read. Repeating someone else's summary in
  your own words converts their unverified claim into your asserted one. When two parties disagree
  about an artifact, go to the artifact rather than weighing their credibility, and check whether
  each was looking at the same revision before concluding either is wrong.
- **Anti-patterns:** Agreeing with a conclusion and inheriting its premises; treating a source's
  past reliability as coverage for its current claim; describing a repository from the subtree you
  happened to have open; issuing a correction from a checkout old enough to be missing the files
  that would refute it — a correction derived from a stale read is still a stale read, and carries
  more weight because it arrives as a fix.

### 20. Your tools are inputs, and a local checkout is a cache that looks like an authority

- **Statement:** Apply the freshness discipline you apply to the thing you are verifying to the
  thing you are verifying _with_. A working copy on disk is a snapshot of a moment you did not
  choose; it is not the repository.
- **Why:** The asymmetry is invisible from inside. Fetching the subject at a named revision while
  reading the reference from a checkout of unknown age feels rigorous, because the half you are
  thinking about is rigorous. Nothing about a local file announces its age — it is a git repo, it
  answers instantly, and the source it reports is indistinguishable from the live one until the
  moment it isn't. A live fetch is a few seconds slower and correct.
- **In practice:** State the revision of every source a conclusion rests on, including the one you
  read the code from. Prefer fetching at a ref to reading a checkout when the answer will be
  reported to someone else. If a checkout must be used, print its HEAD alongside the finding so a
  reader can judge it. Treat ambient tooling — a clone made for a different task, a cached
  dependency, a vendored copy — as an input with a version, not as the environment.
- **`origin/main` is the sharpest case:** a remote-tracking ref is a local cache wearing the
  remote's name. `git log origin/main` answers from disk and never contacts the server, so it
  reports a confident, correctly-named, arbitrarily old answer — and the operation _feels_ like
  consulting the remote in a way that reading a working file does not. Where a fetch-and-read is
  expressed as two commands, expect the first to be dropped. Prefer a single call that cannot
  succeed without network I/O, and confirm existence rather than absence: asking whether a known
  commit resolves distinguishes "not there" from "not fetched", where a log listing cannot.
- **The blind spot to expect:** a staleness diagnosis you make about someone else will not
  generalise to yourself if their stale artifact was created for the task and yours predates it.
  The ones that predate the task are never reviewed, because they were never decided on.
- **The reference is usually compound:** where a comparison's expected set is _selected_ by one
  artifact and _supplied_ by another, both are references and both move. Pinning the content source
  while re-resolving the selector — or the reverse — produces a check that is stale in a dimension
  its own filter cannot see: a diff restricted to content paths reports "nothing changed" while the
  set of things that should exist has changed underneath it. Enumerate every artifact the expected
  set depends on and pin each.
- **Anti-patterns:** Citing file and line from a working copy last pulled weeks ago; mixing a
  pinned remote read and an unpinned local read in one argument; concluding the findings were fine
  after discovering the source was stale, without noting that the surviving conclusions were the
  ones whose files happened not to move.

### 21. Check what the check establishes

- **Statement:** Before treating a verification as settling a question, state the proposition it
  actually tests and compare it to the one in dispute. A check that passes against a neighbouring
  proposition is worse than no check, because it licenses the conclusion instead of leaving it
  open.
- **Why:** Verification produces confidence in proportion to effort, not to fit. Enumerating a
  list name-by-name against a repository tree is real work, and it establishes that the names
  exist — which is not the claim when the dispute is whether anyone chose them. The result is a
  belief held with the weight of evidence and the content of an assumption, and the effort spent is
  what makes it hard to revisit.
- **In practice:** Write the question down before checking, in the form a result could contradict.
  Ask what a _failing_ result would have looked like: if no realistic failure exists, the check was
  a restatement. Where the question is about intent, no reading of the artifact at any fidelity
  answers it — find the author or find the artifact the decision left behind.
- **Watch for permissive values:** a wildcard, a default or an empty override is consistent with
  every state of the world, so consistency checks pass over it silently. Such values need a
  different kind of scrutiny than a wrong specific value does — the test suite cannot supply it.
- **An aggregate is blind to the errors that preserve it:** a total, a count or a checksum that
  stays constant under the exact class of mistake it is trusted to detect is worse than no check,
  because it converts an open question into a closed one. A sum over categories cannot see an item
  move between categories. Before quoting a reconciliation as reassurance, name a defect it would
  have caught.
- **An impossible output is a gift:** a result that cannot be true — a negative count, a total
  exceeding the population — announces its own defect and costs nothing to catch. A plausible wrong
  result announces nothing. Prefer probes whose failure mode is absurd to probes whose failure mode
  is a slightly different number, and treat any output you had to reason about before believing as
  the more dangerous of the two.
- **Deliberate in mechanism is not deliberate in substance:** that a value was typed by hand, or
  produced by a step someone ran on purpose, establishes only that nothing was truncated. It says
  nothing about what the value was reasoned from, or whether that premise survived the change it
  shipped in. Arguments that a decision "was made" and arguments that it "was right" answer
  different questions, and conflating them lets a correct rebuttal defend a wrong conclusion.
- **Prefer a self-contradiction to an inference about intent:** where a record includes something
  that refutes its own stated rationale — an omission sitting beside its own counter-example, a
  description denying what the same commit added — that is evidence any reader can check, and it
  outranks any amount of reasoning about what someone must have meant.
- **Anti-patterns:** Reporting the method rather than the proposition — "verified against the repo
  tree, name by name" — where the method's target is not in dispute; citing thoroughness as
  though it substituted for relevance; a self-refuting record written and read in the same sitting,
  because by then the rationale is doing the reading instead of the artifact; testing a probe's
  result for emptiness rather than for its value, so an error message counts as a positive answer —
  many tools print failure bodies to stdout, and every row then reports present.

### 22. Attention is finite and drains toward the last lesson

- **Statement:** After adopting a practice to close a failure you just made, assume the ordinary
  checks are now weaker, not unchanged. Re-check the parts of a claim that were never in dispute at
  the same interval as the part that was, and where a protocol has several components, make each
  one's freshness a separate step rather than trusting the protocol as a unit.
- **Why:** A newly-learned failure mode is vivid and crowds out the mundane one, so the cost of
  learning is paid partly out of attention that was already doing useful work elsewhere. Adopting a
  two-sided check to stop a reference floating does nothing to keep the subject from moving, but it
  _feels_ like rigour, and the feeling is indexed to the recent lesson rather than to coverage.
  This is why corrections cluster: the session most recently burned by staleness is the one about
  to state something stale about a different half of the same comparison.
- **Prefer executing to reasoning whenever an execution path exists at all.** Long disputes between
  careful parties are usually about a value that some tool would have printed — and the tool is
  routinely believed to need credentials, a network, or a deployment it does not need. Establish
  what the cheapest real run costs before opening the argument; a dry-run or local-checkout mode
  that needs neither token nor network turns every projection in the thread into an observation.
- **Attribute a claim to its origin, not to the message you read it in.** Relayed numbers acquire
  the relayer's name in one hop, which sends corrections to the wrong party, and lets a
  reconstruction of someone's arithmetic be quoted back as their sentence. Where a report passes a
  figure through, name whose it was.
- **When a fix does not take, verify the fix was applied before concluding it does not work.** A
  remedy that appears to fail is more often an unapplied remedy than a wrong one, and the surprise
  is the signal to check the plumbing rather than the theory.
- **Anti-patterns:** Re-verifying the reference five times while the subject moves twice unattended;
  treating a two-sided protocol as self-updating on both sides because it was adopted deliberately;
  arguing a projection for hours in a repository whose engine has an offline mode.

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
