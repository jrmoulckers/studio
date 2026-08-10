// @jrm/tokens — Style Dictionary v5 build.
//
// Produces FOUR framework-agnostic output families per theme (default), each covering
// light / dark / dark-oled / high-contrast color modes:
//   (a) CSS custom properties  → build/css/default/*.css
//   (b) a Tailwind preset object → build/tailwind/default.cjs
//   (c) typed JS/TS token objects → build/js/default/*.{js,d.ts}
//   (d) native value holders → build/native/{compose,swift}/*
//
// Model: primitive → semantic → component (DTCG $value/$type + {ref} aliases).
// Light is the CSS :root default; dark & high-contrast are [data-theme] overrides.
// Dark is the canonical narrative mode (the app boots data-theme="dark").

import StyleDictionary from 'style-dictionary';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';

import { NATIVE_MODES, renderCompose, renderSwift } from './native.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

/** Fully-resolved token tree per mode, captured during the JS build and reused by
 *  the native renderers so every platform shares one resolution pass. */
const resolvedTrees = {};

const toGlob = (p) => p.replace(/\\/g, '/');
const norm = (p) => (p || '').replace(/\\/g, '/');

/**
 * Join token path segments into a CSS custom-property name.
 *
 * Token keys are authored camelCase where a name has two words (`positiveSubtle`)
 * so the JS/TS entry points stay dot-accessible. CSS custom properties are
 * kebab-case by convention, so each segment is split on the camel hump:
 * `['semantic','status','positiveSubtle']` → `semantic-status-positive-subtle`.
 * Every emitter must go through this, otherwise the Tailwind preset and the
 * preference-remap blocks reference `var(--…)` names the stylesheet never declares.
 */
const cssVarSegments = (path) =>
  path.map((segment) => segment.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()).join('-');

const THEME = 'default'; // studio-wide provisional theme (values seeded from score-king)
const themeDir = toGlob(join(root, 'tokens', 'themes', THEME));

// ---------------------------------------------------------------------------
// Source sets
// ---------------------------------------------------------------------------

const primitives = toGlob(join(root, 'tokens', 'primitive', '*.json'));
const colorPrimitive = `${themeDir}/color.primitive.json`;
const colorAliasFile = `${themeDir}/color.alias.json`;
const semLight = `${themeDir}/color.semantic.light.json`;
const semDark = `${themeDir}/color.semantic.dark.json`;
const semDarkOled = `${themeDir}/color.semantic.dark-oled.json`;
const semHighContrast = `${themeDir}/color.semantic.high-contrast.json`;
const semHighContrastDark = `${themeDir}/color.semantic.high-contrast-dark.json`;

/** Theme-agnostic semantic tokens (typography + motion + cognitive purposes,
 *  plus the structural layer/state/elevation purposes). Elevation references the
 *  theme-scoped shadow.* aliases, so it resolves per mode without a per-theme file. */
const sharedSemantic = [
  toGlob(join(root, 'tokens', 'semantic', 'typography.json')),
  toGlob(join(root, 'tokens', 'semantic', 'motion.json')),
  toGlob(join(root, 'tokens', 'semantic', 'cognitive.json')),
  toGlob(join(root, 'tokens', 'semantic', 'layer.json')),
  toGlob(join(root, 'tokens', 'semantic', 'state.json')),
  toGlob(join(root, 'tokens', 'semantic', 'elevation.json')),
];

const components = toGlob(join(root, 'tokens', 'component', '*.json'));

const sourceFor = (semanticColorFile) => [
  primitives,
  colorPrimitive,
  semanticColorFile,
  ...sharedSemantic,
  components,
];

const cssBuildPath = toGlob(join(root, 'build', 'css', THEME)) + '/';
const jsBuildPath = toGlob(join(root, 'build', 'js', THEME)) + '/';
const tailwindBuildPath = toGlob(join(root, 'build', 'tailwind')) + '/';

// ---------------------------------------------------------------------------
// Custom transforms & groups (values emitted verbatim — no rem/color rewriting)
// ---------------------------------------------------------------------------

