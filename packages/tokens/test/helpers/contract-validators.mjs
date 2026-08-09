import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { TextDecoder } from 'node:util';

const TOKEN_METADATA = new Set(['$description', '$deprecated', '$extensions', '$type']);
const REFERENCE_PATTERN = /\{([^{}]+)\}/g;

const fail = (message) => {
  throw new Error(message);
};

const objectEntries = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value) : [];

export function parseTokenJson(text, file) {
  let document;
  try {
    document = JSON.parse(text);
  } catch (error) {
    fail(`${file} is not valid JSON: ${error.message}`);
  }
  return { file, document };
}

export function readTokenDocuments(root) {
  const files = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.json')) files.push(path);
    }
  };
  walk(root);

  return files.map((path) =>
    parseTokenJson(
      new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(path)),
      relative(root, path).split(sep).join('/'),
    ),
  );
}

export function tokenRecords({ file, document }) {
  const records = [];

  const walk = (node, path, inheritedType) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      fail(`${file}:${path.join('.')} must be a DTCG token or group object.`);
    }

    const hasValue = Object.hasOwn(node, '$value');
    const type = node.$type ?? inheritedType;
    for (const key of Object.keys(node).filter((key) => key.startsWith('$'))) {
      if (key !== '$value' && !TOKEN_METADATA.has(key)) {
        fail(`${file}:${path.join('.')} uses unsupported DTCG property "${key}".`);
      }
    }

    if (hasValue) {
      if (path.length === 0) fail(`${file} cannot use an un-named root token.`);
      if (typeof type !== 'string' || type.length === 0) {
        fail(`${file}:${path.join('.')} has no DTCG $type.`);
      }
      const childKeys = Object.keys(node).filter((key) => !key.startsWith('$'));
      if (childKeys.length > 0) {
        fail(`${file}:${path.join('.')} mixes a token value with child tokens.`);
      }
      records.push({ file, path, type, value: node.$value });
      return;
    }

    const children = Object.entries(node).filter(([key]) => !key.startsWith('$'));
    if (children.length === 0) fail(`${file}:${path.join('.')} is an empty DTCG group.`);
    for (const [key, child] of children) walk(child, [...path, key], type);
  };

  walk(document, [], undefined);
  return records;
}

export function validateDtcgDocuments(documents) {
  if (documents.length === 0) fail('No token documents were provided.');
  for (const document of documents) tokenRecords(document);
}

export function assertDocumentSet(documents, expectedFiles) {
  const actual = documents.map(({ file }) => file).sort();
  const expected = [...expectedFiles].sort();
  const missing = expected.filter((file) => !actual.includes(file));
  const unexpected = actual.filter((file) => !expected.includes(file));
  if (missing.length > 0 || unexpected.length > 0) {
    fail(
      [
        'Authored token document set differs from the contract.',
        `Missing: ${missing.join(', ') || 'none'}.`,
        `Unexpected: ${unexpected.join(', ') || 'none'}.`,
      ].join(' '),
    );
  }
}

export function assertTokenContract(source, expectedTokens) {
  const actual = new Map(
    tokenRecords(source).map(({ path, type, value }) => [path.join('.'), { type, value }]),
  );
  const expected = new Map(expectedTokens.map((token) => [token.path, token]));
  const missing = [...expected.keys()].filter((path) => !actual.has(path));
  const unexpected = [...actual.keys()].filter((path) => !expected.has(path));
  const mismatches = [...expected].flatMap(([path, contract]) => {
    const token = actual.get(path);
    if (!token) return [];
    if (token.type !== contract.type) return [`${path} has type ${token.type}`];
    if (Object.hasOwn(contract, 'value') && token.value !== contract.value) {
      return [`${path} has value ${JSON.stringify(token.value)}`];
    }
    return [];
  });
  if (missing.length > 0 || unexpected.length > 0 || mismatches.length > 0) {
    fail(
      [
        `${source.file} differs from the explicit token contract.`,
        `Missing: ${missing.join(', ') || 'none'}.`,
        `Unexpected: ${unexpected.join(', ') || 'none'}.`,
        `Mismatches: ${mismatches.join(', ') || 'none'}.`,
      ].join(' '),
    );
  }
}

