#!/usr/bin/env node
// Asserts every file extension in the token distribution is one canon's
// provenance stamper classifies with a comment syntax that file type accepts.
//
// Why this exists
// ---------------
// The sync engine prepends a provenance header to every distributed file and
// picks the comment syntax from the file's extension. Its fallback is HTML:
//
//     <!-- generated + synced from jrmoulckers/studio ... -->
//
// which is correct for Markdown and silently wrong for anything with a real
// grammar. A `.scss` or `.plist` that lands in the fallback is emitted with an
// HTML comment at byte zero and stops compiling -- in the CONSUMER's build,
// after distribution, in a repository that did not change.
//
// Canon states the obligation this creates: a new extension arriving in a
// distribution "must be classified here" (sync/lib/provenance.mjs). That
// sentence cannot be enforced where it is written. The enumeration lives in
// canon; the event that invalidates it -- adding a Style Dictionary output
// format -- happens HERE. Canon's tests cannot know Studio added a format, and
// Studio cannot read canon's table at test time. So the obligation binds
// whoever adds a file type and fires in nobody's run.
//
// This guard closes that half. Studio is the repository whose change creates
// the hazard, so Studio fails first, in the pull request that adds the format,
// naming the canon change required before it can ship.
//
// Why the set is declared here rather than read from canon
// -------------------------------------------------------
// Reading canon's table live would need a network fetch or a second checkout,
// making a correctness gate depend on availability. A local declaration is a
// deliberately duplicated fact -- but it is duplicated against a table that
// changes rarely, and the failure mode of drift is a false alarm that a human
// resolves by looking at canon, not a silent miscompile in a consumer.
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
      'chooses the comment syntax from the extension. Anything it does not classify',
      'falls back to HTML, so these files would be delivered to every consuming repo',
      'with `<!-- ... -->` at byte zero. For a format with a real grammar that is not',
      'a cosmetic defect -- it stops compiling, in the consumer, after distribution.',
      '',
      'Do NOT silence this by adding the extension below. Classify it in canon FIRST:',
      '',
      '  jrmoulckers/.github  sync/lib/provenance.mjs   (the stamper; the write path)',
      '  jrmoulckers/.github  sync/lib/basemerge.mjs    (keep the two tables in step)',
      '',
      'Then add the extension to CLASSIFIED in this script, recording the syntax canon',
      'actually applies. Shipping the format before canon can stamp it is the ordering',
      'that breaks consumers.',
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
