# Principles — Business

> **Status:** Draft · **Owner:** _you_ · **Aligned agent:** `business-analyst`
>
> This file is authored in a dedicated worktree session. Fill in the tree below.
> Keep each principle short, testable, and specific to this realm.

## Purpose

This realm governs how JRM Studio makes money without breaking user trust: pricing and
packaging, revenue and unit-economics modeling, competitive benchmarking, and the rules by
which business decisions are allowed to constrain product and engineering. It exists so that
monetization is deliberate, evidenced, and reversible — never an ad-hoc afterthought bolted
onto a shipped feature.

## Principles

### 1. Charge for realized value, not for effort

- **Statement:** Price against the value a user receives, not the cost or difficulty of
  building the feature.
- **Why:** Cost-plus pricing caps revenue on high-value features and overprices low-value
  ones; both leak margin and erode trust. Value-based pricing tracks willingness to pay.
- **In practice:** Each priced feature has a one-line value hypothesis (who benefits, by how
  much) recorded in `docs/business/pricing/`. Kernel packages (`@jrm/*`) are internal
  infrastructure and are never monetized directly — only the product apps (recipes,
  score-king, finance) carry pricing.
- **Anti-patterns:** "This was hard to build, so it's premium." Pricing set by copying a
  competitor's number with no value rationale. Gating a shared kernel capability behind a
  paywall.

#### 1.1 Gate on value tiers, not on crippling

- **Statement:** Free tiers must be genuinely useful; paid tiers add value rather than
  removing artificial pain.
- **Why:** Crippled free tiers depress conversion and generate churn and bad sentiment.
- **In practice:** Every feature-gate proposal states what the free user still accomplishes
  end-to-end. Score-king's core scorekeeping stays free; monetize convenience/scale, not the
  ability to finish a game.
- **Anti-patterns:** Blocking save/export on the free tier. Ads that break the core loop.

### 2. Model revenue with ranges and named assumptions

- **Statement:** Every revenue projection carries explicit assumptions and a low/base/high
  sensitivity band.
- **Why:** Point estimates masquerade as certainty and drive overcommitment. Ranges expose
  which assumption actually moves the outcome.
- **In practice:** Models in `docs/business/revenue/` list each input (conversion, ARPU,
  churn, CAC) with its source or "synthetic — placeholder." A one-way sensitivity table
  identifies the top two drivers. Projections are labeled directional, not commitments.
- **Anti-patterns:** A single MRR number with no assumption sheet. Hard-coded 5% conversion
  with no basis. Presenting a model as a forecast the team must hit.

#### 2.1 Use standard, consistently-defined metrics

- **Statement:** MRR, ARR, LTV, CAC, churn, ARPU, and conversion use the definitions in this
  realm's template, and each metric names its measurement period.
- **Why:** Redefining metrics between docs makes comparisons meaningless.
- **In practice:** Reuse the Revenue Model Template; churn always states its period; LTV is
  modeled as a range, never a lone figure.
- **Anti-patterns:** "Churn is 3%" with no period. LTV computed from a single retention guess.

### 3. Ship only unit economics that can pay back

- **Statement:** A monetized feature or channel advances only when its contribution margin is
  positive and its payback period is defensible.
- **Why:** Negative contribution margin means every new user loses money; growth accelerates
  the loss.
- **In practice:** Follow the Unit Economics Framework — revenue/user → variable cost/user →
  contribution margin → payback → LTV/CAC. Flag any proposal with LTV/CAC below ~3 or payback
  beyond the agreed horizon as at-risk, with the risk written down.
- **Anti-patterns:** Justifying a feature on top-line revenue while ignoring per-user cost.
  Scaling a channel whose CAC exceeds LTV "to gain market share."

### 4. Benchmark competitors on evidence, not vibes

- **Statement:** Competitive claims cite an observable source (public pricing page, changelog,
  captured screenshot) and a capture date.
- **Why:** Pricing built on stale or imagined competitor behavior misprices the product and
  ages badly.
- **In practice:** Each competitor entry in `docs/business/pricing/` tracks tiers, feature
  set, platform coverage, trust posture, sentiment, and last-verified date. Unverifiable
  market-size claims are omitted or explicitly marked as assumptions.
- **Anti-patterns:** "Everyone charges $9.99." Undated competitor tables. Asserting TAM with
  no citation.

### 5. Business decisions constrain via specs, not code

- **Statement:** Monetization shapes the product through documented constraints and issues for
  engineering agents — the business realm never edits product implementation code.
- **Why:** Separation keeps pricing logic auditable and prevents revenue pressure from silently
  reshaping product behavior. It also respects file ownership across realms.
- **In practice:** A gating or pricing decision becomes a spec in `docs/business/` plus an
  issue handed to the owning feature/platform agent. The business-analyst edits only
  `docs/business/pricing/` and `docs/business/revenue/`.
- **Anti-patterns:** Hand-editing app code to insert a paywall. Encoding prices in product
  code with no spec. Overriding `docs/architecture/` or roadmap docs owned by other agents.

### 6. User value and trust outrank revenue

- **Statement:** No feature ships on revenue impact alone; a monetization change that harms
  user value or trust is rejected regardless of upside.
- **Why:** Trust is the durable asset. Dark patterns win a quarter and lose the franchise.
- **In practice:** Every monetization proposal includes a trust check: pricing is transparent,
  cancellation is as easy as signup, and no synthetic urgency or hidden fees. Contentious
  pricing decisions are human-gated, not auto-approved.
- **Anti-patterns:** Roach-motel cancellation flows. Surprise renewals. Confusing tier names
  engineered to upsell. "The model says raise the price" with no trust review.

## Aligned agent

`business-analyst` — this specialist should treat the principles above as binding practice
when working in this realm.

## Related realms

- **Project Planning** ([project-planning.md](project-planning.md)) — receives pricing/gating
  specs as roadmap items; owns sprint and roadmap docs the business realm must not edit.
- **Featuring** ([featuring.md](featuring.md)) — runs the conversion/pricing experiments that
  validate the revenue-model assumptions in principle 2.
- **Data & Analytics** ([data-analytics.md](data-analytics.md)) — supplies the metric
  definitions and instrumentation behind MRR, churn, and conversion; owns product-analytics docs.
- **Compliance** ([compliance.md](compliance.md)) — governs billing, consumer-protection, and
  subscription-cancellation obligations that constrain monetization (principle 6).
- **Architecture** ([architecture.md](architecture.md)) — owns `docs/architecture/`; business
  hands off constraints as specs rather than editing architecture directly.
