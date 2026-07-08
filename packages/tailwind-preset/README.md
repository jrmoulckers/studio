# @jrm/tailwind-preset

A ready-to-use [Tailwind CSS](https://tailwindcss.com) preset for **JRM Studio**. It wraps
the token-generated preset from [`@jrm/tokens`](../tokens) — where every value is a
`var(--…)` reference — and layers on the shared shell:

- **class + attribute dark mode** — `darkMode: ["class", '[data-theme="dark"]']`, matching the
  `@jrm/tokens` CSS variable scheme.
- **container** centered at `1rem` padding, `760px` max (the score-king content-max token).
- **radius aliases** — `DEFAULT` → `--radius-md`, `full` → `--radius-pill`, on top of the
  token `borderRadius` scale.
- **animations** — `fade-in`, `pop-in`, plus the `tailwindcss-animate` plugin.

Because the colors/spacing/radius/shadow/typography all resolve to CSS variables, a runtime
theme or mode swap (changing `data-theme`) re-flows every utility with **no rebuild**.

## Usage

Import the CSS variables once (from `@jrm/tokens`) and apply the preset:

```js
// tailwind.config.js (or .cjs)
module.exports = {
  presets: [require("@jrm/tailwind-preset")],
  content: ["./src/**/*.{js,ts,jsx,tsx,svelte,mdx,html}"],
};
```

```css
/* app entry CSS */
@import "@jrm/tokens/css";      /* defines the --… variables the preset references */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Now utilities like `bg-background`, `text-foreground`, `bg-primary`, `text-accent-ink`,
`rounded-md`, `shadow-lift`, `text-player-3`, and `animate-pop-in` are available and
theme-aware.

## Requires

- `tailwindcss` (peer, `>=3`)
- `@jrm/tokens` built first (`pnpm --filter @jrm/tokens build`) so `@jrm/tokens/tailwind`
  exists — the workspace `build` pipeline handles this ordering automatically.
