import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { TextDecoder } from 'node:util';

const MODES = ['light', 'dark', 'dark-oled', 'high-contrast', 'high-contrast-dark'];

export const DIST_OUTPUTS = Object.freeze([
  'css/default/a11y.css',
  'css/default/index.css',
  'css/default/tokens-dark-oled.css',
  'css/default/tokens-dark.css',
  'css/default/tokens-high-contrast-dark.css',
  'css/default/tokens-high-contrast.css',
  'css/default/tokens.css',
  'native/compose/JrmTokens.kt',
  'native/swift/JRMTokens.swift',
  'tailwind/default.cjs',
  ...MODES.flatMap((mode) => [`js/default/tokens.${mode}.d.ts`, `js/default/tokens.${mode}.js`]),
  'js/index.d.ts',
  'js/index.js',
]);

/**
 * Files written by dist assembly itself rather than copied from `build/`.
 *
 * `build/` is a Style Dictionary output directory and must stay exactly the declared
 * outputs, so these are asserted separately from DIST_OUTPUTS rather than added to it.
 */
export const DIST_GENERATED = Object.freeze(['README.md']);

/** The complete committed distribution: copied outputs plus generated ones. */
export const DIST_FILES = Object.freeze([...DIST_OUTPUTS, ...DIST_GENERATED]);

/**
 * One line per distributed file, rendered into `dist/README.md`.
 *
 * Consumers vendor `dist/` as a plain copied directory, so the `exports` map in
 * package.json — which points at `build/` — never reaches them. Without this, the
 * vendored copy is 22 unlabelled generated files, and a consumer cannot tell that
 * `tokens.css` carries the structural layer or that `a11y.css` is not imported for
 * them. That ambiguity is not theoretical: it is why one product concluded the
 * shared package did not own spacing, radii, type, elevation or motion, and kept a
 * duplicate structural layer alive alongside this one.
 *
 * Keyed by the same paths DIST_OUTPUTS declares. An output with no entry here fails
 * assembly, so a new file cannot ship unlabelled.
 */
const FILE_DESCRIPTIONS = Object.freeze({
  'css/default/index.css':
    '**Start here.** Aggregate entry point: imports the structural sheet and all five themes, then adds `prefers-color-scheme` / `prefers-contrast` / `prefers-reduced-motion` auto-switching, the CVD-safe chart swap under both high-contrast themes, and the `[data-a11y-cognitive="true"]` block.',
  'css/default/tokens.css':
    'The **structural layer and the light theme**, in one sheet: spacing, radius, font, elevation, shadow, motion, layer, breakpoint and every component set, plus the light `--semantic-*` colors. Pulled in by `index.css`; import directly only if you deliberately want light with no theme switching.',
  'css/default/tokens-dark.css':
    'Dark theme `--semantic-*` overrides, under `[data-theme="dark"]`.',
  'css/default/tokens-dark-oled.css':
    'OLED dark theme `--semantic-*` overrides, under `[data-theme="dark-oled"]`.',
  'css/default/tokens-high-contrast.css':
    'Light high-contrast theme `--semantic-*` overrides, under `[data-theme="high-contrast"]`.',
  'css/default/tokens-high-contrast-dark.css':
    'Dark high-contrast theme `--semantic-*` overrides, under `[data-theme="high-contrast-dark"]`.',
  'css/default/a11y.css':
    '**Not imported by `index.css`** — import it yourself, after. Token-driven focus ring, touch-target floor and `.jrm-*` utilities. Utilities are prefixed because Tailwind already defines a bare `.sr-only`.',
  'js/index.js': 'Typed token objects for every theme, as ESM.',
  'js/index.d.ts': 'Type declarations for `js/index.js`.',
  'tailwind/default.cjs': 'Tailwind preset mapping the tokens onto Tailwind theme keys.',
  'native/compose/JrmTokens.kt': 'Jetpack Compose token object for Android/KMP consumers.',
  'native/swift/JRMTokens.swift': 'Swift token enum for iOS/macOS consumers.',
});

const MODE_FILE_DESCRIPTION = Object.freeze({
  js: (mode) => `Typed token object for the \`${mode}\` theme.`,
  dts: (mode) => `Type declarations for the \`${mode}\` theme object.`,
});

function describe(relativePath) {
  const known = FILE_DESCRIPTIONS[relativePath];
  if (known) return known;

  const mode = MODES.find(
    (candidate) =>
      relativePath === `js/default/tokens.${candidate}.js` ||
      relativePath === `js/default/tokens.${candidate}.d.ts`,
  );
  if (mode) {
    return relativePath.endsWith('.d.ts')
      ? MODE_FILE_DESCRIPTION.dts(mode)
      : MODE_FILE_DESCRIPTION.js(mode);
  }

  return null;
}

/**
 * Render `dist/README.md`.
 *
 * Pure and deterministic: derived only from DIST_OUTPUTS and the static text above,
 * with no timestamp, version or git state, because the distribution is asserted to
 * regenerate byte-for-byte.
 */
