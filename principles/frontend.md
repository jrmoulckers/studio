# Principles — Frontend

> **Status:** Draft · **Owner:** _you_ · **Aligned agent:** `web-engineer`
>
> This file is authored in a dedicated worktree session. Fill in the tree below.
> Keep each principle short, testable, and specific to this realm.

## Purpose

This realm governs how product apps (Next.js `jrm-recipes`, Svelte `score-king`, the React
PWA) build UI on top of the `@jrm` kernel. It exists to keep every surface consuming **one
token source of truth**, staying framework-agnostic, accessible, performant, and secure —
so a theme swap re-flows the whole product with no rebuild and no per-app drift.

## Principles

### 1. Consume tokens through their published interfaces — never hardcode values

- **Statement:** Read design values through `@jrm/tokens` CSS variables, the Tailwind preset,
  or the typed JS objects. Never inline a hex, px, radius, shadow, or duration literal.
- **Why:** Hardcoded values break the theme contract: they don't re-flow on a `data-theme`
  swap, drift from the semantic palette, and silently fork the design system per app.
- **In practice:** Style with `var(--color-surface)` / `bg-surface`, `var(--radius-md)`,
  `var(--shadow-lift)`; reach for `import { tokens } from "@jrm/tokens"` only where CSS can't
  go (canvas, charts, inline SVG stroke).
- **Anti-patterns:** `color: #7c5cff`; `border-radius: 8px`; `style={{ padding: 16 }}`;
  copying a token value into a component instead of referencing it.

#### 1.1 Bind to semantic names, not primitives

- **Statement:** Reference semantic vars (`--color-primary`, `--color-text`) and component
  vars, not primitive scale entries (`--color-violet-500`).
- **Why:** Only the ~16 semantic colors are restated per theme; binding to a primitive
  pins you to the light palette and won't respond to dark / high-contrast modes.

### 2. Keep UI framework-agnostic at the token boundary

- **Statement:** Depend on the CSS-variable and preset contract that works identically in
  React, Svelte, and Next — never on framework-specific token glue.
- **Why:** The kernel's value is one contract across three runtimes. Framework-locked access
  patterns fragment that and block sharing components or lifting them between apps.
- **In practice:** A `.card` in Svelte `<style>`, a Tailwind `bg-surface` class in React, and
  a Next `globals.css` all resolve the same `var(--color-surface)`. Set the mode uniformly via
  `document.documentElement.dataset.theme`.
- **Anti-patterns:** A JS theme provider that re-implements token values; duplicating the
  palette in a Svelte store; Tailwind config that overrides preset values per app.

### 3. Drive theming and color modes off `data-theme` — no rebuild, no flash

- **Statement:** Switch appearance only by setting/removing `data-theme` on the document
  element. Never fork stylesheets or recompile per mode.
- **Why:** Component vars reference semantic names, so one attribute swap re-flows every
  utility and component at runtime. Rebuilding or branching CSS defeats the whole design.
- **In practice:** `light` = no attribute, `dark` / `high-contrast` set the attribute; apply
  the persisted choice before first paint (inline head script / SSR attribute) to avoid a
  theme flash; honor `prefers-color-scheme` for the initial default.
- **Anti-patterns:** Shipping a separate dark bundle; toggling class names that restate colors;
  reading theme after hydration and letting the wrong palette flash first.

### 4. Prefer native HTML semantics; add ARIA only to fill real gaps

- **Statement:** Build interactive UI from semantic elements (`button`, `a`, `label`,
  `fieldset`, `dialog`) first. Reach for ARIA only when no native element expresses the intent.
- **Why:** Native elements come with keyboard, focus, and screen-reader behavior for free;
  redundant or wrong ARIA actively degrades accessibility.
- **In practice:** `<button>` for actions (never a clickable `<div>`); label every control;
  manage focus on route changes and dialog open/close; keep all interaction keyboard-reachable.
- **Anti-patterns:** `<div role="button" onClick>`; `aria-label` on an element that already
  has a visible label; mouse-only handlers; focus lost after navigation.

### 5. Respect user preferences and all UI states

- **Statement:** Honor reduced-motion, color-scheme, and contrast preferences, and design
  loading, empty, and error states — not just the happy path.
- **Why:** Ignoring preferences harms and excludes users; unhandled states produce layout
  shift, dead ends, and confusing failures.
