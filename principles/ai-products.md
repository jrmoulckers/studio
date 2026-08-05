# Principles — AI Products

> **Status:** Draft · **Owner:** _you_ · **Aligned agent:** `ai-ops-engineer`
>
> This file is authored in a dedicated worktree session. Fill in the tree below.
> Keep each principle short, testable, and specific to this realm.

## Purpose

This realm governs **user-facing AI features shipped inside JRM Studio products** — anything
where a model's output reaches an end user (generation, ranking, assistants, summaries,
recommendations). It exists to keep those features reliable, safe, honest, affordable, and
respectful of user data. It is _not_ about AI used to build the studio (see
[ai-process.md](ai-process.md)).

## Principles

> Scope note: a "shipped feature" is any model-backed capability in a product app that a real
> user can trigger. Each principle below should be checkable in review or CI, not just admired.

### 1. Choose the smallest model that passes the eval, and always have a fallback

- **Statement:** Select the cheapest/fastest model that meets the feature's quality bar, and
  define an explicit fallback path for when it is slow, unavailable, or refuses.
- **Why:** Over-provisioning burns cost and latency; a single hard dependency turns any
  provider incident into a product outage.
- **In practice:** Record the chosen model, the eval score that justified it, and the fallback
  chain in the feature's config. Fallbacks degrade gracefully (smaller model → cached/rule-based
  result → clear "unavailable" state), never a raw error or infinite spinner.
- **Anti-patterns:** Defaulting to the largest model "to be safe"; hard-coding one provider with
  no timeout or fallback; silently failing when the model errors.

#### 1.1 Pin and version model choices

- **Statement:** Pin a specific model version per feature and treat a version bump as a change
  that must re-pass the feature's eval.
- **Why:** Providers silently update aliases; behavior drifts and regressions ship unnoticed.

### 2. Design prompts and AI UX for the end user, not the model

- **Statement:** Treat the prompt, the input affordances, and the output presentation as one
  designed surface: set user expectations, make AI output easy to steer, correct, and undo.
- **Why:** Users judge the feature, not the model. Confusing inputs and unrecoverable outputs
  erode trust faster than occasional low quality.
- **In practice:** Keep system prompts in versioned source (not scattered string literals);
  show loading/streaming states; let users edit, regenerate, or reject output; keep a human path
  when AI can't help. Copy uses the studio design tokens and localized strings.
- **Anti-patterns:** Prompt text pasted inline across the codebase; dead-end outputs with no
  retry or edit; blocking the UI on a slow model call with no feedback.

### 3. Guardrail every model input and output

- **Statement:** Validate and constrain what goes into and comes out of a model before it
  reaches other systems or the user.
- **Why:** Untrusted user text can drive prompt injection, and raw model output can carry unsafe,
  off-brand, or malformed content into the product.
- **In practice:** Constrain output shape (schema/structured output) and reject non-conforming
  responses; filter for disallowed content on user-visible paths; never let model output execute
  code, run tools, or issue privileged actions without an allow-list and confirmation. Treat
  model output as untrusted input to the next step.
- **Anti-patterns:** Rendering raw model HTML/markdown without sanitizing; letting the model call
  arbitrary tools or APIs unchecked; trusting the model to "just follow" a safety instruction.

### 4. Ship product AI behind evals, not vibes

- **Statement:** Every shipped AI feature has an eval set with a documented quality bar, and
  changes to prompt, model, or parameters must re-pass it before merge.
- **Why:** Prompt/model tweaks that look better in one demo routinely regress other cases;
  without evals there's no way to know.
- **In practice:** Keep a golden set of representative inputs with expected properties (not just
  exact strings) in the repo; run it in CI on any change to the feature's AI config; track score
  over time and block merges that drop below the bar. Include known failure and adversarial cases.
- **Anti-patterns:** "Looks good to me" as the only gate; tuning a prompt against a single
  example; no regression set, so quality silently drifts.

### 5. Hold production AI to explicit cost and latency budgets

- **Statement:** Give each feature a per-request (and aggregate) cost and latency budget, measure
  against it in production, and alert when it's breached.
