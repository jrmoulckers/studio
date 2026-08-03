# Principles — Design

> **Status:** Draft · **Owner:** _you_ · **Aligned agent:** `design-engineer`
>
> This file is authored in a dedicated worktree session. Fill in the tree below.
> Keep each principle short, testable, and specific to this realm.

## Purpose

The Design realm governs the shared visual language and user experience of JRM Studio — the
`@jrm/tokens` source of truth and the presets built on it — so every product app
(`jrm-recipes`, `score-king`, `finance`, …) inherits one consistent, accessible,
framework-agnostic system, ships an interface that is easy to use, and grows without
fragmenting. Per-product identity is a palette swap, never a fork.

## Principles

### 1. Tokens are the single source of truth

- **Statement:** Every design decision — color, type, spacing, radius, elevation, motion —
  lives as a DTCG token in `@jrm/tokens` and is consumed only through generated outputs.
- **Why:** One authored source keeps every app and every output (CSS vars, Tailwind preset,
  typed JS) in lockstep. Values that live in app code drift and can't be themed or audited.
- **In practice:** Author under `packages/tokens/tokens/`, build with Style Dictionary
  (`pnpm build`), and consume via `@jrm/tokens/css`, `@jrm/tailwind-preset`, or the typed
  `tokens` object. `build/` is generated, never hand-edited.
- **Anti-patterns:** Hex codes, px, or ms literals in app CSS/TSX; editing files under
  `build/`; a component defining a value that should be a token.

#### 1.1 Respect the three-tier reference chain

- **Statement:** Values flow primitive → semantic → component; each tier only references the
  tier above it, never skips or inverts.
- **Why:** The chain is what makes a theme a palette swap: components bind to semantic roles,
  so restating ~16 semantic colors re-flows the whole system with no rebuild.
- **In practice:** `component/*.json` references `{semantic.*}`; semantic references
  `{color.*}` primitives. A button never points at a raw `royal-violet.500`.
- **Anti-patterns:** A component token referencing a primitive directly; a semantic token
  hardcoding a literal; sideways references within a tier.

### 2. Theme by semantic palette, keep the system fixed

- **Statement:** A product theme swaps only the semantic color palette; token names, scales,
  component bindings, and build outputs stay identical.
- **Why:** The contract between kernel and apps is the semantic name. Preserving it is what
  lets a new brand reuse every primitive scale and component spec unchanged.
- **In practice:** Add a theme by copying `tokens/themes/default/`, restyling the four color
  files, and registering a Style Dictionary instance — nothing else changes.
- **Anti-patterns:** Renaming semantic tokens per product; adding component tokens that only
  one theme defines; branching typography or spacing scales to fit a brand.

### 3. Ship framework-agnostic outputs

- **Statement:** The system's primary interface is plain CSS custom properties that work in
  Next.js, Svelte, and React with no framework glue; typed tokens serve only what CSS can't.
- **Why:** Studio spans multiple frameworks. A CSS-vars core keeps one system portable;
  framework-specific abstractions would fracture it.
- **In practice:** Components read `var(--color-surface)`, `var(--radius-md)`, etc. Reach for
  the typed `tokens` object only for canvas, charts, or inline computed styles.
- **Anti-patterns:** A React-only theming layer as the source of truth; duplicating token
  values in a framework wrapper; requiring JS to apply base theming.

### 4. Runtime mode swaps, no rebuild

- **Statement:** Light, dark, and high-contrast modes switch at runtime via `data-theme` on
  the root element; each mode restates only its semantic colors.
- **Why:** Users toggle modes live. Rebuild-per-mode or class-forking every component makes
  modes expensive and inconsistent.
- **In practice:** `:root` holds light + all vars; `[data-theme="dark"]` and
  `[data-theme="high-contrast"]` override the ~16 semantic colors only. Set the mode by
  toggling `document.documentElement.dataset.theme`.
- **Anti-patterns:** Separate stylesheets per mode; restating component vars inside a theme
  block; conditionally rendering styles in JS to fake a mode.

### 5. Meet WCAG AA in every mode

- **Statement:** Semantic color pairings meet 4.5:1 for text and 3:1 for large text and UI
  in light, dark, and high-contrast; information is never carried by color alone.
- **Why:** Accessibility is a floor, not a theme. A palette that passes in light but fails in
  dark ships a broken mode.
- **In practice:** Derive AA-safe ink roles when a fill fails on a surface (e.g.
  `accent.ink` darkens Crown Gold text while fills keep the brand gold); pair status colors
  with an icon or label, never hue alone.
