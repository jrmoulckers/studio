/**
 * Accessibility base stylesheet.
 *
 * Studio has always shipped the a11y *tokens* — --focus-ring-width,
 * --focus-ring-offset, --target-min — but nothing that applied them. Every
 * consumer therefore wrote its own focus ring, its own screen-reader utility,
 * and its own dark-mode form-control fixes, each drifting independently. This
 * file is the missing application layer.
 *
 * The dark-mode section is generated from the color modes rather than
 * hand-listed, so it cannot fall behind the theme set.
 */
export function renderA11yCss({ autogen, darkSelectors }) {
  // Native pickers and spinners render their glyphs from the browser's own
  // light/dark heuristic, which keys off the UA color scheme rather than an
  // author [data-theme]. Without this they stay dark-on-dark.
  const pickerControls = ['date', 'time', 'datetime-local', 'month', 'week'];
  const pickerSelectors = (prefix) =>
    pickerControls
      .map((type) => `${prefix}input[type="${type}"]::-webkit-calendar-picker-indicator`)
      .join(',\n');

  const darkPickerBlock = darkSelectors
    .map((selector) => pickerSelectors(`${selector} `))
    .join(',\n');

  const a11yCss = `${autogen} */
/*
 * @jrm/tokens accessibility base.
 *
 * Import after the token stylesheet:
 *   @import '@jrm/tokens/css';
 *   @import '@jrm/tokens/css/a11y';
 *
 * Every rule here is driven by a token, so restyling the focus ring or the
 * touch-target floor is a token change, not a stylesheet fork.
 *
 * Utility classes are prefixed .jrm-* deliberately. Tailwind already defines a
 * bare .sr-only, and silently redefining another framework's utility is how a
 * design system becomes impossible to adopt incrementally.
 */

/* -------------------------------------------------------------------------
 * Focus visibility — WCAG 2.4.7 Focus Visible, 2.4.11 Focus Not Obscured,
 * 2.4.13 Focus Appearance.
 *
 * :focus-visible rather than :focus, so the ring appears for keyboard and
 * assistive-technology navigation without firing on every mouse click.
 * ------------------------------------------------------------------------- */

:focus-visible {
  outline: var(--focus-ring-width) solid var(--semantic-border-focus);
  outline-offset: var(--focus-ring-offset);
}

/*
 * Only suppress the UA default where :focus-visible is understood. A bare
 * "outline: none" would strip focus for every user on a browser that lacks it.
 */
@supports selector(:focus-visible) {
  :focus:not(:focus-visible) {
    outline: none;
  }
}

/*
 * Composite widgets move focus to a descendant, so the ring belongs on the
 * container that a sighted keyboard user is actually tracking.
 */
[role="listbox"]:focus-within,
[role="menu"]:focus-within,
[role="tablist"]:focus-within,
[role="grid"]:focus-within {
  outline: var(--focus-ring-width) solid var(--semantic-border-focus);
  outline-offset: var(--focus-ring-offset);
}

/* -------------------------------------------------------------------------
 * Screen-reader-only content.
 *
 * The clip-path/1px technique keeps the text in the accessibility tree while
 * removing it visually. display:none and visibility:hidden both remove it from
 * the tree entirely, which is the common and silent mistake.
 * ------------------------------------------------------------------------- */

.jrm-sr-only {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/*
 * Skip links: hidden until focused, then rendered normally. Pairs with
 * .jrm-sr-only on the same element.
 */
.jrm-sr-only-focusable:focus,
.jrm-sr-only-focusable:focus-visible {
  position: static;
  inline-size: auto;
  block-size: auto;
  padding: var(--spacing-sm) var(--spacing-md);
  margin: 0;
  overflow: visible;
  clip-path: none;
  white-space: normal;
  background: var(--semantic-background-elevated);
  color: var(--semantic-text-primary);
}

/* -------------------------------------------------------------------------
 * Touch target sizing — WCAG 2.5.8 Target Size (Minimum).
 *
 * Scoped to real controls and explicit widget roles, never to bare a[href].
 * A blanket min-inline-size on anchors would wreck inline prose links, which is
 * why this is role-driven: those attributes only appear on custom controls.
 * ------------------------------------------------------------------------- */

button,
select,
[role="button"],
[role="link"],
[role="tab"],
[role="menuitem"],
[role="menuitemcheckbox"],
[role="menuitemradio"],
[role="switch"],
[role="checkbox"],
[role="radio"] {
  min-block-size: var(--target-min);
  min-inline-size: var(--target-min);
}

/*
 * Opt-out for dense affordances. Only valid when an ancestor row itself meets
 * --target-min, which is the condition --target-compact documents.
 */
.jrm-target-compact {
  min-block-size: var(--target-compact);
  min-inline-size: var(--target-compact);
}

/* Primary actions and cognitive-accessibility mode. */
.jrm-target-spacious {
  min-block-size: var(--target-spacious);
  min-inline-size: var(--target-spacious);
}

/* -------------------------------------------------------------------------
 * Native form-control chrome on dark surfaces.
 *
 * GENERATED from the color modes whose base surface measures dark, not from a
 * hand-written selector list. Add a mode and it appears here automatically.
 * Currently: ${darkSelectors.join(', ')}
 * ------------------------------------------------------------------------- */

${darkPickerBlock} {
  filter: invert(1);
}

/*
 * Same fix for users whose OS prefers dark and who have not pinned a theme,
 * matching how the token stylesheet guards its preference blocks.
 */
@media (prefers-color-scheme: dark) {
${pickerSelectors('  :root:not([data-theme]) ')} {
    filter: invert(1);
  }
}

/* -------------------------------------------------------------------------
 * Forced-colors (Windows High Contrast).
 *
 * The OS replaces the palette wholesale, so tokens no longer apply. Re-anchor
 * the focus ring to a system color rather than letting it disappear.
 * ------------------------------------------------------------------------- */

@media (forced-colors: active) {
  :focus-visible {
    outline: var(--focus-ring-width) solid CanvasText;
  }
}
`;

  return a11yCss;
}