StyleDictionary.registerTransform({
  name: 'jrm/fontFamily/css',
  type: 'value',
  transitive: true,
  filter: (token) => token.$type === 'fontFamily',
  transform: (token) => {
    const v = token.$value ?? token.value;
    return Array.isArray(v) ? v.join(', ') : v;
  },
});

// CSS: kebab names + font-family join; every other value stays exactly as authored.
StyleDictionary.registerTransformGroup({
  name: 'jrm/css',
  transforms: ['attribute/cti', 'name/kebab', 'jrm/fontFamily/css'],
});

// JS: unique kebab names (silences name-collision detection) — values are NOT
// rewritten, and the JS/Tailwind formats key off token.path, so output is unaffected.
StyleDictionary.registerTransformGroup({
  name: 'jrm/js',
  transforms: ['attribute/cti', 'name/kebab'],
});

// ---------------------------------------------------------------------------
// Custom formats: typed JS module + .d.ts, and the Tailwind preset object
// ---------------------------------------------------------------------------

const AUTOGEN = '// Auto-generated by Style Dictionary. Do not edit by hand.';

/** Rebuild the nested token tree (by path) with fully-resolved values. */
function buildTree(allTokens) {
  const tree = {};
  for (const token of allTokens) {
    const value = token.$value ?? token.value;
    const path = token.path;
    let node = tree;
    for (let i = 0; i < path.length - 1; i += 1) {
      node[path[i]] ??= {};
      node = node[path[i]];
    }
    node[path[path.length - 1]] = value;
  }
  return tree;
}

/** Emit a precise `as const`-style literal type for the token tree. */
function dtsType(node) {
  if (Array.isArray(node)) {
    return `readonly [${node.map((v) => JSON.stringify(v)).join(', ')}]`;
  }
  if (node && typeof node === 'object') {
    const entries = Object.entries(node).map(
      ([k, v]) => `readonly ${JSON.stringify(k)}: ${dtsType(v)}`,
    );
    return `{ ${entries.join('; ')} }`;
  }
  return JSON.stringify(node);
}

StyleDictionary.registerFormat({
  name: 'jrm/js-module',
  format: ({ dictionary, file }) => {
    const tree = buildTree(dictionary.allTokens);
    // Capture the fully-resolved tree so the native renderers reuse this single
    // resolution pass instead of re-resolving references themselves. That is what
    // guarantees the Compose/SwiftUI output can never disagree with the CSS and JS.
    const mode = /^tokens\.(.+)\.js$/.exec(file.destination)?.[1];
    if (mode) resolvedTrees[mode] = tree;
    return `${AUTOGEN}\nexport const tokens = ${JSON.stringify(tree, null, 2)};\nexport default tokens;\n`;
  },
});

StyleDictionary.registerFormat({
  name: 'jrm/js-dts',
  format: ({ dictionary }) => {
    const tree = buildTree(dictionary.allTokens);
    return `${AUTOGEN}\nexport declare const tokens: ${dtsType(tree)};\nexport default tokens;\n`;
  },
});

/**
 * A complete, drop-in Tailwind preset whose token values are `var(--…)` references,
 * so a runtime theme/mode swap (changing `data-theme`) re-flows every utility with
 * no rebuild.
 *
 * Exposes three color families:
 *   • flat back-compat keys (from color.alias.json) — `background`, `foreground`,
 *     `muted`, `primary`, `accent`, `danger`, … → `var(--color-*)`.
 *   • the full semantic taxonomy, nested under `semantic.*` (e.g.
 *     `bg-semantic-background-primary`) → `var(--semantic-*)`.
 *   • `player.*` and `chart.*` (incl. `chart.hc.*`) primitives.
 *
 * It also carries the shared shell (dark-mode strategy, container, radius aliases,
 * ring width, safe-area spacing, animations). The shell lives HERE rather than in
 * @jrm/tailwind-preset because consumers receive `dist/` as a copied directory, not
 * an installed package — `require('@jrm/tokens/tailwind')` cannot resolve for them.
 * Emitting the shell into the generated file is what makes the vendored artifact
 * self-sufficient. @jrm/tailwind-preset re-exports this and only adds the plugin,
 * so there is exactly one definition of the shell.
 */
