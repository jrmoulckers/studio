import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { TextDecoder } from 'node:util';

const MODES = ['light', 'dark', 'dark-oled', 'high-contrast'];

export const DIST_OUTPUTS = Object.freeze([
  'css/default/index.css',
  'css/default/tokens-dark-oled.css',
  'css/default/tokens-dark.css',
  'css/default/tokens-high-contrast.css',
  'css/default/tokens.css',
  'tailwind/default.cjs',
  ...MODES.flatMap((mode) => [`js/default/tokens.${mode}.d.ts`, `js/default/tokens.${mode}.js`]),
  'js/index.d.ts',
  'js/index.js',
]);

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

export function assertDeclaredDistribution(tree) {
  const actual = [...tree.keys()].sort();
  const expected = [...DIST_OUTPUTS].sort();
  const missing = expected.filter((path) => !tree.has(path));
  const unexpected = actual.filter((path) => !DIST_OUTPUTS.includes(path));

  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      [
        'Distribution file set does not match the declared text outputs.',
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

  const tree = readFileTree(distDir);
  assertDeclaredDistribution(tree);
  log(`✅ @jrm/tokens dist assembled (${tree.size} files → packages/tokens/dist).`);
}
