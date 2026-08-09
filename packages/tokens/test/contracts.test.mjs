import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { TextDecoder } from 'node:util';
import ts from 'typescript';

import {
  DIST_OUTPUTS,
  assembleDist,
  assertDeclaredDistribution,
  assertFileTreesEqual,
  readFileTree,
} from '../scripts/dist-contract.mjs';
import {
  assertCssContract,
  assertDocumentSet,
  assertJsContract,
  assertTailwindContract,
  assertTailwindPresetShell,
  assertThemeParity,
  assertTokenContract,
  assertTypeContract,
  parseTokenJson,
  readTokenDocuments,
  validateDtcgDocuments,
  validateReferenceGraph,
} from './helpers/contract-validators.mjs';
import {
  REQUIRED_ALIASES,
  REQUIRED_SEMANTIC_TOKENS,
  REQUIRED_STRUCTURAL_TOKENS,
  REQUIRED_TAILWIND_SHELL,
  REQUIRED_TOKEN_FILES,
} from './helpers/public-contract.mjs';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tokenRoot = join(packageRoot, 'tokens');
const buildRoot = join(packageRoot, 'build');
const distRoot = join(packageRoot, 'dist');
const require = createRequire(import.meta.url);
const packageJson = require(join(packageRoot, 'package.json'));
const documents = readTokenDocuments(tokenRoot);
const byFile = new Map(documents.map((document) => [document.file, document]));
const modeNames = ['light', 'dark', 'dark-oled', 'high-contrast'];
const modeDocuments = modeNames.map((name) => ({
  name,
  document: byFile.get(`themes/default/color.semantic.${name}.json`),
}));
const sharedDocuments = documents.filter(
  ({ file }) => !file.startsWith('themes/default/color.semantic.'),
);
const aliasDocument = byFile.get('themes/default/color.alias.json');
const aliasPaths = REQUIRED_ALIASES.map(({ path }) => path.split('.'));
const aliases = REQUIRED_ALIASES.map(({ path, value }) => ({
  name: path.replaceAll('.', '-'),
  reference: value.slice(1, -1).replaceAll('.', '-'),
}));
const semanticPaths = REQUIRED_SEMANTIC_TOKENS.map(({ path }) => path.split('.'));
const clone = (value) => JSON.parse(JSON.stringify(value));

const exportPath = (entry) => resolve(packageRoot, entry);
const readText = (path) => new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(path));
const resolvePackageEntry = (specifier) => fileURLToPath(import.meta.resolve(specifier));

/** The resolved token tree for a mode, read from the committed dist. */
const readTokenTree = (mode) =>
  JSON.parse(
    readText(join(packageRoot, 'dist', 'js', 'default', `tokens.${mode}.js`))
      .replace(/^\/\/.*\n/, '')
      .replace(/^export const tokens = /, '')
      .replace(/;\s*export default tokens;\s*$/, ''),
  );

/** `semantic.background.primary` → `backgroundPrimary`, mirroring the native renderers. */
const nativeFieldName = (path) =>
  path
    .split('.')
    .slice(1)
    .map((part, index) =>
      part
        .split('-')
        .map((word, wordIndex) =>
          index === 0 && wordIndex === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1),
        )
        .join(''),
    )
    .join('');

function typeScriptDiagnostics(rootName) {
  const program = ts.createProgram([rootName], {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    skipLibCheck: false,
    strict: true,
    target: ts.ScriptTarget.ES2022,
  });
  return ts.getPreEmitDiagnostics(program);
}