StyleDictionary.registerFormat({
  name: 'jrm/tailwind-preset',
  format: ({ dictionary }) => {
    const varRef = (path) => `var(--${cssVarSegments(path)})`;
    // Flat-alias → Tailwind-ergonomic key names (mirrors the legacy preset).
    const colorAlias = {
      text: 'foreground',
      'text-muted': 'muted',
      bg: 'background',
      'focus-ring': 'ring',
      'on-primary': 'primary-foreground',
    };

    const colors = {};
    const spacing = {};
    const borderRadius = {};
    const boxShadow = {};
    const fontSize = {};
    const fontFamily = {};
    const zIndex = {};
    const minHeight = {};
    const minWidth = {};
    const opacity = {};

    const setDeep = (root, keys, value) => {
      let node = root;
      for (let i = 0; i < keys.length - 1; i += 1) {
        node[keys[i]] ??= {};
        node = node[keys[i]];
      }
      node[keys[keys.length - 1]] = value;
    };

    for (const token of dictionary.allTokens) {
      const [group, ...rest] = token.path;
      const file = norm(token.filePath);

      if (group === 'color') {
        if (rest[0] === 'player') {
          colors.player ??= {};
          colors.player[rest[1]] = varRef(token.path);
        } else if (rest[0] === 'chart') {
          setDeep(colors, ['chart', ...rest.slice(1)], varRef(token.path));
        } else if (file.endsWith('color.alias.json')) {
          const key = rest.join('-');
          colors[colorAlias[key] ?? key] = varRef(token.path);
        }
        continue;
      }
      if (group === 'semantic' && file.endsWith('color.semantic.light.json')) {
        setDeep(colors, ['semantic', ...rest], varRef(token.path));
        continue;
      }
      if (group === 'radius') {
        borderRadius[rest.join('-')] = varRef(token.path);
        continue;
      }
      if (group === 'spacing') {
        spacing[rest.join('-')] = varRef(token.path);
        continue;
      }
      if (group === 'shadow' && file.endsWith('color.semantic.light.json')) {
        boxShadow[rest.join('-')] = varRef(token.path);
        continue;
      }
      if (group === 'font' && rest[0] === 'size') {
        fontSize[rest[1]] = varRef(token.path);
        continue;
      }
      if (group === 'font' && rest[0] === 'family') {
        fontFamily[rest[1]] = [varRef(token.path)];
        continue;
      }
      // Structural tokens (added alongside the layer/state/elevation/focus/target
      // categories) — surfaced as first-class Tailwind scales so consumers reach
      // them through utilities instead of re-declaring raw var() strings.
      if (group === 'layer') {
        zIndex[rest.join('-')] = varRef(token.path);
        continue;
      }
      if (group === 'elevation') {
        boxShadow[rest.join('-')] = varRef(token.path);
        continue;
      }
      if (group === 'opacity') {
        opacity[rest.join('-')] = varRef(token.path);
        continue;
      }
      if (group === 'target') {
        minHeight[rest.join('-')] = varRef(token.path);
        minWidth[rest.join('-')] = varRef(token.path);
        continue;
      }
    }

    // Safe-area insets. Both jrm-recipes and score-king implemented these
    // independently for PWA/notch support, so they belong in the kernel preset.
    const safeArea = {
      'safe-t': 'env(safe-area-inset-top)',
      'safe-r': 'env(safe-area-inset-right)',
      'safe-b': 'env(safe-area-inset-bottom)',
      'safe-l': 'env(safe-area-inset-left)',
    };
    Object.assign(spacing, safeArea);

    const preset = {
      darkMode: ['class', '[data-theme="dark"]'],
      theme: {
        container: {
          center: true,
          padding: '1rem',
          // Matches the score-king content-max token.
          screens: { '2xl': '760px' },
        },
        extend: {
          colors,
          spacing,
          borderRadius: {
            ...borderRadius,
            DEFAULT: 'var(--radius-md)',
            full: 'var(--radius-pill)',
          },
          boxShadow,
          fontSize,
          fontFamily,
          zIndex,
          minHeight,
          minWidth,
          opacity,
          // Focus ring width is a token, so high-contrast and cognitive modes
          // widen every ring by redefining one variable.
          ringWidth: { DEFAULT: 'var(--focus-ring-width)' },
          ringOffsetWidth: { DEFAULT: 'var(--focus-ring-offset)' },
          keyframes: {
            'fade-in': {
              from: { opacity: '0' },
              to: { opacity: '1' },
            },
            'pop-in': {
              '0%': { opacity: '0', transform: 'scale(0.96)' },
              '100%': { opacity: '1', transform: 'scale(1)' },
            },
          },
          animation: {
            'fade-in': 'fade-in 0.2s ease-out',
            'pop-in': 'pop-in 0.18s ease-out',
          },
        },
      },
    };
    return `${AUTOGEN}\nmodule.exports = ${JSON.stringify(preset, null, 2)};\n`;
  },
});