function referencesIn(value) {
  const references = [];
  const walk = (candidate) => {
    if (typeof candidate === 'string') {
      for (const match of candidate.matchAll(REFERENCE_PATTERN)) references.push(match[1]);
    } else if (Array.isArray(candidate)) {
      candidate.forEach(walk);
    } else {
      objectEntries(candidate).forEach(([, child]) => walk(child));
    }
  };
  walk(value);
  return references;
}

export function validateReferenceGraph(documents) {
  const records = documents.flatMap(tokenRecords);
  if (records.length === 0) fail('Token reference graph has no tokens.');
  const byPath = new Map();
  for (const record of records) {
    const path = record.path.join('.');
    if (byPath.has(path)) fail(`Duplicate token path "${path}" in one build source set.`);
    byPath.set(path, record);
  }

  const edges = new Map();
  for (const [path, record] of byPath) {
    const references = referencesIn(record.value);
    for (const reference of references) {
      if (!byPath.has(reference)) {
        fail(`${record.file}:${path} references missing token "${reference}".`);
      }
    }
    edges.set(path, references);
  }

  const state = new Map();
  const visit = (path, stack) => {
    if (state.get(path) === 'done') return;
    if (state.get(path) === 'visiting') {
      fail(`Token reference cycle: ${[...stack, path].join(' -> ')}`);
    }
    state.set(path, 'visiting');
    for (const reference of edges.get(path)) visit(reference, [...stack, path]);
    state.set(path, 'done');
  };
  for (const path of byPath.keys()) visit(path, []);
}

export function assertThemeParity(themes, requiredTokens) {
  if (themes.length === 0) fail('No themes were provided for parity validation.');
  for (const { document } of themes) assertTokenContract(document, requiredTokens);

  const [baseline, ...rest] = themes.map(({ name, document }) => ({
    name,
    tokens: new Map(tokenRecords(document).map(({ path, type }) => [path.join('.'), type])),
  }));

  for (const theme of rest) {
    const missing = [...baseline.tokens.keys()].filter((path) => !theme.tokens.has(path));
    const extra = [...theme.tokens.keys()].filter((path) => !baseline.tokens.has(path));
    const typeMismatches = [...baseline.tokens].flatMap(([path, type]) =>
      theme.tokens.has(path) && theme.tokens.get(path) !== type
        ? [`${path} (${type} != ${theme.tokens.get(path)})`]
        : [],
    );
    if (missing.length > 0 || extra.length > 0 || typeMismatches.length > 0) {
      fail(
        [
          `${theme.name} theme differs from ${baseline.name}.`,
          `Missing: ${missing.join(', ') || 'none'}.`,
          `Extra: ${extra.join(', ') || 'none'}.`,
          `Type mismatches: ${typeMismatches.join(', ') || 'none'}.`,
        ].join(' '),
      );
    }
  }
}

const hasPath = (root, path) => {
  let node = root;
  for (const part of path) {
    if (!node || typeof node !== 'object' || !Object.hasOwn(node, part)) return false;
    node = node[part];
  }
  return true;
};

export function assertJsContract(module, semanticPaths, aliasPaths) {
  const exports = [
    'default',
    'tokens',
    'tokensLight',
    'tokensDark',
    'tokensDarkOled',
    'tokensHighContrast',
    'themes',
  ];
  for (const name of exports) {
    if (!module[name]) fail(`JS entry point is missing export "${name}".`);
  }
  if (module.default !== module.tokens || module.tokens !== module.tokensLight) {
    fail('JS default, tokens, and tokensLight exports must share the light token object.');
  }

  const themes = {
    light: module.tokensLight,
    dark: module.tokensDark,
    'dark-oled': module.tokensDarkOled,
    'high-contrast': module.tokensHighContrast,
  };
  if (
    Object.keys(module.themes).sort().join(',') !== Object.keys(themes).sort().join(',') ||
    Object.entries(themes).some(([name, tokens]) => module.themes[name] !== tokens)
  ) {
    fail('JS themes export does not expose the four documented modes.');
  }
  for (const [name, tokens] of Object.entries(themes)) {
    for (const path of semanticPaths) {
      if (!hasPath(tokens, path)) fail(`JS ${name} tokens are missing "${path.join('.')}".`);
    }
  }
  for (const path of aliasPaths) {
    if (!hasPath(module.tokens, path))
      fail(`JS light tokens are missing alias "${path.join('.')}".`);
  }
}