- **In practice:** The tokens' `prefers-reduced-motion` block already zeroes durations — don't
  reintroduce motion that bypasses it; render explicit loading/empty/error UI with recovery
  paths; reserve space to avoid CLS.
- **Anti-patterns:** Hardcoded animations that ignore reduced-motion; a spinner with no error
  fallback; blank screen on empty data; content that jumps in as it loads.

### 6. Guard the client budget — bundle size and Core Web Vitals

- **Statement:** Keep client JS lean and treat Core Web Vitals (LCP, CLS, INP) as budgets, not
  afterthoughts.
- **Why:** Product apps are PWAs on real devices; every unnecessary kB and layout shift costs
  engagement and fails performance gates.
- **In practice:** Code-split routes and heavy widgets; lazy-load below-the-fold and offscreen
  work; prefer server rendering / static where the framework allows; import named tokens, not
  whole barrels, in hot paths; measure with Lighthouse before shipping.
- **Anti-patterns:** Importing a charting lib for one sparkline; shipping all routes in one
  chunk; blocking render on non-critical JS; unbounded re-renders.

### 7. Keep the browser surface secure

- **Statement:** Treat the browser as untrusted: no secrets in client code or unsafe storage,
  no CSP-violating inline scripts/styles, and safe handling of any rendered user input.
- **Why:** Client bundles and storage are fully inspectable; leaked secrets and XSS sinks are
  direct breaches.
- **In practice:** Keep secrets server-side; use the framework's escaping and avoid
  `dangerouslySetInnerHTML` / `{@html}` on untrusted data; prefer the token CSS import over
  inline styles so CSP can stay strict; use Web Crypto/WebAuthn where auth needs it.
- **Anti-patterns:** API keys in the bundle or `localStorage`; injecting unsanitized HTML;
  inline `<script>` that forces a loosened CSP.

### 8. Capability-detect optional platform APIs and degrade to a silent no-op

- **Statement:** Feature-detect every non-universal browser API before use, and when it is
  missing fall back silently to a working path — never to an error, and never to a visible
  broken control.
- **Why:** Browser support for platform APIs varies by engine, version, and context (many are
  secure-context or install-only). Assuming availability turns a progressive enhancement into a
  hard crash for a subset of users, on exactly the devices least likely to be tested.
- **In practice:** Check for the API on its host object before calling it, and prefer hiding or
  substituting the affordance over surfacing an error the user can do nothing about. Enhancement
  is additive: the core task must remain completable without the API.
- **Anti-patterns:** Calling an optional API behind a user-agent sniff; a button that throws on
  an unsupported browser; an "unsupported" error toast for a purely optional nicety; gating a
  core flow behind an API that may not exist.

### 9. Application updates are offered, never forced mid-session

- **Statement:** When a new version of an installed or cached app is available, surface it and
  let the user choose when to take it; never swap assets underneath a running session.
- **Why:** A precached app that silently activates a new version mid-session mixes old running
  code with newly fetched chunks — producing missing-module errors, broken navigations, and lost
  in-progress work. The user experiences it as random corruption, and it is nearly impossible to
  reproduce.
- **In practice:** A new build is detected and waits; the user is prompted and the update is
  applied on an explicit reload, so activation happens at a safe boundary. Unsaved work is
  committed to durable local storage first — see [Local-First](local-first.md) principle 1.
- **Anti-patterns:** Immediately claiming clients and activating a new service worker; forcing a
  reload out from under the user; treating the update prompt as optional polish on an offline
  app.

## Aligned agent

`web-engineer` — this specialist should treat the principles above as binding practice
when working in this realm.

## Related realms

- **[Design](design.md)** — owns the token sources and semantic palette this realm consumes;
  hand token gaps or new semantic names back to `design-engineer`.
- **[Accessibility](accessibility.md)** — deep guidance behind principles 4–5; this realm
  applies it, that realm audits it.
- **[Performance](performance.md)** — sets the budgets principle 6 enforces at the UI layer.
- **[Security](security.md)** — owns the CSP and browser-security posture principle 7 upholds.
- **[Backend](backend.md)** — owns the data contracts this UI orchestrates; coordinate changes
  there rather than reshaping them in the client.
- **[Local-First](local-first.md)** — shares this agent; owns what the client stores and how
  it syncs, while this realm owns how it renders.