// ---------------------------------------------------------------------------
// Platform builders
// ---------------------------------------------------------------------------

const jsFiles = (mode) => ({
  transformGroup: 'jrm/js',
  buildPath: jsBuildPath,
  files: [
    { destination: `tokens.${mode}.js`, format: 'jrm/js-module' },
    { destination: `tokens.${mode}.d.ts`, format: 'jrm/js-dts' },
  ],
});

/** Root (:root) build for the light/default mode — every tier, references kept.
 *  Includes the flat back-compat alias file so the legacy `--color-*` names are
 *  declared once in :root and re-flow across every mode via the `--semantic-*` vars. */
const lightSd = new StyleDictionary({
  source: [...sourceFor(semLight), colorAliasFile],
  usesDtcg: true,
  platforms: {
    css: {
      transformGroup: 'jrm/css',
      buildPath: cssBuildPath,
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          options: { outputReferences: true },
        },
      ],
    },
    js: jsFiles('light'),
    tailwind: {
      transformGroup: 'jrm/js',
      buildPath: tailwindBuildPath,
      files: [{ destination: `${THEME}.cjs`, format: 'jrm/tailwind-preset' }],
    },
  },
});

/** Theme-override build: emits ONLY that mode's semantic color+shadow overrides. */
const overrideSd = (mode, semanticColorFile, selector) =>
  new StyleDictionary({
    source: sourceFor(semanticColorFile),
    usesDtcg: true,
    platforms: {
      css: {
        transformGroup: 'jrm/css',
        buildPath: cssBuildPath,
        files: [
          {
            destination: `tokens-${mode}.css`,
            format: 'css/variables',
            options: { outputReferences: false, selector },
            filter: (token) => norm(token.filePath).endsWith(`color.semantic.${mode}.json`),
          },
        ],
      },
      js: jsFiles(mode),
    },
  });

const darkSd = overrideSd('dark', semDark, '[data-theme="dark"]');
const darkOledSd = overrideSd('dark-oled', semDarkOled, '[data-theme="dark-oled"]');
const highContrastSd = overrideSd('high-contrast', semHighContrast, '[data-theme="high-contrast"]');
const highContrastDarkSd = overrideSd(
  'high-contrast-dark',
  semHighContrastDark,
  '[data-theme="high-contrast-dark"]',
);

// ---------------------------------------------------------------------------
// Barrel files (not token-derived — stable wiring around the generated output)
// ---------------------------------------------------------------------------

/** `{color.ink.midnight}` → `--color-ink-midnight` (a var() target). */
const refToVar = (ref) => '--' + cssVarSegments(String(ref).replace(/[{}]/g, '').trim().split('.'));

/**
 * Turn a semantic-mode JSON file into `--semantic-*: var(--<primitive>)` remap
 * lines. Used to port finance's consumer @media auto-switching into the package
 * output so consumers get preference-driven theming for free.
 */
