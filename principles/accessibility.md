# Principles — Accessibility

> **Status:** Draft · **Owner:** _you_ · **Aligned agent:** `accessibility-reviewer`
>
> This file is authored in a dedicated worktree session. Fill in the tree below.
> Keep each principle short, testable, and specific to this realm.

## Purpose

This realm governs how every JRM Studio surface — the Next.js app, the Svelte PWA, the
React PWA, and the shared kernel they consume — stays usable by everyone, including people
who rely on keyboards, switches, screen readers, magnification, high contrast, or reduced
motion. Because accessibility is built into the `@jrm` tokens and configs, it ships once
in the kernel and is inherited by every product rather than retrofitted per app.

## Principles

<!--
Add principles as a tree. Each top-level principle may have sub-principles.
Copy the block below for each principle.
-->

### 1. WCAG 2.2 AA is the floor, not the goal

- **Statement:** Every user-facing change must meet WCAG 2.2 Level AA before it merges; treat AA as the minimum bar and exceed it where cheap.
- **Why:** A single, named standard makes "accessible" testable and non-negotiable instead of a matter of taste, and AA is the common legal and contractual baseline.
- **In practice:** Map each UI change to the specific success criteria it touches (e.g. 1.4.3 Contrast, 2.4.7 Focus Visible, 2.5.8 Target Size). Run an automated scan (axe / Lighthouse / Pa11y) in CI and record which criteria were checked in the PR.
- **Anti-patterns:** "We'll add accessibility later"; shipping behind a flag with no criteria mapping; treating a green automated scan as proof of full compliance when keyboard and screen-reader paths were never exercised.

#### 1.1 Automated scans gate, manual review confirms

- **Statement:** Automated tooling blocks obvious regressions; a human still walks the keyboard and screen-reader path before sign-off.
- **Why:** Automated tools catch at most ~30–40% of WCAG issues; focus order, announcements, and meaningful alt text need a human.

### 2. Contrast comes from the token theme, never from local overrides

- **Statement:** Take all foreground/background pairings from the `@jrm/tokens` semantic colors, and verify text ≥ 4.5:1 (≥ 3:1 for large text and UI/graphics) in every shipped theme.
- **Why:** Contrast is a property of a color _pair_, not a single value. Centralizing it in the tokens means one audited palette protects every product; local hex overrides silently reintroduce failures.
- **In practice:** Use semantic vars (`var(--color-text)` on `var(--color-surface)`), not raw hex. When contrast can't be met in the default palette, the fix lands in the tokens, not the component. Audit each of `:root` (light), `[data-theme="dark"]`, and `[data-theme="high-contrast"]`.
- **Anti-patterns:** Hard-coded `color: #777` or `opacity` used to dim text below the ratio; "looks fine on my monitor"; passing contrast in light but never checking dark or high-contrast.

#### 2.1 High-contrast theme is a first-class mode, not a fallback

- **Statement:** Ship and test the `[data-theme="high-contrast"]` mode as a real supported theme, and never convey information by color alone.
- **Why:** Users who need maximum contrast are excluded if the mode is stale or untested, and color-only signals (e.g. red/green status) fail for color-blind and grayscale users.
- **In practice:** Pair every color-coded state with a second cue — icon, text label, or shape. Include high-contrast in the theme snapshot/visual-regression matrix.
- **Anti-patterns:** A high-contrast theme that lags the default palette; status shown only as a colored dot; focus rings that vanish in high-contrast mode.

### 3. Motion respects `prefers-reduced-motion`

- **Statement:** All non-essential animation must honor the reduced-motion preference; drive durations through the motion tokens so the kernel's reduced-motion block can collapse them.
- **Why:** Vestibular disorders make large or parallax motion physically painful. The tokens already zero motion durations under `prefers-reduced-motion`, so any animation bypassing them reintroduces harm.
- **In practice:** Animate via `var(--motion-*-duration)` / easing tokens, not hard-coded `300ms`. Avoid essential meaning conveyed only through motion; keep auto-playing/looping animation out or user-pausable. Verify with the OS "reduce motion" setting on.
- **Anti-patterns:** Inline `transition: 300ms` or JS-driven animation that ignores the media query; auto-advancing carousels with no pause; large parallax or motion-only affordances.

### 4. Everything works from the keyboard and switch

- **Statement:** Every interactive control must be reachable, operable, and clearly focus-visible using keyboard or switch alone, in a logical order.
- **Why:** Keyboard operability is the foundation most assistive tech builds on; a mouse-only control is invisible to switch, screen-reader, and power users alike.
- **In practice:** Use native `<button>`/`<a>`/form controls; ensure a visible focus indicator (from the focus tokens) that survives every theme; manage focus on route changes, dialogs, and dynamic content (trap in modals, restore on close); no keyboard traps.
- **Anti-patterns:** `<div onClick>` with no role/tabindex/key handler; `outline: none` with no replacement; focus lost to `document.body` after a modal closes; tab order that jumps around the layout.

