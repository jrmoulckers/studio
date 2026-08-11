#!/usr/bin/env node
// Asserts every file extension in the token distribution is one canon's
// provenance stamper classifies with a comment syntax that file type accepts.
//
// Why this exists
// ---------------
// The sync engine prepends a provenance header to every distributed file and
// picks the comment syntax from the file's extension. Canon classifies that in
// one place -- sync/lib/comment-syntax.mjs -- into `hash`, `html`, `block` or
// `none`, and an unknown type THROWS. There is no fallback, deliberately: both
// plausible defaults fail quietly, HTML by destroying anything with a real
// grammar and `none` by dropping provenance altogether.
//
// So an unclassified format does not reach a consumer corrupted; it stops the
// sync. That is the better failure, but it is still Studio's to prevent, and
// it lands somewhere nobody here is watching -- distribution, not this build.
//
// Canon states the obligation this creates: a new extension arriving in a
// distribution must be classified there first. That sentence cannot be
// enforced where it is written. The enumeration lives in canon; the event that
// invalidates it -- adding a Style Dictionary output format -- happens HERE.
// Canon's tests cannot know Studio added a format. So the obligation binds
// whoever adds a file type and fires in nobody's run.
//
// This guard closes that half. Studio is the repository whose change creates
// the hazard, so Studio fails first, in the pull request that adds the format,
// naming the canon change required before it can ship.
//
// Why the set is declared here rather than read from canon
// -------------------------------------------------------
// Canon does export its enumeration (`CLASSIFIED_TYPES`), so a real second
// source exists -- but reading it needs a network fetch or a second checkout,
// which would make a correctness gate depend on availability. The local
// declaration is a deliberately duplicated fact, kept because drift surfaces
// as a false alarm a human resolves by looking at canon, never as a silent
// miscompile. Note the two are not the same set: canon classifies types this
// map omits, so drift shows up as this guard firing on a file canon would in
// fact have handled.
//
// An entry in CLASSIFIED is a decision, not a default. Adding one asserts you
// have confirmed canon classifies that extension, and that its comment syntax
// is one the format actually accepts.
//
// This list is deliberate, unlike the empirical NUL predicate in
// validate-text-classification.mjs. The difference is that "is this file a
// binary" is answerable from the bytes, whereas "does canon's provenance
// comment survive in this format" is not -- it depends on a syntax table only a
// human can check against canon.

import { execFileSync } from 'node:child_process';
import process from 'node:process';

const DIST = 'packages/tokens/dist';

// Extension -> the comment syntax canon's stamper applies to it.
// Verified against a consumer's vendored copy, whose files open with the
// injected block ahead of Style Dictionary's own header.
const CLASSIFIED = new Map([
  ['.css', 'block /* */'],
  ['.js', 'block /* */'],
  ['.ts', 'block /* */'],
  ['.cjs', 'block /* */'],
  ['.kt', 'block /* */'],
  ['.swift', 'block /* */'],
  ['.md', 'html <!-- -->'],
]);

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function extensionOf(file) {
  const base = file.slice(file.lastIndexOf('/') + 1);
  // `.d.ts` and friends: the stamper keys on the final segment, so must this.
  const dot = base.lastIndexOf('.');
  return dot <= 0 ? '' : base.slice(dot).toLowerCase();
}

function main() {
  const files = git(['ls-files', DIST]).split('\n').filter(Boolean);

  if (files.length === 0) {
    console.error(
      `dist-extensions: inspected 0 files under ${DIST}. Refusing to report success.\n` +
        'Either the distribution is missing or the path in this script is stale.',
    );
    process.exit(1);
  }

  const unclassified = new Map();
  for (const file of files) {
    const ext = extensionOf(file);
    if (CLASSIFIED.has(ext)) continue;
    if (!unclassified.has(ext)) unclassified.set(ext, []);
    unclassified.get(ext).push(file);
  }

  if (unclassified.size === 0) {
    const kinds = [...new Set(files.map(extensionOf))].sort().join(' ');
    console.log(
      `dist-extensions: OK — ${files.length} distributed file(s), ${new Set(files.map(extensionOf)).size} extension(s) (${kinds}), all classified.`,
    );
    return;
  }

  console.error(
    `\ndist-extensions: ${unclassified.size} unclassified extension(s) in the distribution:\n`,
  );
  for (const [ext, hits] of [...unclassified].sort()) {
    console.error(`  ${ext || '(no extension)'}  — ${hits.length} file(s)`);
    for (const file of hits.slice(0, 5)) console.error(`      ${file}`);
    if (hits.length > 5) console.error(`      ... and ${hits.length - 5} more`);
  }

  console.error(
    [
      '',
      'The sync engine stamps a provenance header onto every file it distributes and',
      'chooses the comment syntax from the extension. Canon classifies that in ONE',
      'place and an unknown type throws rather than defaulting, so an unclassified',
      'format does not ship corrupted -- it stops the sync, downstream, after this',
      'build is green. That is the failure this guard exists to move forward.',
      '',
      'Do NOT silence this by adding the extension below. Classify it in canon FIRST:',
      '',
      '  jrmoulckers/.github  sync/lib/comment-syntax.mjs   (the only classifier)',
      '',
      'It is deliberately one table -- provenance.mjs and basemerge.mjs both derive',
      'from it and hold no list of their own. Do not add one back.',
      '',
      'Then add the extension to CLASSIFIED in this script, recording the syntax canon',
      'actually applies. Shipping the format before canon can stamp it is the ordering',
      'that breaks the distribution.',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(`dist-extensions: ${error.message}`);
  process.exit(1);
}