function cssRemapLines(semanticFile, indent = '    ') {
  const json = JSON.parse(readFileSync(semanticFile, 'utf8'));
  const lines = [];
  const walk = (node, path) => {
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('$')) continue;
      if (v && typeof v === 'object' && '$value' in v) {
        const name = '--' + cssVarSegments([...path, k]);
        const raw = v.$value;
        const val = typeof raw === 'string' && raw.startsWith('{') ? `var(${refToVar(raw)})` : raw;
        lines.push(`${indent}${name}: ${val};`);
      } else if (v && typeof v === 'object') {
        walk(v, [...path, k]);
      }
    }
  };
  if (json.semantic) walk(json.semantic, ['semantic']);
  if (json.shadow) walk(json.shadow, ['shadow']);
  return lines.join('\n');
}

/** Swap the generic chart ramp for its CVD-safe high-contrast variants. */
const chartHcRemap = (indent = '    ') =>
  [1, 2, 3, 4, 5, 6]
    .map((n) => `${indent}--color-chart-${n}: var(--color-chart-hc-${n});`)
    .join('\n');

function writeBarrels() {
  mkdirSync(cssBuildPath, { recursive: true });
  mkdirSync(jsBuildPath.replace(`${THEME}/`, ''), { recursive: true });

  const darkRemap = cssRemapLines(semDark);
  const highContrastRemap = cssRemapLines(semHighContrast);
  const highContrastDarkRemap = cssRemapLines(semHighContrastDark);

  // CSS barrel: import every mode, then port finance's preference auto-switching.
  // Each @media block is guarded with :not([data-theme]) so an explicit theme wins.
  const indexCss = `${AUTOGEN.replace('//', '/*')} */
@import './tokens.css';
@import './tokens-dark.css';
@import './tokens-dark-oled.css';
@import './tokens-high-contrast.css';
@import './tokens-high-contrast-dark.css';

/* Chart series swap to CVD-safe high-contrast variants under either HC theme. */
[data-theme="high-contrast"],
[data-theme="high-contrast-dark"] {
${chartHcRemap()}
}

/*
 * System preference: auto-apply the dark palette when the OS prefers dark and
 * the consumer has not pinned an explicit [data-theme].
 */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
${darkRemap}
  }
}

/*
 * prefers-contrast: more — promote the full high-contrast palette (WCAG 1.4.3 /
 * 1.4.6 / 1.4.11), including the high-contrast chart ramp.
 */
@media (prefers-contrast: more) {
  :root:not([data-theme]) {
${highContrastRemap}
${chartHcRemap()}
  }
}

/*
 * Dark + more contrast: promote the full high-contrast-dark palette. This block
 * used to be a hand-maintained list of a dozen overrides that existed nowhere
 * else in the system — invisible to JS and native consumers, and impossible for
 * a user to select explicitly. It is now generated from the same theme file that
 * backs [data-theme="high-contrast-dark"], so the preference-driven path and the
 * explicit path can no longer drift apart.
 */
@media (prefers-color-scheme: dark) and (prefers-contrast: more) {
  :root:not([data-theme]) {
${highContrastDarkRemap}
${chartHcRemap()}
  }
}

/*
 * Reduced motion: collapse the underlying motion durations to instant.
 */
@media (prefers-reduced-motion: reduce) {
  :root {
    /* Deliberately 1ms, not 0ms: a zero-duration transition or animation never
       fires transitionend/animationend, so cleanup or focus hand-off that awaits
       those events would hang for reduced-motion users. Matches --duration-reduced. */
    --motion-press-duration: 1ms;
    --motion-state-duration: 1ms;
    --motion-tile-duration: 1ms;
  }
}

/*
 * Cognitive-accessibility mode — activated by [data-a11y-cognitive="true"] on the
 * root element (finance's mechanism). Steps up the type scale, relaxes leading,
 * and disables motion (a superset of prefers-reduced-motion).
 */
[data-a11y-cognitive="true"] {
  --text-display-size: var(--cognitive-type-display-size);
  --text-display-line-height: var(--cognitive-type-display-line-height);
  --text-title-size: var(--cognitive-type-title-size);
  --text-title-line-height: var(--cognitive-type-title-line-height);
  --text-body-size: var(--cognitive-type-body-size);
  --text-body-line-height: var(--cognitive-type-body-line-height);
  --text-label-size: var(--cognitive-type-label-size);
  --text-label-line-height: var(--cognitive-type-label-line-height);
  --text-overline-size: var(--cognitive-type-overline-size);
  --text-overline-line-height: var(--cognitive-type-overline-line-height);

  /* Matches --duration-reduced: an instant-but-nonzero duration still fires
     transitionend/animationend, so listeners that await them never hang. */
  --motion-press-duration: 1ms;
  --motion-state-duration: 1ms;
  --motion-tile-duration: 1ms;
}
`;
  writeFileSync(join(root, 'build', 'css', THEME, 'index.css'), indexCss);

  // JS barrel: default = light (matches :root); named exports for every mode.
  const jsIndexDir = join(root, 'build', 'js');
  const indexJs = `${AUTOGEN}
import light from './${THEME}/tokens.light.js';
import dark from './${THEME}/tokens.dark.js';
import darkOled from './${THEME}/tokens.dark-oled.js';
import highContrast from './${THEME}/tokens.high-contrast.js';
import highContrastDark from './${THEME}/tokens.high-contrast-dark.js';

export const tokens = light;
export const tokensLight = light;
export const tokensDark = dark;
export const tokensDarkOled = darkOled;
export const tokensHighContrast = highContrast;
export const tokensHighContrastDark = highContrastDark;
export const themes = {
  light,
  dark,
  'dark-oled': darkOled,
  'high-contrast': highContrast,
  'high-contrast-dark': highContrastDark,
};

export default tokens;
`;
  writeFileSync(join(jsIndexDir, 'index.js'), indexJs);

  const indexDts = `${AUTOGEN}
import light from './${THEME}/tokens.light.js';
import dark from './${THEME}/tokens.dark.js';
import darkOled from './${THEME}/tokens.dark-oled.js';
import highContrast from './${THEME}/tokens.high-contrast.js';
import highContrastDark from './${THEME}/tokens.high-contrast-dark.js';

export declare const tokens: typeof light;
export declare const tokensLight: typeof light;
export declare const tokensDark: typeof dark;
export declare const tokensDarkOled: typeof darkOled;
export declare const tokensHighContrast: typeof highContrast;
export declare const tokensHighContrastDark: typeof highContrastDark;
export declare const themes: {
  readonly light: typeof light;
  readonly dark: typeof dark;
  readonly 'dark-oled': typeof darkOled;
  readonly 'high-contrast': typeof highContrast;
  readonly 'high-contrast-dark': typeof highContrastDark;
};

export default tokens;
`;
  writeFileSync(join(jsIndexDir, 'index.d.ts'), indexDts);
}