const tailwindAliasName = (name) =>
  ({
    text: 'foreground',
    'text-muted': 'muted',
    bg: 'background',
    'focus-ring': 'ring',
    'on-primary': 'primary-foreground',
  })[name] ?? name;

export function assertTailwindContract(preset, semanticPaths, aliasPaths) {
  const colors = preset?.theme?.extend?.colors;
  if (!colors) fail('Tailwind entry point is missing theme.extend.colors.');

  for (const path of semanticPaths.filter(([group]) => group === 'semantic')) {
    const target = ['semantic', ...path.slice(1)];
    const expected = `var(--${path.join('-')})`;
    let value = colors;
    for (const part of target) value = value?.[part];
    if (value !== expected) fail(`Tailwind entry point is missing "${target.join('.')}".`);
  }
  for (const [, alias] of aliasPaths) {
    const name = tailwindAliasName(alias);
    if (colors[name] !== `var(--color-${alias})`) {
      fail(`Tailwind entry point is missing compatibility alias "${name}".`);
    }
  }
}

/**
 * The vendored artifact must be a *complete* Tailwind preset, not just token values.
 * Consumers receive `dist/` as a copied directory rather than an installed package,
 * so anything they would otherwise have to `require('@jrm/tailwind-preset')` for has
 * to be present in the generated file itself. Guarding the shell here is what keeps
 * "vendored" and "installed" from silently diverging.
 */
export function assertTailwindPresetShell(preset, shellContract) {
  if (!Array.isArray(preset?.darkMode) || preset.darkMode[0] !== 'class') {
    fail('Tailwind preset is missing the class-based darkMode strategy.');
  }
  if (preset.darkMode[1] !== '[data-theme="dark"]') {
    fail('Tailwind preset darkMode must also match the [data-theme="dark"] attribute.');
  }
  if (preset?.theme?.container?.center !== true) {
    fail('Tailwind preset is missing the centered container.');
  }

  const extend = preset?.theme?.extend;
  if (!extend) fail('Tailwind preset is missing theme.extend.');

  for (const [scale, key, expected] of shellContract) {
    if (extend?.[scale]?.[key] !== expected) {
      fail(`Tailwind preset is missing "${scale}.${key}" (expected ${expected}).`);
    }
  }

  for (const name of ['fade-in', 'pop-in']) {
    if (!extend.keyframes?.[name]) fail(`Tailwind preset is missing the "${name}" keyframes.`);
    if (!extend.animation?.[name]) fail(`Tailwind preset is missing the "${name}" animation.`);
  }
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const declarationPattern = (name, value) =>
  new RegExp(`${escapeRegExp(name)}\\s*:\\s*${escapeRegExp(value)}\\s*;`);
const stripCssComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '');

