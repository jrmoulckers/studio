export const REQUIRED_TOKEN_FILES = Object.freeze([
  'component/avatar.json',
  'component/button.json',
  'component/card.json',
  'component/chart.json',
  'component/cognitive.json',
  'component/input.json',
  'component/modal.json',
  'component/nav.json',
  'component/pill.json',
  'component/premium.json',
  'component/progress.json',
  'component/skeleton.json',
  'component/toast.json',
  'primitive/breakpoint.json',
  'primitive/cognitive.json',
  'primitive/focus.json',
  'primitive/motion.json',
  'primitive/opacity.json',
  'primitive/radius.json',
  'primitive/shadow.json',
  'primitive/spacing.json',
  'primitive/target.json',
  'primitive/typography.json',
  'primitive/zindex.json',
  'semantic/cognitive.json',
  'semantic/elevation.json',
  'semantic/layer.json',
  'semantic/motion.json',
  'semantic/state.json',
  'semantic/typography.json',
  'themes/default/color.alias.json',
  'themes/default/color.primitive.json',
  'themes/default/color.semantic.dark-oled.json',
  'themes/default/color.semantic.dark.json',
  'themes/default/color.semantic.high-contrast.json',
  'themes/default/color.semantic.high-contrast-dark.json',
  'themes/default/color.semantic.light.json',
]);

/**
 * Theme-agnostic structural tokens. These carry no color, so they are asserted
 * once against the light build rather than through per-theme parity.
 */
export const REQUIRED_STRUCTURAL_TOKENS = Object.freeze([
  { path: 'layer.content', type: 'number' },
  { path: 'layer.raised', type: 'number' },
  { path: 'layer.nav', type: 'number' },
  { path: 'layer.scrim', type: 'number' },
  { path: 'layer.dialog', type: 'number' },
  { path: 'layer.toast', type: 'number' },
  { path: 'layer.tooltip', type: 'number' },
  { path: 'state.hover.overlay', type: 'number' },
  { path: 'state.hover.surface-overlay', type: 'number' },
  { path: 'state.pressed.overlay', type: 'number' },
  { path: 'state.selected.overlay', type: 'number' },
  { path: 'state.disabled.opacity', type: 'number' },
  { path: 'state.scrim.opacity', type: 'number' },
  { path: 'elevation.flat', type: 'shadow' },
  { path: 'elevation.hairline', type: 'shadow' },
  { path: 'elevation.raised', type: 'shadow' },
  { path: 'focus.ring.width', type: 'dimension' },
  { path: 'focus.ring.offset', type: 'dimension' },
  { path: 'target.min', type: 'dimension' },
  { path: 'target.compact', type: 'dimension' },
  { path: 'target.spacious', type: 'dimension' },
]);

/**
 * The Tailwind shell that the *generated* preset must carry, expressed as
 * `[scale, key, expectedValue]`.
 *
 * This exists because consumers vendor `dist/` as a plain copied directory. They
 * cannot `require('@jrm/tailwind-preset')`, so any part of the shell that lived only
 * in that package would be unreachable downstream. Declaring it here makes the shell
 * a versioned promise rather than an implementation detail of the build script.
 */
export const REQUIRED_TAILWIND_SHELL = Object.freeze([
  ['borderRadius', 'DEFAULT', 'var(--radius-md)'],
  ['borderRadius', 'full', 'var(--radius-pill)'],
  ['ringWidth', 'DEFAULT', 'var(--focus-ring-width)'],
  ['ringOffsetWidth', 'DEFAULT', 'var(--focus-ring-offset)'],
  ['spacing', 'safe-t', 'env(safe-area-inset-top)'],
  ['spacing', 'safe-r', 'env(safe-area-inset-right)'],
  ['spacing', 'safe-b', 'env(safe-area-inset-bottom)'],
  ['spacing', 'safe-l', 'env(safe-area-inset-left)'],
  ['zIndex', 'dialog', 'var(--layer-dialog)'],
  ['zIndex', 'tooltip', 'var(--layer-tooltip)'],
  ['boxShadow', 'raised', 'var(--elevation-raised)'],
  ['opacity', 'disabled', 'var(--opacity-disabled)'],
  ['minHeight', 'min', 'var(--target-min)'],
  ['minWidth', 'min', 'var(--target-min)'],
]);

/**
 * Foreground/background pairs that a user actually sees composited, with the WCAG 2.2
 * minimum each one owes.
 *
 * Studio distributes these components to every product, so a contrast failure here is
 * inherited by all of them at once. The pairs are listed rather than inferred because
 * only a human knows which two tokens end up on top of each other — `toast.action` is
 * text on `toast.surface`, but nothing in the token graph says so.
 *
 * `4.5` is normal-size text (SC 1.4.3). `3` is a non-text/large-text pair such as an
 * icon or a status glyph (SC 1.4.11). Disabled states are exempt from both.
 */