/**
 * Render the native value holders. Runs after every mode's JS build so
 * `resolvedTrees` is complete; the missing-mode check keeps a future build-order
 * change from silently emitting a partial theme set.
 */
function writeNative() {
  const missing = NATIVE_MODES.filter((mode) => !resolvedTrees[mode]);
  if (missing.length > 0) {
    throw new Error(`Native output is missing resolved tokens for: ${missing.join(', ')}.`);
  }

  const composeDir = join(root, 'build', 'native', 'compose');
  const swiftDir = join(root, 'build', 'native', 'swift');
  mkdirSync(composeDir, { recursive: true });
  mkdirSync(swiftDir, { recursive: true });
  writeFileSync(join(composeDir, 'JrmTokens.kt'), renderCompose(resolvedTrees));
  writeFileSync(join(swiftDir, 'JRMTokens.swift'), renderSwift(resolvedTrees));
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

try {
  await lightSd.buildAllPlatforms();
  await darkSd.buildAllPlatforms();
  await darkOledSd.buildAllPlatforms();
  await highContrastSd.buildAllPlatforms();
  await highContrastDarkSd.buildAllPlatforms();
  writeBarrels();
  writeNative();
  console.log(
    `✅ @jrm/tokens built (${THEME}: light + dark + dark-oled + high-contrast + high-contrast-dark → css, tailwind, js, native).`,
  );
} catch (err) {
  console.error('Build failed:', err);
  process.exit(1);
}