function blockBody(source, header) {
  source = stripCssComments(source);
  const headerStart = source.indexOf(header);
  if (headerStart === -1) fail(`CSS index entry point is missing "${header}".`);
  const following = source.slice(headerStart + header.length);
  const opening = following.match(/^\s*\{/);
  if (!opening) fail(`CSS block "${header}" does not directly own an opening brace.`);
  const openingBrace = headerStart + header.length + opening[0].length - 1;

  let depth = 1;
  for (let index = openingBrace + 1; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(openingBrace + 1, index);
  }
  fail(`CSS block "${header}" has no closing brace.`);
}

function assertDeclaration(source, name, value) {
  const pattern = value
    ? declarationPattern(`--${name}`, value)
    : new RegExp(`${escapeRegExp(`--${name}`)}\\s*:`);
  if (!pattern.test(source)) fail(`CSS block is missing required declaration "--${name}".`);
}

export function assertCssContract({ rootCss, indexCss, aliases, modes }) {
  rootCss = stripCssComments(rootCss);
  indexCss = stripCssComments(indexCss);
  modes = modes.map((mode) => ({ ...mode, css: stripCssComments(mode.css) }));

  if (!/:root\s*\{/.test(rootCss)) fail('CSS light entry point has no :root contract.');
  for (const { name, reference } of aliases) {
    if (!declarationPattern(`--${name}`, `var(--${reference})`).test(rootCss)) {
      fail(`CSS light entry point is missing compatibility alias "--${name}".`);
    }
  }

  for (const { name, css, paths } of modes) {
    let themeBlock;
    try {
      themeBlock = blockBody(css, `[data-theme="${name}"]`);
    } catch {
      fail(`CSS ${name} entry point is missing its required data-theme selector.`);
    }
    for (const path of paths) {
      if (!new RegExp(`${escapeRegExp(`--${path.join('-')}`)}\\s*:`).test(themeBlock)) {
        fail(`CSS ${name} entry point is missing "${path.join('.')}".`);
      }
    }
  }

  for (const cssImport of [
    "@import './tokens.css';",
    "@import './tokens-dark.css';",
    "@import './tokens-dark-oled.css';",
    "@import './tokens-high-contrast.css';",
  ]) {
    const remaining = indexCss.trimStart();
    if (!remaining.startsWith(cssImport)) {
      fail(`CSS index entry point must begin with "${cssImport}".`);
    }
    indexCss = remaining.slice(cssImport.length);
  }

  const chartDeclarations = Array.from({ length: 6 }, (_, index) => [
    `color-chart-${index + 1}`,
    `var(--color-chart-hc-${index + 1})`,
  ]);
  const explicitHighContrast = blockBody(indexCss, '[data-theme="high-contrast"]');
  for (const [name, value] of chartDeclarations) {
    assertDeclaration(explicitHighContrast, name, value);
  }

  const modeByName = new Map(modes.map((mode) => [mode.name, mode]));
  const preferenceBlocks = [
    ['@media (prefers-color-scheme: dark)', 'dark'],
    ['@media (prefers-contrast: more)', 'high-contrast'],
  ];
  for (const [header, mode] of preferenceBlocks) {
    const rootBlock = blockBody(blockBody(indexCss, header), ':root:not([data-theme])');
    for (const path of modeByName.get(mode).paths) assertDeclaration(rootBlock, path.join('-'));
    if (mode === 'high-contrast') {
      for (const [name, value] of chartDeclarations) assertDeclaration(rootBlock, name, value);
    }
  }

  const combinedContrast = blockBody(
    blockBody(indexCss, '@media (prefers-color-scheme: dark) and (prefers-contrast: more)'),
    ':root:not([data-theme])',
  );
  for (const name of [
    'semantic-text-primary',
    'semantic-text-secondary',
    'semantic-border-default',
    'semantic-border-focus',
    'semantic-interactive-default',
    'semantic-status-positive',
    'semantic-status-negative',
    'semantic-status-warning',
    'semantic-status-info',
  ]) {
    assertDeclaration(combinedContrast, name);
  }

  const reducedMotion = blockBody(
    blockBody(indexCss, '@media (prefers-reduced-motion: reduce)'),
    ':root',
  );
  const cognitive = blockBody(indexCss, '[data-a11y-cognitive="true"]');
  for (const name of ['press', 'state', 'tile']) {
    assertDeclaration(reducedMotion, `motion-${name}-duration`, '0ms');
    assertDeclaration(cognitive, `motion-${name}-duration`, '0ms');
  }
  for (const role of ['display', 'title', 'body', 'label', 'overline']) {
    for (const property of ['size', 'line-height']) {
      assertDeclaration(
        cognitive,
        `text-${role}-${property}`,
        `var(--cognitive-type-${role}-${property})`,
      );
    }
  }
}

export function assertTypeContract(source) {
  const names = [
    'tokens',
    'tokensLight',
    'tokensDark',
    'tokensDarkOled',
    'tokensHighContrast',
    'themes',
  ];
  for (const name of names) {
    if (!new RegExp(`export declare const ${name}\\b`).test(source)) {
      fail(`Type entry point is missing declaration "${name}".`);
    }
  }
  if (!source.includes('export default tokens;')) {
    fail('Type entry point is missing the documented default export.');
  }
}