- **Why:** Token cost and tail latency are the two ways AI features quietly become unshippable at
  scale; unmeasured, they're only discovered on the bill or in churn.
- **In practice:** Instrument token usage, cost, and end-to-end latency per feature; set p95
  latency and per-request cost ceilings; use streaming, caching, and prompt trimming to stay
  under them; surface the numbers on a dashboard. A feature that can't meet its budget doesn't
  ship until it can.
- **Anti-patterns:** No token/cost/latency telemetry; unbounded context growth per request;
  discovering cost blow-ups from the monthly invoice.

### 6. Be honest that it's AI, and about its limits

- **Statement:** Clearly disclose when content is AI-generated or AI-assisted, and communicate the
  feature's known limits and confidence where it matters.
- **Why:** Undisclosed AI erodes trust and can breach platform, legal, and compliance expectations;
  overstated confidence leads users to act on wrong output.
- **In practice:** Label AI output in the UI; distinguish AI suggestions from user-authored
  content; avoid implying certainty the model doesn't have; make it easy to report bad output.
  Coordinate wording with Compliance and Documentation.
- **Anti-patterns:** Passing AI output off as authoritative or human-authored; hiding that a
  feature is AI-driven; presenting a guess as a fact.

### 7. Protect user inputs sent to models

- **Statement:** Treat everything a user sends to a model as sensitive: minimize it, get the
  right basis to send it, and control retention and training use.
- **Why:** User prompts routinely contain personal or confidential data; sending it to a third
  party without care is a privacy and compliance breach.
- **In practice:** Send only the data the feature needs; redact/omit secrets and unnecessary PII
  before the call; use providers/config with no-training and appropriate retention terms; disclose
  in the privacy notice what is sent where; honor deletion and consent. Log prompts/outputs only
  with the same protections as the underlying data.
- **Anti-patterns:** Forwarding entire user records "just in case"; using a provider that trains
  on inputs for private user data; logging raw prompts containing PII to general logs.

### 8. Keep AI optional and swappable — degrade, don't block

- **Statement:** If an AI feature is out of scope or over budget, don't block the product: defer
  to an on-device model where available, ship a non-AI substitute in the meantime, and keep the
  integration provider-agnostic so real AI can be dropped in later.
- **Why:** Tying a shippable capability to one hosted model — that may be too costly, slow, or
  immature today — stalls the whole feature. A swappable design lets the product ship now and
  upgrade the intelligence later without a rewrite.
- **In practice:** Put the AI call behind a capability interface with interchangeable backends;
  prefer an on-device/local model when one is available and meets the bar; otherwise back the
  feature with a cheaper substitute (semantic/embeddings search, or a keyword/rule-based
  response system) that satisfies the same contract; gate the model-backed path behind config so
  it can be enabled per product/environment when it's in scope and in budget.
- **Anti-patterns:** Hard-wiring one hosted provider throughout the feature; shipping nothing
  because the "real" model isn't ready or affordable; a substitute that returns a different shape,
  forcing a rewrite to adopt AI later.

## Aligned agent

`ai-ops-engineer` — this specialist should treat the principles above as binding practice
when working in this realm.

## Related realms

- **[AI Process](ai-process.md)** — the sibling realm for AI used to _build_ the studio (agents,
  prompts, and tooling in the dev workflow). This realm stops at user-facing product features;
  hand off internal-tooling questions there.
- **[Security](security.md)** — prompt injection, output handling, and tool-execution guardrails
  (Principle 3) share its threat model.
- **[Privacy & Compliance](compliance.md)** — user-input handling and disclosure (Principles 6–7)
  must satisfy compliance requirements.
- **[Performance](performance.md)** — latency budgets (Principle 5) align with its production
  targets.
- **[Testing](testing.md)** — AI evals (Principle 4) run alongside the standard test suite in CI.
- **[Design](design.md)** & **[Accessibility](accessibility.md)** — AI UX (Principle 2) uses the
  shared token system and must meet accessibility standards.