export function renderDistReadme(outputs = DIST_OUTPUTS) {
  const undescribed = outputs.filter((path) => describe(path) === null);
  if (undescribed.length > 0) {
    throw new Error(
      `Distribution outputs have no README description: ${undescribed.join(', ')}. ` +
        'Add one to FILE_DESCRIPTIONS so the vendored copy does not ship an unlabelled file.',
    );
  }

  const rows = [...outputs]
    .sort((a, b) => a.localeCompare(b))
    .map((path) => `| \`${path}\` | ${describe(path)} |`);

  return [
    '# @jrm/tokens — vendored distribution',
    '',
    'Generated by JRM Studio. **Do not edit anything in this directory**; it is replaced',
    'wholesale on every sync. Change the tokens in',
    '[`jrmoulckers/studio`](https://github.com/jrmoulckers/studio) instead.',
    '',
    'This directory is copied into consumers rather than installed from a registry, so the',
    '`exports` map in the package manifest does not reach you. This file is that map.',
    '',
    '## Web quick start',
    '',
    'Paths are relative to wherever this directory is vendored — the location differs',
    'per product, so adjust the prefix and keep the two file names.',
    '',
    '```css',
    "@import '.../css/default/index.css';",
    "@import '.../css/default/a11y.css';",
    '```',
    '',
    'One import for tokens, one for the accessibility base. `index.css` already brings in',
    'the structural layer and all five themes; `a11y.css` is deliberately separate so a',
    'consumer can opt out of the utility classes.',
    '',
    '## What this package owns',
    '',
    'The colors **and** the structure. `tokens.css` defines spacing, radius, font, elevation,',
    'shadow, motion, layer, breakpoint and component tokens alongside the semantic colors, so',
    'a product does not need a second token package to supply the structural layer.',
    '',
    'Map any existing local tokens onto these **by value, not by name**. Names that look',
    'equivalent are not guaranteed to be: a t-shirt scale here may be offset by a step from',
    "another package's, and a name-based rename fails silently because both sides resolve.",
    '',
    '## Files',
    '',
    '| File | Purpose |',
    '| --- | --- |',
    ...rows,
    '',
  ].join('\n');
}

const toNativePath = (root, relativePath) => join(root, ...relativePath.split('/'));

function listFiles(root) {
  const files = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else files.push(path);
    }
  };

  if (statSync(root, { throwIfNoEntry: false })?.isDirectory()) walk(root);
  return files;
}

export function decodeUtf8Text(bytes, relativePath) {
  if (bytes.includes(0)) {
    throw new Error(`Distribution output "${relativePath}" contains a NUL byte.`);
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`Distribution output "${relativePath}" is not valid UTF-8.`);
  }
}

export const normalizeLf = (text) => text.replace(/\r\n?/g, '\n');

export function readFileTree(root) {
  return new Map(
    listFiles(root).map((path) => [relative(root, path).split(sep).join('/'), readFileSync(path)]),
  );
}

function assertDeclaredTree(tree, expectedPaths, label) {
  const actual = [...tree.keys()].sort();
  const expected = [...expectedPaths].sort();
  const missing = expected.filter((path) => !tree.has(path));
  const unexpected = actual.filter((path) => !expectedPaths.includes(path));

  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      [
        `${label} file set does not match the declared text outputs.`,
        missing.length > 0 ? `Missing: ${missing.join(', ')}` : '',
        unexpected.length > 0 ? `Unexpected: ${unexpected.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join(' '),
    );
  }

  for (const [path, bytes] of tree) {
    const text = decodeUtf8Text(bytes, path);
    if (text.includes('\r')) {
      throw new Error(`Distribution output "${path}" is not LF-normalized.`);
    }
  }
}

/**
 * Guard the Style Dictionary output tree, which holds only the copied outputs.
 *
 * Kept separate from the dist guard rather than parameterized: the two sets differ by
 * the generated files, and a default argument would let a call site silently assert
 * the wrong one.
 */
export function assertDeclaredBuild(tree) {
  assertDeclaredTree(tree, DIST_OUTPUTS, 'Build');
}

/** Guard the committed distribution tree, which also holds the generated files. */
export function assertDeclaredDistribution(tree) {
  assertDeclaredTree(tree, DIST_FILES, 'Distribution');
}

export function assertFileTreesEqual(expected, actual) {
  const expectedPaths = [...expected.keys()].sort();
  const actualPaths = [...actual.keys()].sort();
  if (
    expectedPaths.length !== actualPaths.length ||
    expectedPaths.some((path, index) => path !== actualPaths[index])
  ) {
    throw new Error('Generated distribution file set is not deterministic.');
  }

  for (const path of expectedPaths) {
    if (!expected.get(path).equals(actual.get(path))) {
      throw new Error(`Generated distribution content changed for "${path}".`);
    }
  }
}

export function assembleDist({ buildDir, distDir, log = console.log }) {
  if (!statSync(buildDir, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error('Missing build/ output; run the token build first.');
  }

  rmSync(distDir, { recursive: true, force: true });

  for (const relativePath of DIST_OUTPUTS) {
    const source = toNativePath(buildDir, relativePath);
    if (!statSync(source, { throwIfNoEntry: false })?.isFile()) {
      throw new Error(`Declared build output "${relativePath}" is missing.`);
    }

    const text = decodeUtf8Text(readFileSync(source), relativePath);
    const destination = toNativePath(distDir, relativePath);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, normalizeLf(text), 'utf8');
    log(`✔︎ dist/${relativePath}`);
  }

  for (const relativePath of DIST_GENERATED) {
    const destination = toNativePath(distDir, relativePath);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, normalizeLf(renderDistReadme()), 'utf8');
    log(`✔︎ dist/${relativePath} (generated)`);
  }

  const tree = readFileTree(distDir);
  assertDeclaredDistribution(tree);
  log(`✅ @jrm/tokens dist assembled (${tree.size} files → packages/tokens/dist).`);
}
