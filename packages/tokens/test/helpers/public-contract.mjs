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