function runIsolatedTokenBuild(isolatedRoot) {
  mkdirSync(isolatedRoot, { recursive: true });
  cpSync(join(packageRoot, 'config'), join(isolatedRoot, 'config'), { recursive: true });
  cpSync(tokenRoot, join(isolatedRoot, 'tokens'), { recursive: true });
  symlinkSync(
    join(packageRoot, 'node_modules'),
    join(isolatedRoot, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  execFileSync(process.execPath, [join(isolatedRoot, 'config', 'style-dictionary.config.mjs')], {
    cwd: isolatedRoot,
    stdio: 'pipe',
  });
  const tree = readFileTree(join(isolatedRoot, 'build'));
  assertDeclaredDistribution(tree);
  return tree;
}

test('all authored token JSON is DTCG-shaped and references resolve without cycles', () => {
  assertDocumentSet(documents, REQUIRED_TOKEN_FILES);
  validateDtcgDocuments(documents);
  assertTokenContract(aliasDocument, REQUIRED_ALIASES);
  for (const { document } of modeDocuments) {
    validateReferenceGraph([...sharedDocuments, document]);
  }
});

test('theme-agnostic structural tokens expose the documented layer, state, elevation, focus, and target contract', () => {
  const structuralFiles = [
    'primitive/opacity.json',
    'primitive/zindex.json',
    'primitive/focus.json',
    'primitive/target.json',
    'semantic/layer.json',
    'semantic/state.json',
    'semantic/elevation.json',
  ];
  for (const file of structuralFiles) {
    assert.ok(byFile.get(file), `${file} is authored`);
  }

  const structural = REQUIRED_STRUCTURAL_TOKENS.reduce((groups, token) => {
    const [group] = token.path.split('.');
    (groups[group] ??= []).push(token);
    return groups;
  }, {});

  assertTokenContract(byFile.get('semantic/layer.json'), structural.layer);
  assertTokenContract(byFile.get('semantic/state.json'), structural.state);
  assertTokenContract(byFile.get('semantic/elevation.json'), structural.elevation);
  assertTokenContract(byFile.get('primitive/focus.json'), structural.focus);
  assertTokenContract(byFile.get('primitive/target.json'), structural.target);

  // Structural tokens must stay theme-agnostic: they carry no color, so they are
  // declared once in :root rather than re-declared per [data-theme] override.
  const rootCss = readText(join(distRoot, 'css', 'default', 'tokens.css'));
  for (const { path } of REQUIRED_STRUCTURAL_TOKENS) {
    assert.ok(
      rootCss.includes(`--${path.replaceAll('.', '-')}:`),
      `--${path.replaceAll('.', '-')} is declared in :root`,
    );
  }

  // Components derive their pointer targets from the primitive rather than
  // re-hardcoding a pixel literal.
  for (const name of ['--button-primary-min-height', '--input-min-height', '--nav-iconbtn-size']) {
    assert.match(
      rootCss,
      new RegExp(`${name}:\\s*var\\(--target-min\\)`),
      `${name} derives from --target-min`,
    );
  }
});

test('token validators reject malformed JSON, missing references, and cycles', () => {
  assert.throws(() => parseTokenJson('{"color":', 'broken.json'), /not valid JSON/);

  const malformedShape = parseTokenJson(
    JSON.stringify({
      color: { primary: { $value: '#000000' } },
    }),
    'malformed-shape.json',
  );
  assert.throws(() => validateDtcgDocuments([malformedShape]), /has no DTCG \$type/);

  const missing = parseTokenJson(
    JSON.stringify({
      semantic: { text: { $value: '{color.missing}', $type: 'color' } },
    }),
    'missing-reference.json',
  );
  assert.throws(() => validateReferenceGraph([missing]), /references missing token/);

  const cycle = parseTokenJson(
    JSON.stringify({
      color: {
        first: { $value: '{color.second}', $type: 'color' },
        second: { $value: '{color.first}', $type: 'color' },
      },
    }),
    'cycle.json',
  );
  assert.throws(() => validateReferenceGraph([cycle]), /reference cycle/);
  assert.throws(() => validateReferenceGraph([]), /reference graph has no tokens/);

  const missingDocument = documents.filter(({ file }) => file !== 'component/avatar.json');
  assert.throws(
    () => assertDocumentSet(missingDocument, REQUIRED_TOKEN_FILES),
    /Missing: component\/avatar\.json/,
  );
});

test('semantic keys remain identical across every documented theme', () => {
  assertThemeParity(modeDocuments, REQUIRED_SEMANTIC_TOKENS);
});

test('theme parity rejects a missing semantic key', () => {
  const mutated = clone(modeDocuments);
  delete mutated[1].document.document.semantic.text.primary;
  assert.throws(
    () => assertThemeParity(mutated, REQUIRED_SEMANTIC_TOKENS),
    /color\.semantic\.dark\.json differs.*Missing: semantic\.text\.primary/,
  );

  const typeMutation = clone(modeDocuments);
  typeMutation[1].document.document.semantic.text.primary.$type = 'duration';
  assert.throws(
    () => assertThemeParity(typeMutation, REQUIRED_SEMANTIC_TOKENS),
    /color\.semantic\.dark\.json differs.*semantic\.text\.primary has type duration/,
  );

  const commonDeletion = clone(modeDocuments);
  for (const theme of commonDeletion) delete theme.document.document.semantic.status.info;
  assert.throws(
    () => assertThemeParity(commonDeletion, REQUIRED_SEMANTIC_TOKENS),
    /Missing: semantic\.status\.info/,
  );
});

test('generated JS, CJS, CSS, and type entry points expose the documented contract', async () => {
  const generatedJs = await import('@jrm/tokens');
  const tailwind = require('@jrm/tokens/tailwind');
  const typeSource = readText(exportPath(packageJson.types));
  const rootCss = readText(resolvePackageEntry('@jrm/tokens/css/light'));
  const indexCss = readText(resolvePackageEntry('@jrm/tokens/css'));
  const modes = modeNames.slice(1).map((name) => ({
    name,
    css: readText(resolvePackageEntry(`@jrm/tokens/css/${name}`)),
    paths: semanticPaths,
  }));

  assertJsContract(generatedJs, semanticPaths, aliasPaths);
  assertTailwindContract(tailwind, semanticPaths, aliasPaths);
  assertTypeContract(typeSource);
  assertCssContract({ rootCss, indexCss, aliases, modes });

  for (const relativePath of [
    packageJson.main,
    packageJson.types,
    ...Object.values(packageJson.exports).flatMap((entry) =>
      typeof entry === 'string' ? [entry] : Object.values(entry),
    ),
  ]) {
    assert.ok(statSync(exportPath(relativePath)).isFile(), `${relativePath} exists`);
  }

  const typeFixtureRoot = mkdtempSync(join(buildRoot, 'contract-types-'));
  try {
    const fixture = join(typeFixtureRoot, 'consumer.mts');
    writeFileSync(
      fixture,
      [
        "import tokens, { themes, tokensDark, tokensDarkOled, tokensHighContrast } from '@jrm/tokens';",
        'tokens.semantic.text.primary;',
        'tokensDark.semantic.text.primary;',
        'tokensDarkOled.semantic.text.primary;',
        'tokensHighContrast.semantic.text.primary;',
        "themes['high-contrast'].semantic.text.primary;",
      ].join('\n'),
    );
    assert.deepEqual(
      typeScriptDiagnostics(fixture).map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      ),
      [],
    );
  } finally {
    rmSync(typeFixtureRoot, { recursive: true, force: true });
  }
});

test('the vendored dist preset is self-sufficient and carries the documented shell', () => {
  // Consumers receive dist/ as a copied directory, so this asserts against the
  // vendored artifact itself — required from its dist path with no package
  // resolution — rather than the package export a consumer cannot reach.
  const vendored = require(join(packageRoot, 'dist', 'tailwind', 'default.cjs'));

  assertTailwindContract(vendored, semanticPaths, aliasPaths);
  assertTailwindPresetShell(vendored, REQUIRED_TAILWIND_SHELL);

  // A vendored preset must not reach for anything it cannot resolve downstream.
  const source = readText(join(packageRoot, 'dist', 'tailwind', 'default.cjs'));
  assert.ok(!/\brequire\(/.test(source), 'vendored preset must not require any module');
});

test('preset shell guards reject a dropped shell scale, ring token, and animation', () => {
  const preset = clone(require(join(packageRoot, 'dist', 'tailwind', 'default.cjs')));

  const missingRing = clone(preset);
  delete missingRing.theme.extend.ringWidth;
  assert.throws(
    () => assertTailwindPresetShell(missingRing, REQUIRED_TAILWIND_SHELL),
    /ringWidth\.DEFAULT/,
  );

  const missingSafeArea = clone(preset);
  delete missingSafeArea.theme.extend.spacing['safe-b'];
  assert.throws(
    () => assertTailwindPresetShell(missingSafeArea, REQUIRED_TAILWIND_SHELL),
    /spacing\.safe-b/,
  );

  const missingDarkMode = clone(preset);
  delete missingDarkMode.darkMode;
  assert.throws(
    () => assertTailwindPresetShell(missingDarkMode, REQUIRED_TAILWIND_SHELL),
    /darkMode strategy/,
  );

  const missingAnimation = clone(preset);
  delete missingAnimation.theme.extend.animation['pop-in'];
  assert.throws(
    () => assertTailwindPresetShell(missingAnimation, REQUIRED_TAILWIND_SHELL),
    /"pop-in" animation/,
  );
});

test('native output expresses every theme for Compose and SwiftUI', () => {
  const kotlin = readText(join(packageRoot, 'dist', 'native', 'compose', 'JrmTokens.kt'));
  const swift = readText(join(packageRoot, 'dist', 'native', 'swift', 'JRMTokens.swift'));

  // Every documented theme must reach native, or a native app silently loses a mode.
  for (const symbol of [
    'JrmLightColors',
    'JrmDarkColors',
    'JrmDarkOledColors',
    'JrmHighContrastColors',
  ]) {
    assert.ok(kotlin.includes(`val ${symbol}: JrmColorScheme`), `Kotlin defines ${symbol}`);
  }
  for (const symbol of ['light', 'dark', 'darkOled', 'highContrast']) {
    assert.ok(swift.includes(`static let ${symbol} = JRMColorScheme(`), `Swift defines ${symbol}`);
  }

  // The semantic contract must be complete on both platforms, not a convenient subset.
  for (const { path } of REQUIRED_SEMANTIC_TOKENS.filter((t) => t.type === 'color')) {
    const field = nativeFieldName(path);
    assert.ok(kotlin.includes(`val ${field}: Color,`), `Kotlin scheme has ${field}`);
    assert.ok(swift.includes(`public let ${field}: Color`), `Swift scheme has ${field}`);
  }

  // No CSS-only unit or color function may leak into code that has to compile.
  for (const [name, source] of [
    ['Kotlin', kotlin],
    ['Swift', swift],
  ]) {
    assert.ok(!/oklch\(/i.test(source), `${name} output resolves OKLCH to sRGB`);
    assert.ok(!/\d(rem|px|ms)\b/.test(source), `${name} output carries no CSS units`);
  }
});

test('native renderers reject values and names no native platform can express', async () => {
  const { renderCompose, renderSwift, parseColor } = await import('../config/native.mjs');
  const trees = Object.fromEntries(modeNames.map((mode) => [mode, clone(readTokenTree(mode))]));

  assert.throws(() => parseColor('color-mix(in oklch, red, blue)', 'x'), /cannot express color/);
  assert.deepEqual(parseColor('#0f1020', 'x'), { r: 15, g: 16, b: 32, a: 255 });

  const badColor = clone(trees);
  badColor.light.semantic.background.primary = 'color-mix(in srgb, red, blue)';
  assert.throws(() => renderCompose(badColor), /cannot express color/);
  assert.throws(() => renderSwift(badColor), /cannot express color/);

  const badName = clone(trees);
  badName.light.spacing.class = '4px';
  assert.throws(() => renderCompose(badName), /cannot name token/);

  const missingKey = clone(trees);
  delete missingKey.dark.semantic.background.primary;
  assert.throws(() => renderCompose(missingKey), /identical semantic keys/);
});

test('generated contract guards reject removed exports, aliases, selectors, and preferences', async () => {
  const generatedJs = await import('@jrm/tokens');
  assert.throws(
    () => assertJsContract({ ...generatedJs, tokensDark: undefined }, semanticPaths, aliasPaths),
    /missing export "tokensDark"/,
  );

  const tailwind = clone(require('@jrm/tokens/tailwind'));
  delete tailwind.theme.extend.colors.primary;
  assert.throws(
    () => assertTailwindContract(tailwind, semanticPaths, aliasPaths),
    /compatibility alias "primary"/,
  );

  const rootCss = readText(resolvePackageEntry('@jrm/tokens/css/light'));
  const indexCss = readText(resolvePackageEntry('@jrm/tokens/css'));
  const modes = modeNames.slice(1).map((name) => ({
    name,
    css: readText(resolvePackageEntry(`@jrm/tokens/css/${name}`)),
    paths: semanticPaths,
  }));
  const firstAlias = aliases[0];
  const withoutAlias = rootCss.replace(
    new RegExp(`\\s*--${firstAlias.name}:\\s*var\\(--${firstAlias.reference}\\);`),
    '',
  );
  assert.throws(
    () => assertCssContract({ rootCss: withoutAlias, indexCss, aliases, modes }),
    /compatibility alias/,
  );

  const selectorMutation = clone(modes);
  selectorMutation[0].css = selectorMutation[0].css.replace(
    '[data-theme="dark"]',
    '[data-theme="night"]',
  );
  assert.throws(
    () => assertCssContract({ rootCss, indexCss, aliases, modes: selectorMutation }),
    /required data-theme selector/,
  );

  const commentedSelectorMutation = clone(modes);
  commentedSelectorMutation[0].css = commentedSelectorMutation[0].css.replace(
    '[data-theme="dark"]',
    '/* [data-theme="dark"] */ :root',
  );
  assert.throws(
    () => assertCssContract({ rootCss, indexCss, aliases, modes: commentedSelectorMutation }),
    /required data-theme selector/,
  );

  const preferenceMutation = indexCss.replace(
    '@media (prefers-reduced-motion: reduce)',
    '@media (prefers-reduced-motion: no-preference)',
  );
  assert.throws(
    () => assertCssContract({ rootCss, indexCss: preferenceMutation, aliases, modes }),
    /prefers-reduced-motion/,
  );

  const typeSource = readText(exportPath(packageJson.types));
  assert.throws(
    () =>
      assertTypeContract(
        typeSource.replace('export declare const tokensDarkOled', 'declare const tokensDarkOled'),
      ),
    /tokensDarkOled/,
  );

  const malformedTypesRoot = mkdtempSync(join(tmpdir(), 'jrm-token-types-negative-'));
  try {
    const copiedJs = join(malformedTypesRoot, 'js');
    cpSync(join(buildRoot, 'js'), copiedJs, { recursive: true });
    const darkTypes = join(copiedJs, 'default', 'tokens.dark.d.ts');
    writeFileSync(darkTypes, `${readText(darkTypes)}\nthis is invalid TypeScript;\n`);
    const fixture = join(malformedTypesRoot, 'consumer.mts');
    writeFileSync(fixture, "import { tokensDark } from './js/index.js';\ntokensDark;\n");
    assert.ok(typeScriptDiagnostics(fixture).length > 0);
  } finally {
    rmSync(malformedTypesRoot, { recursive: true, force: true });
  }

  const scopedPreferenceMutation = indexCss.replace('    --motion-press-duration: 0ms;', '');
  assert.throws(
    () =>
      assertCssContract({
        rootCss,
        indexCss: scopedPreferenceMutation,
        aliases,
        modes,
      }),
    /motion-press-duration/,
  );
});

test('committed dist is declared text and regeneration is deterministic and removes stale files', () => {
  const committed = readFileTree(distRoot);
  assertDeclaredDistribution(committed);
  assert.deepEqual([...committed.keys()].sort(), [...DIST_OUTPUTS].sort());

  const temporaryRoot = mkdtempSync(join(tmpdir(), 'jrm-token-dist-'));
  const generatedRoot = join(temporaryRoot, 'dist');
  try {
    const firstBuild = runIsolatedTokenBuild(join(temporaryRoot, 'first-package'));
    const secondPackage = join(temporaryRoot, 'second-package');
    const secondBuild = runIsolatedTokenBuild(secondPackage);
    assertFileTreesEqual(firstBuild, secondBuild);

    assembleDist({
      buildDir: join(secondPackage, 'build'),
      distDir: generatedRoot,
      log: () => {},
    });
    const first = readFileTree(generatedRoot);
    assertDeclaredDistribution(first);
    assertFileTreesEqual(committed, first);

    const stalePath = join(generatedRoot, 'js', 'stale-generated.js');
    writeFileSync(stalePath, 'export default "stale";\n');
    assert.ok(readFileTree(generatedRoot).has('js/stale-generated.js'));

    assembleDist({
      buildDir: join(secondPackage, 'build'),
      distDir: generatedRoot,
      log: () => {},
    });
    const second = readFileTree(generatedRoot);
    assert.ok(!second.has('js/stale-generated.js'));
    assertFileTreesEqual(first, second);

    const mutated = new Map(second);
    mutated.set(
      'js/index.js',
      Buffer.concat([mutated.get('js/index.js'), Buffer.from('// drift\n')]),
    );
    assert.throws(() => assertFileTreesEqual(first, mutated), /content changed/);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('dist guards reject undeclared, non-UTF-8, and non-LF artifacts', () => {
  const baseline = readFileTree(distRoot);

  const undeclared = new Map(baseline);
  undeclared.set('js/stale.js', Buffer.from('export {};\n'));
  assert.throws(() => assertDeclaredDistribution(undeclared), /Unexpected: js\/stale\.js/);

  const invalidUtf8 = new Map(baseline);
  invalidUtf8.set('js/index.js', Buffer.from([0xff]));
  assert.throws(() => assertDeclaredDistribution(invalidUtf8), /not valid UTF-8/);

  const crlf = new Map(baseline);
  crlf.set('js/index.js', Buffer.from('export {};\r\n'));
  assert.throws(() => assertDeclaredDistribution(crlf), /not LF-normalized/);

  const temporaryRoot = mkdtempSync(join(tmpdir(), 'jrm-token-dist-encoding-'));
  try {
    const invalidBuild = join(temporaryRoot, 'invalid-build');
    cpSync(buildRoot, invalidBuild, { recursive: true });
    writeFileSync(join(invalidBuild, 'js', 'index.js'), Buffer.from([0xff]));
    assert.throws(
      () =>
        assembleDist({
          buildDir: invalidBuild,
          distDir: join(temporaryRoot, 'invalid-dist'),
          log: () => {},
        }),
      /"js\/index\.js" is not valid UTF-8/,
    );

    const crlfBuild = join(temporaryRoot, 'crlf-build');
    cpSync(buildRoot, crlfBuild, { recursive: true });
    const cssPath = join(crlfBuild, 'css', 'default', 'index.css');
    const normalizedCss = readText(cssPath);
    writeFileSync(cssPath, normalizedCss.replace(/\n/g, '\r\n'));
    const crlfDist = join(temporaryRoot, 'crlf-dist');
    assembleDist({ buildDir: crlfBuild, distDir: crlfDist, log: () => {} });
    const assembledCss = readText(join(crlfDist, 'css', 'default', 'index.css'));
    assert.equal(assembledCss, normalizedCss);
    assert.ok(!assembledCss.includes('\r'));
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