#### 4.1 Targets meet minimum size

- **Statement:** Interactive targets meet the platform minimum (WCAG 2.5.8: at least 24×24 CSS px, with adequate spacing; prefer ≥ 44×44 for touch PWAs).
- **Why:** Small or crowded targets exclude users with motor impairments and anyone on touch, which is most of the Svelte/React PWA audience.
- **In practice:** Size tap targets and their spacing with the spacing tokens; give icon-only buttons a padded hit area even when the glyph is small.

### 5. Markup is semantic and named for assistive technology

- **Statement:** Convey structure, role, name, and state through native semantic HTML first; reach for ARIA only to fill gaps, and never to override correct semantics.
- **Why:** Native elements come with keyboard behavior, roles, and states for free. "No ARIA is better than bad ARIA" — incorrect roles actively mislead screen-reader users.
- **In practice:** One `<h1>` per view with a correct heading hierarchy; landmarks (`<main>`, `<nav>`, `<header>`); labels tied to inputs (`<label for>` / `aria-labelledby`); accurate names/states on custom widgets; `lang` set on `<html>` and updated on locale change. Announce async updates via a polite live region.
- **Anti-patterns:** `<div class="btn">`; heading levels chosen for size not structure; placeholder used as the only label; `role="button"` bolted onto a link; a spinner that never announces "loading" / "done".

#### 5.1 Images and icons declare their intent

- **Statement:** Every image has meaningful `alt` text, or is marked decorative (`alt=""` / `aria-hidden`) when it adds no information.
- **Why:** Missing alt forces screen readers to read filenames; decorative images left unmarked add noise. Both degrade comprehension.
- **In practice:** Alt describes purpose, not appearance; icon-only controls carry an accessible name (`aria-label` / visually-hidden text).

### 6. Errors and recovery are clear and inclusive

- **Statement:** Form errors must be programmatically associated with their field, described in plain language, and offer a clear path to fix.
- **Why:** An error shown only as a red border is invisible to screen-reader and color-blind users; vague messages ("invalid input") leave everyone stuck.
- **In practice:** Link messages with `aria-describedby`, mark invalid fields with `aria-invalid`, move focus to the first error, and say what to do ("Enter a date after today"). Never rely on color alone to signal the error.
- **Anti-patterns:** Toast-only validation that disappears; red outline with no text; blocking submit with no explanation; error summaries that aren't focusable.

### 7. Cognitive accessibility is a first-class, tokenized mode

- **Statement:** Ship cognitive support as an opt-in mode driven by a single root attribute (`data-a11y-cognitive="true"`) that remaps tokens — increasing type size and spacing, enlarging targets, strengthening focus, flattening visual noise, and disabling motion — never as per-component special-casing.
- **Why:** Users with ADHD, autism, TBI, dyslexia, age-related decline, or situational overload are excluded by dense, animated, jargon-heavy UI. Driving the mode from the token layer means it ships once in the kernel and every product and surface inherits it; special-casing it per component guarantees it rots the moment someone adds a screen.
- **In practice:** The kernel owns the mechanism: `@jrm/tokens` defines the `--cognitive-*` scale and the `[data-a11y-cognitive="true"]` block that remaps semantic vars. Products toggle the attribute on the root element and persist the preference; they never re-derive the values. The mode stacks orthogonally on theme and is a **superset** of `prefers-reduced-motion` — enabling it zeroes motion regardless of the OS setting. Content follows plain-language rules and caps choices per group (`--cognitive-max-choices-per-group`).
- **Anti-patterns:** Cognitive support hardcoded per component; **a mode that only changes font size**; motion that bypasses the mode; jargon with no plain-language variant; a product defining its own cognitive values instead of consuming the kernel's.

> **Known gap (kernel):** `@jrm/tokens` currently defines all 30 `--cognitive-*` values, but the `[data-a11y-cognitive="true"]` block only remaps **type and motion**. The spacing, focus, elevation, border-width, and 48px touch-target values are emitted but never applied, because the default output has no semantic `--focus-*` / `--elevation-*` / border / touch-target roles to override. Closing this needs a semantic role layer in [Design](design.md) — until then the mode meets only part of this principle.

## Aligned agent

`accessibility-reviewer` — this specialist should treat the principles above as binding practice
when working in this realm.

## Related realms

- [Design](design.md) — owns the token palette and motion scales these principles depend on (contrast, focus, reduced-motion).
- [Frontend](frontend.md) — implements the semantic markup, keyboard handling, and focus management audited here.
- [Testing](testing.md) — runs and gates the automated a11y scans; hosts the manual keyboard/screen-reader checks.
- [Localization](localization.md) — shares `lang`/direction handling and plain-language concerns.
- [Compliance](compliance.md) — consumes WCAG 2.2 AA conformance as legal/contractual evidence.
