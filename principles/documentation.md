# Principles — Documentation

> **Status:** Draft · **Owner:** _you_ · **Aligned agent:** `docs-writer`
>
> This file is authored in a dedicated worktree session. Fill in the tree below.
> Keep each principle short, testable, and specific to this realm.

## Purpose

This realm governs the documentation that ships with JRM Studio — per-package READMEs, API
references, examples, and diagrams — so that both human developers and AI agents can consume
`@jrm` packages correctly without reading the source. Docs are part of the product contract:
when the tokens, presets, or configs change, the docs change in the same PR.

## Principles

### 1. Every package documents its own contract

- **Statement:** Every publishable package under `packages/` ships a `README.md` that states
  its role, public entry points, and a copy-pasteable consumption example.
- **Why:** Consumers (`jrm-recipes`, `score-king`, `finance`, future repos) import `@jrm/*`
  packages in isolation. A package without its own README forces readers back into source or
  the root README, and the root README cannot scale to every package's detail.
- **In practice:** Each package README opens with a one-line role (matching the root README's
  "What's inside" table), lists its exports/subpaths (e.g. `@jrm/tokens/css`,
  `@jrm/tokens/tailwind`, `@jrm/eslint-config/react`, `@jrm/tsconfig/svelte.json`), and shows
  the minimal working snippet to adopt it.
- **Anti-patterns:** A package with no README or a bare title; documenting a package only in
  the root README; a README that describes internals but never shows how to consume the package.

#### 1.1 The root README is the map, not the manual

- **Statement:** The root `README.md` stays a high-level index — what's inside, workspace
  commands, theming model, and one canonical example per framework — and links down to package
  READMEs for depth.
- **Why:** A single README that absorbs every package's detail becomes unmaintainable and
  drifts. The root orients; the package docs specify.

### 2. Public API surface is documented and enumerated

- **Statement:** Document every public export, package subpath, CSS variable group, and shared
  config variant that consumers are meant to use; do not document internals as if they were API.
- **Why:** The `@jrm` contract *is* the surface: semantic CSS variables, the Tailwind preset,
  typed token objects, and the `base`/`react`/`svelte`/`node` config variants. Undocumented
  surface gets used by guesswork; documented internals get depended on by mistake.
- **In practice:** Reference the exported names (`tokens`, `tokensDark`, `themes`), the CSS
  entry points and `[data-theme]` layers, the Tailwind utilities the preset provides
  (`bg-background`, `text-player-3`, `animate-pop-in`, …), and each config's extends path.
  Mark anything under `build/` as generated output, not hand-editable API.
- **Anti-patterns:** Listing internal Style Dictionary config files as consumer API; documenting
  a token or utility that the preset doesn't emit; leaving a new export undocumented.

### 3. Examples are runnable and match the current code

- **Statement:** Every code example must run against the current package as published, with
  correct import paths, real export names, and real token values.
- **Why:** A stale example is worse than none — it looks authoritative and fails silently.
  Token values (`tokens.color.primary` → `"#7c5cff"`), subpaths, and config names all change,
  and copy-pasted examples are the primary way consumers adopt the kernel.
- **In practice:** Derive examples from actual exports and the built output; when an export,
  subpath, or default value changes, update the example in the same PR. Prefer minimal,
  complete snippets over fragments that omit imports.
- **Anti-patterns:** Import paths that don't resolve; referencing a removed export or a renamed
  subpath; hard-coded token values that no longer match `build/`; examples that assume publishing
  when packages are still `private` + `0.0.0`.

### 4. Docs change in the same PR as the code they describe

- **Statement:** When a change alters public behavior, exports, tokens, or commands, update the
  affected docs in the same pull request.
- **Why:** Documentation debt compounds silently. Coupling the doc change to the code change is
  the only reliable way to keep them in sync, and it makes review verify both at once.
- **In practice:** Adding a theme, a config variant, an export, or a workspace command means
  touching the relevant README(s) before merge. Reviewers treat missing doc updates as a blocking
  gap, not a follow-up.
- **Anti-patterns:** "Docs later" issues that never close; a PR that renames a subpath but leaves
  the README pointing at the old one; changelog-only updates with no reference-doc change.

### 5. Diagrams clarify architecture and flow

- **Statement:** Use Mermaid diagrams (GitHub-rendered) to show non-obvious structure — the
  token build pipeline, the theming layer cascade, and cross-package dependencies.
- **Why:** The kernel's value is a flow: DTCG sources → Style Dictionary → CSS/Tailwind/JS
  outputs → per-framework consumption. Prose describes it; a diagram makes the ordering and
  dependencies legible at a glance.
- **In practice:** Diagram the build order (`tokens → tailwind-preset`), the
  `:root` / `[data-theme="dark"]` / `[data-theme="high-contrast"]` semantic cascade, and how
  products consume outputs. Keep diagrams source-controlled as fenced ```mermaid blocks, not
  images, so they diff and render inline.
- **Anti-patterns:** Screenshots of diagrams that can't be diffed; a diagram that contradicts
  the prose or the actual build order; decorative diagrams that add no information.

### 6. Cross-references are relative and resolve

- **Statement:** Link between docs with repo-relative paths, and keep every internal link and
  anchor resolving.
- **Why:** Absolute or external links break when the repo moves or is browsed offline; dead
  links erode trust and strand readers mid-task. Relative links survive forks and worktrees.
- **In practice:** Use relative paths (`packages/tokens/README.md`, `../AGENTS.md`); when moving
  or renaming a doc, fix inbound links in the same PR; run the repo's link check when available.
- **Anti-patterns:** Hard-coded `github.com/...` URLs for in-repo files; links to renamed or
  deleted files; anchors that point at headings that no longer exist.

### 7. Docs are reviewed for accuracy, clarity, and accessibility

- **Statement:** Treat documentation as reviewable work: verify it against the code, write for
  humans first, and structure it for accessibility.
- **Why:** Docs are read far more than they're written, by newcomers and by agents. Accuracy is
  non-negotiable; clarity and structure determine whether the accurate content is actually usable.
- **In practice:** Confirm claims against current code before merge; use active voice and present
  tense; define acronyms (DTCG, PWA) on first use; nest headings without skipping levels; give
  tables headers and images alt text. Verify examples build with `pnpm build` / `pnpm typecheck`
  where relevant.
- **Anti-patterns:** Asserting product status the code doesn't support; walls of prose where a
  table or list fits; skipped heading levels; images without alt text; marketing tone in reference docs.

## Aligned agent

`docs-writer` — this specialist should treat the principles above as binding practice
when working in this realm.

## Related realms

- [Architecture](architecture.md) — owns `docs/architecture/`; documentation cross-references
  it and defers to it for system-design decisions rather than duplicating them.
- [Design](design.md) — the token/theming contract documented here originates in the design realm.
- [Accessibility](accessibility.md) — shares the plain-language, heading-hierarchy, and alt-text
  standards that Principle 7 applies to docs.
- [Process](process.md) — the "docs change in the same PR" rule (Principle 4) is enforced through
  the release/review process.
- [Frontend](frontend.md) & [Backend](backend.md) — own the source whose public API and examples
  this realm documents.