- **Anti-patterns:** Approving a color that fails AA in any mode; gold-on-white body text;
  status shown only by red/green.

### 6. Pair motion with a reduced-motion path

- **Statement:** Every motion token has a reduced-motion alternative, and
  `prefers-reduced-motion` collapses non-essential motion to `0ms`.
- **Why:** Motion can harm vestibular-sensitive users. Motion without an opt-out is an
  accessibility defect, not a polish item.
- **In practice:** Reference `var(--motion-*)` tokens for duration/easing; rely on the
  emitted `prefers-reduced-motion` block that zeroes durations automatically — don't bypass
  it with hardcoded timings.
- **Anti-patterns:** Inline `transition: … 300ms` that ignores the reduced-motion block;
  essential meaning conveyed only through animation.

### 7. Component tokens define a spec, not a one-off

- **Statement:** A component token exists only when it captures a reusable, semantic role
  shared across apps; every token earns its place.
- **Why:** The component tier is a contract every product inherits. One-off tokens bloat the
  system and leak app-specific decisions into the kernel.
- **In practice:** `component/button.json`, `card.json`, `input.json`, etc. bind semantic
  roles and states (hover/pressed/disabled) that any app renders the same way.
- **Anti-patterns:** A token that only one app uses; encoding page-specific layout as a
  component token; adding a token with no clear semantic purpose.

### 8. Support the cognitive-accessibility contract

- **Statement:** Cognitive-load accommodations (roomier type, spacing, focus, flatter
  elevation) are opt-in semantic tokens activated by a root data attribute, not a separate
  design.
- **Why:** Cognitive needs are a first-class mode of the one system. Forking a "simple"
  design would drift from the canonical one and rot.
- **In practice:** `semantic/cognitive.json` steps up small type roles, relaxes leading,
  widens spacing, and simplifies elevation; consumers activate it with
  `[data-a11y-cognitive="true"]` on the root.
- **Anti-patterns:** A hand-built alternate layout for accessibility; cognitive values
  hardcoded in an app; shipping motion/contrast without the cognitive path considered.

> **Known gap:** the statement above is currently aspirational for spacing, focus, and
> elevation. `semantic/cognitive.json` defines those values and they are emitted as
> `--cognitive-*` custom properties, but the generated `[data-a11y-cognitive="true"]` block
> only remaps **type and motion** — because the default output exposes no semantic
> `--focus-*` / `--elevation-*` / border / touch-target roles to remap onto. Until that role
> layer exists, enabling the mode changes text size and motion only, which is precisely the
> anti-pattern [Accessibility](accessibility.md) principle 7 warns about. Closing it is a
> Design-realm change and will alter `packages/tokens/dist/`.

### 9. Optimize for ease of use first

- **Statement:** When usability and novelty conflict, choose the option that lets a user
  reach their goal with the least effort, memory, and ambiguity.
- **Why:** The system serves users, not the design. Clever interfaces that raise cognitive
  load fail the people using every Studio app.
- **In practice:** Prefer familiar, conventional patterns; make the common path the default;
  keep interaction targets, states, and copy predictable across apps by binding them to
  shared component tokens and specs.
- **Anti-patterns:** Novel controls that need explaining; hidden gestures as the only path to
  a core action; per-app reinventions of a solved interaction.

#### 9.1 Keep system status visible

- **Statement:** The interface always communicates current state — loading, focus, selection,
  success, and error — through visible, tokenized feedback.
- **Why:** Users trust and navigate a system they can read. Invisible state forces guessing
  and erodes confidence.
- **In practice:** Every interactive component defines and renders its states
  (hover/pressed/focus/disabled/error) from `component/*.json`; focus rings, status colors,
  and motion give immediate, consistent feedback in all modes.
- **Anti-patterns:** Actions with no feedback; focus styles removed for looks; error state
  shown by color alone or not at all.

#### 9.2 One primary action per view, and one meaning per accent

- **Statement:** Give each screen a single visually dominant action, and let the accent color
  carry exactly one meaning within a product — scarcity is what makes emphasis legible.
- **Why:** Emphasis is relative, not absolute. Three primary buttons are three ordinary
  buttons, and an accent reused for "selected", "live", and "warning" stops communicating any
  of them. Users then have to read every control instead of scanning.
- **In practice:** Secondary and tertiary actions step down to quieter component-token variants
  rather than competing. What the accent means is decided once per product and written down;
  anything else needing attention uses hierarchy, spacing, or type weight.
