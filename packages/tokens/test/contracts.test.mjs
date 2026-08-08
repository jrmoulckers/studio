import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
  assertJsContract,
  assertTailwindContract,
  assertThemeParity,
  assertTypeContract,
  parseTokenJson,
  readTokenDocuments,
  tokenRecords,
  validateDtcgDocuments,
  validateReferenceGraph,
} from './helpers/contract-validators.mjs';

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
const aliasRecords = tokenRecords(aliasDocument);
const aliasPaths = aliasRecords.map(({ path }) => path);
const aliases = aliasRecords.map(({ path, value }) => ({
  name: path.join('-'),
  reference: value.slice(1, -1).split('.').join('-'),
}));
const semanticPaths = tokenRecords(modeDocuments[0].document).map(({ path }) => path);
const clone = (value) => JSON.parse(JSON.stringify(value));

const exportPath = (entry) => resolve(packageRoot, entry);
const readText = (path) => new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(path));

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

function runTokenBuild() {
  execFileSync(process.execPath, [join(packageRoot, 'config', 'style-dictionary.config.mjs')], {
    cwd: packageRoot,
    stdio: 'pipe',
  });
}

test('all authored token JSON is DTCG-shaped and references resolve without cycles', () => {
  validateDtcgDocuments(documents);
  for (const { document } of modeDocuments) {
    validateReferenceGraph([...sharedDocuments, document]);
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
});

test('semantic keys remain identical across every documented theme', () => {
  assertThemeParity(modeDocuments);
});

test('theme parity rejects a missing semantic key', () => {
  const mutated = clone(modeDocuments);
  delete mutated[1].document.document.semantic.text.primary;
  assert.throws(() => assertThemeParity(mutated), /dark theme differs.*semantic\.text\.primary/);

  const typeMutation = clone(modeDocuments);
  typeMutation[1].document.document.semantic.text.primary.$type = 'duration';
  assert.throws(
    () => assertThemeParity(typeMutation),
    /Type mismatches: semantic\.text\.primary \(color != duration\)/,
  );
});

test('generated JS, CJS, CSS, and type entry points expose the documented contract', async () => {
  const jsPath = exportPath(packageJson.exports['.'].import);
  const generatedJs = await import(`${pathToFileURL(jsPath).href}?contract-test`);
  const tailwind = require(exportPath(packageJson.exports['./tailwind']));
  const typeSource = readText(exportPath(packageJson.types));
  const rootCss = readText(exportPath(packageJson.exports['./css/light']));
  const indexCss = readText(exportPath(packageJson.exports['./css']));
  const modes = modeNames.slice(1).map((name) => ({
    name,
    css: readText(exportPath(packageJson.exports[`./css/${name}`])),
    paths: tokenRecords(byFile.get(`themes/default/color.semantic.${name}.json`)).map(
      ({ path }) => path,
    ),
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
        "import tokens, { themes, tokensDark, tokensDarkOled, tokensHighContrast } from '../js/index.js';",
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

test('generated contract guards reject removed exports, aliases, selectors, and preferences', async () => {
  const generatedJs = await import(
    `${pathToFileURL(exportPath(packageJson.exports['.'].import)).href}?negative-contract-test`
  );
  assert.throws(
    () => assertJsContract({ ...generatedJs, tokensDark: undefined }, semanticPaths, aliasPaths),
    /missing export "tokensDark"/,
  );

  const tailwind = clone(require(exportPath(packageJson.exports['./tailwind'])));
  delete tailwind.theme.extend.colors.primary;
  assert.throws(
    () => assertTailwindContract(tailwind, semanticPaths, aliasPaths),
    /compatibility alias "primary"/,
  );

  const rootCss = readText(exportPath(packageJson.exports['./css/light']));
  const indexCss = readText(exportPath(packageJson.exports['./css']));
  const modes = modeNames.slice(1).map((name) => ({
    name,
    css: readText(exportPath(packageJson.exports[`./css/${name}`])),
    paths: tokenRecords(byFile.get(`themes/default/color.semantic.${name}.json`)).map(
      ({ path }) => path,
    ),
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
    rmSync(buildRoot, { recursive: true, force: true });
    runTokenBuild();
    const firstBuild = readFileTree(buildRoot);

    rmSync(buildRoot, { recursive: true, force: true });
    runTokenBuild();
    const secondBuild = readFileTree(buildRoot);
    assertFileTreesEqual(firstBuild, secondBuild);

    assembleDist({ buildDir: buildRoot, distDir: generatedRoot, log: () => {} });
    const first = readFileTree(generatedRoot);
    assertDeclaredDistribution(first);
    assertFileTreesEqual(committed, first);

    const stalePath = join(generatedRoot, 'js', 'stale-generated.js');
    writeFileSync(stalePath, 'export default "stale";\n');
    assert.ok(readFileTree(generatedRoot).has('js/stale-generated.js'));

    assembleDist({ buildDir: buildRoot, distDir: generatedRoot, log: () => {} });
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
});