export const CONTRAST_PAIRS = Object.freeze(
  [
    ['button.primary.bg', 'button.primary.text', 'primary button label', 4.5],
    ['button.default.bg', 'button.default.text', 'default button label', 4.5],
    ['semantic.background.primary', 'button.ghost.text', 'ghost button label', 4.5],
    ['semantic.background.primary', 'button.danger.text', 'danger button label', 4.5],
    ['pill.bg', 'pill.text', 'pill label', 4.5],
    ['input.bg', 'input.text', 'input value', 4.5],
    ['input.bg', 'input.placeholder', 'input placeholder', 4.5],
    ['toast.surface', 'toast.text', 'toast body', 4.5],
    ['toast.surface', 'toast.text-muted', 'toast muted body', 4.5],
    ['toast.surface', 'toast.action', 'toast action label', 4.5],
    ['toast.surface', 'toast.positive', 'toast positive glyph', 3],
    ['toast.surface', 'toast.negative', 'toast negative glyph', 3],
    ['toast.surface', 'toast.warning', 'toast warning glyph', 3],
    ['toast.surface', 'toast.info', 'toast info glyph', 3],
    ['modal.surface', 'modal.text', 'modal body', 4.5],
    ['modal.surface', 'modal.text-muted', 'modal muted body', 4.5],
    ['card.bg', 'card.text', 'card body', 4.5],
    ['tile.bg', 'tile.text', 'tile body', 4.5],
    ['nav.tabbar.bg', 'nav.tab.text', 'inactive tab label', 4.5],
    ['nav.tab.active-bg', 'nav.tab.active-text', 'active tab label', 4.5],
    ['nav.iconbtn.bg', 'nav.iconbtn.text', 'icon button glyph', 4.5],
    ['premium-badge.bg', 'premium-badge.text', 'premium badge label', 4.5],
    ['premium-upsell.bg', 'premium-upsell.icon', 'premium upsell glyph', 3],
    ['semantic.background.primary', 'premium-gate.icon', 'premium gate lock glyph', 3],
    [
      'semantic.background.secondary',
      'premium-gate.icon',
      'premium gate lock glyph on recessed bg',
      3,
    ],
    [
      'semantic.background.primary',
      'premium-paywall.feature-check',
      'paywall feature check glyph',
      3,
    ],
  ].map((pair) => Object.freeze(pair)),
);

/**
 * Avatar fills are theme-invariant player identities, so their ink must clear AA against
 * every one of them rather than against a single default.
 */
export const AVATAR_FILL_COUNT = 12;

export const REQUIRED_SEMANTIC_TOKENS = Object.freeze(
  [
    'semantic.background.primary',
    'semantic.background.secondary',
    'semantic.background.elevated',
    'semantic.background.raised',
    'semantic.text.primary',
    'semantic.text.secondary',
    'semantic.text.disabled',
    'semantic.text.inverse',
    'semantic.border.default',
    'semantic.border.focus',
    'semantic.border.error',
    'semantic.interactive.default',
    'semantic.interactive.hover',
    'semantic.interactive.pressed',
    'semantic.interactive.disabled',
    'semantic.accent.default',
    'semantic.accent.ink',
    'semantic.status.positive',
    'semantic.status.negative',
    'semantic.status.warning',
    'semantic.status.info',
    'semantic.status.pending',
    'semantic.status.neutral',
    'semantic.status.positiveSubtle',
    'semantic.status.negativeSubtle',
    'semantic.status.warningSubtle',
    'semantic.status.infoSubtle',
    'semantic.status.pendingSubtle',
    'semantic.status.neutralSubtle',
  ]
    .map((path) => ({ path, type: 'color' }))
    .concat([
      { path: 'shadow.lift', type: 'shadow' },
      { path: 'shadow.hairline', type: 'shadow' },
    ]),
);

export const REQUIRED_ALIASES = Object.freeze([
  { path: 'color.bg', type: 'color', value: '{semantic.background.primary}' },
  { path: 'color.surface', type: 'color', value: '{semantic.background.elevated}' },
  { path: 'color.surface-2', type: 'color', value: '{semantic.background.secondary}' },
  { path: 'color.surface-3', type: 'color', value: '{semantic.background.raised}' },
  { path: 'color.border', type: 'color', value: '{semantic.border.default}' },
  { path: 'color.text', type: 'color', value: '{semantic.text.primary}' },
  { path: 'color.text-muted', type: 'color', value: '{semantic.text.secondary}' },
  { path: 'color.primary', type: 'color', value: '{semantic.interactive.default}' },
  { path: 'color.primary-strong', type: 'color', value: '{semantic.interactive.hover}' },
  { path: 'color.on-primary', type: 'color', value: '{semantic.text.inverse}' },
  { path: 'color.accent', type: 'color', value: '{semantic.accent.default}' },
  { path: 'color.accent-ink', type: 'color', value: '{semantic.accent.ink}' },
  { path: 'color.success', type: 'color', value: '{semantic.status.positive}' },
  { path: 'color.danger', type: 'color', value: '{semantic.status.negative}' },
  { path: 'color.warning', type: 'color', value: '{semantic.status.warning}' },
  { path: 'color.focus-ring', type: 'color', value: '{semantic.border.focus}' },
]);