- **Anti-patterns:** A toolbar of equally weighted primary buttons; the accent applied for
  decoration; a destructive action styled identically to the safe default.

#### 9.3 Numbers that change in place use tabular figures

- **Statement:** Render any number that updates, or that stacks in a column for comparison —
  scores, money, timers, counts — with tabular (fixed-width) numerals.
- **Why:** In proportional type a `1` is narrower than an `8`, so a live-updating value visibly
  jitters and columns of figures fail to align on the decimal. Both make numbers harder to
  compare and read, and the jitter reads as instability.
- **In practice:** Apply `font-variant-numeric: tabular-nums` through the shared type roles and
  numeric component tokens, so products inherit it instead of each remembering the rule.
- **Anti-patterns:** A running total or countdown that shifts width as it changes; a
  right-aligned money column whose digits don't line up; applying it ad hoc per component.

### 10. Consolidate before adding

- **Statement:** Before introducing a new component, variant, or token, exhaust composing or
  extending what already exists; a new primitive must justify why nothing existing fits.
- **Why:** Feature and component bloat is the slow death of a design system — more surface to
  learn, maintain, theme, and keep consistent. Consolidation keeps the kernel small and sharp.
- **In practice:** Extend a component spec with a state or slot rather than forking a
  near-duplicate; retire redundant variants; fold one-off app patterns back into shared
  specs when they recur.
- **Anti-patterns:** A second button that is 90% the first; parallel components that do the
  same job; tokens or variants added "just in case" with no active consumer.

### 11. Standardize shared components

- **Statement:** Every reusable component has one canonical spec in the kernel — its
  structure, states, token bindings, and accessibility contract — that all apps consume
  unchanged.
- **Why:** Standardization is what makes cross-app consistency real. Divergent copies of the
  "same" component produce a system in name only.
- **In practice:** Component behavior and appearance derive from `component/*.json` and the
  semantic tier; apps compose these, they don't restyle them. Variation happens through
  documented props/slots, not private overrides.
- **Anti-patterns:** An app maintaining its own card or input styling; copy-pasted component
  code that drifts; undocumented forks of a shared spec.

### 12. Future-proof the contract

- **Statement:** Evolve the system additively and behind stable semantic names; breaking
  changes to token names or component contracts are deliberate, versioned, and migrated.
- **Why:** Every product depends on these names. Silent breakage cascades across the monorepo;
  a stable contract lets the kernel improve without stranding consumers.
- **In practice:** Add new semantic roles rather than repurposing existing ones; keep
  back-compat aliases when restructuring (as `background.raised` preserves the legacy
  `--color-surface-3`); note deprecations and provide a migration path.
- **Anti-patterns:** Reusing a semantic name for a new meaning; deleting a token consumers
  still reference; renaming component tokens without an alias or migration.

### 13. Track current design best practice

- **Statement:** Ground decisions in established, current UX and design-system practice, and
  revisit the system as standards and platform conventions move.
- **Why:** Best practice encodes hard-won usability and accessibility lessons. A system frozen
  at its founding assumptions ages into friction.
- **In practice:** Follow platform-native conventions per target; align with recognized
  heuristics and current WCAG guidance; periodically review scales, patterns, and tokens
  against the state of the art and prune what no longer holds.
- **Anti-patterns:** Cargo-culting a trend with no usability rationale; ignoring updated
  accessibility standards; keeping a deprecated pattern because "it's always been that way."

## Aligned agent

`design-engineer` — this specialist should treat the principles above as binding practice
when working in this realm.

## Related realms

- **[Accessibility](accessibility.md)** — shares the WCAG AA, reduced-motion, and cognitive
  contracts; Design encodes them as tokens, Accessibility verifies them.
- **[Frontend](frontend.md)** — consumes the CSS vars, Tailwind preset, and typed tokens;
  the primary handoff for design-to-code.
- **[Localization](localization.md)** — type scales and spacing must absorb translated string
  lengths and script metrics.
- **[Architecture](architecture.md)** — owns the monorepo build/pipeline that turns token
  sources into published outputs.
- **[Documentation](documentation.md)** — the token reference and theming guides that let
  apps adopt the system correctly.
- **[Project Planning](project-planning.md)** — scope and feature decisions drive
  consolidation vs. proliferation; Design pushes back on bloat here.
- **[Featuring](featuring.md)** — experiments must reuse standardized components and honor the
  token contract rather than spawn one-off UI.
