#!/usr/bin/env node
/**
 * Guard: every file the sync engine wrote must still hash to what the engine recorded.
 *
 * `.studio-sync.lock.json` carries a `targetSha256` for every path sync wrote into this
 * repository. Nothing here read that field. `validate-prettier-ignore.mjs` reads the lock
 * for *paths*, to prove each canon path is Prettier-ignored; `validate-principles.mjs`
 * hashes a different corpus; the text and dist guards check line endings and extensions.
 * So "are my canon files intact?" had no local answer.
 *
 * That matters because the engine cannot distinguish "the member edited this on purpose"
 * from "canon moved on". Once a file's bytes stop matching, it is classified as drift and
 * quietly stops receiving updates — the same permanent-skip failure
 * `validate-prettier-ignore.mjs` exists to prevent, reached by editing bytes rather than
 * by reformatting them. AGENTS.md already forbids editing synced outputs here; this makes
 * that rule checkable rather than remembered.
 *
 * Two shapes, and the difference is not cosmetic:
 *
 *   1. Whole-file entries hash the file's bytes.
 *   2. Managed-region entries hash only the content *between* the markers — markers
 *      excluded, no trailing newline. Everything outside the region is member-owned and
 *      must stay free to change. Verified against the lock rather than assumed: for
 *      `.gitattributes` the inside-only digest matches `targetSha256` exactly while
 *      whole-file, inside-with-markers and inside-plus-newline all fail, so the rule is
 *      discriminating rather than lucky.
 *
 * A guard that passes cannot be trusted until it has been shown able to fail, so the
 * behaviour was mutation-proved before this script was written: a byte flipped inside a
 * managed region fails; an edit *outside* the region still passes; a byte-identical
 * restore passes. The middle case is the load-bearing one — without it, region-scoped
 * verification and a blunt whole-file comparison are indistinguishable, and they diverge
 * on exactly the edits members are entitled to make.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The engine's own record of every path it wrote, and the digest it wrote them at. */
const LOCK = '.studio-sync.lock.json';

/**
 * Region delimiters, anchored to a whole line and built from parts.
 *
 * Anchoring is what excludes prose. Canon's own body documents this convention, so a
 * substring test matches any sentence naming the markers: `.github/copilot-instructions.md`
 * discusses them at line 52 while its real end marker is at line 153. A substring matcher
 * therefore hashes lines 8..51 and reports a mismatch on an intact file — failing with a
 * *wrong* region rather than with no region, which reads as corruption rather than as a
 * broken parser. `validate-prettier-ignore.mjs` documents the same trap; this mirrors it.
 *
 * The comment syntax is left open because it varies by file type — `<!-- -->` in Markdown,
 * `#` in .gitattributes — and hardcoding the Markdown form would make .gitattributes
 * invisible here. Assembling the marker from parts keeps this script from matching itself.
 */
const marker = (word) =>
  new RegExp(
    String.raw`^(?:<!--|#|\/\*|\/\/)\s*` +
      ['studio', 'base', word].join(':') +
      String.raw`\s*(?:-->|\*\/)?$`,
  );

const REGION_START = marker('start');
const REGION_END = marker('end');

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

/**
 * Every entry the sync engine wrote, per its own lock file.
 *
 * Presence is decided here, at the boundary, because `absent` and `empty` need opposite
 * fixes and a nullish default would merge them at the moment of reading — destroying the
 * evidence before any check could consult it. A schema change must not arrive disguised
 * as an empty lock, and neither may report success.
 */
function lockedEntries() {
  const absolute = path.join(repoRoot, LOCK);

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(absolute, 'utf8'));
  } catch (error) {
    console.error(
      `ERROR: cannot read ${LOCK} (${error.message}).\n\n` +
        'This file records both the paths sync wrote and the digests it wrote them at.\n' +
        'Without it this guard has no statement of what canon is. Refusing to report\n' +
        'success against a population it cannot enumerate.',
    );
    process.exit(1);
  }

  if (!Object.prototype.hasOwnProperty.call(parsed ?? {}, 'entries')) {
    console.error(
      `ERROR: ${LOCK} has no "entries" key. This is a schema change, not an empty lock —\n` +
        'the two need opposite fixes and must not report the same way. Refusing to\n' +
        'report success.',
    );
    process.exit(1);
  }

  const entries = Object.entries(parsed.entries);
  if (entries.length === 0) {
    console.error(
      `ERROR: ${LOCK} lists no entries. Either this repository is no longer receiving\n` +
        'canon, or the lock was truncated. Refusing to report success over an empty set.',
    );
    process.exit(1);
  }

  return entries;
}

/**
 * The canon-owned span of a managed file: the lines strictly between the delimiters.
 *
 * Returns null when the file carries no region, which is the ordinary whole-file case.
 * A start without a matching end is *not* treated as whole-file: that would silently
 * substitute one hashing rule for another and report a mismatch the reader would read
 * as corruption, so it is surfaced as its own failure.
 */
function managedRegion(relative, text) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => REGION_START.test(line.trim()));
  if (start === -1) return null;

  const end = lines.findIndex((line, index) => index > start && REGION_END.test(line.trim()));
  if (end === -1) {
    console.error(
      `ERROR: ${relative} opens a managed region that is never closed.\n\n` +
        'Refusing to fall back to hashing the whole file: that would report a content\n' +
        'mismatch on a file whose content may be intact, and send the reader after the\n' +
        'wrong defect.',
    );
    process.exit(1);
  }

  return lines.slice(start + 1, end).join('\n');
}

function main() {
  const entries = lockedEntries();

  let verified = 0;
  let managed = 0;
  const mismatched = [];
  const missing = [];
  const unhashed = [];

  for (const [relative, entry] of entries) {
    const expected = entry?.targetSha256;
    if (typeof expected !== 'string' || expected.length === 0) {
      // Nothing to compare and compared-and-equal must not produce the same output.
      unhashed.push(relative);
      continue;
    }

    let buffer;
    try {
      buffer = readFileSync(path.join(repoRoot, relative));
    } catch {
      missing.push(relative);
      continue;
    }

    const region = buffer.includes(0) ? null : managedRegion(relative, buffer.toString('utf8'));
    const actual = region === null ? sha256(buffer) : sha256(Buffer.from(region, 'utf8'));
    if (region !== null) managed += 1;

    if (actual === expected) {
      verified += 1;
    } else {
      mismatched.push({ relative, expected, actual, region: region !== null });
    }
  }

  if (unhashed.length > 0) {
    console.error(
      `ERROR: ${unhashed.length} lock entr(ies) carry no targetSha256:\n` +
        unhashed.map((p) => `  ${p}`).join('\n') +
        '\n\nAn entry with nothing to compare is a failure, not a pass.',
    );
  }

  if (missing.length > 0) {
    console.error(
      `ERROR: ${missing.length} file(s) recorded in ${LOCK} are absent from the tree:\n` +
        missing.map((p) => `  ${p}`).join('\n') +
        '\n\nSync recorded writing these. Deleting a synced file locally does not stop it\n' +
        'being canon; it removes the evidence that it is.',
    );
  }

  if (mismatched.length > 0) {
    console.error(`ERROR: ${mismatched.length} canon file(s) no longer match the lock:\n`);
    for (const item of mismatched) {
      console.error(`  ${item.relative}${item.region ? '  (managed region)' : ''}`);
      console.error(`     recorded ${item.expected}`);
      console.error(`     actual   ${item.actual}`);
    }
    console.error(
      '\nThese bytes are owned by jrmoulckers/.github and are not edited here. The engine\n' +
        'cannot tell a deliberate edit from canon moving on, so a file in this state is\n' +
        'classified as drift and stops receiving updates — quietly, and for good.\n\n' +
        'Restore the recorded content (`git checkout -- <path>`, or re-run the sync) rather\n' +
        'than updating the lock. If the change is genuinely wanted, it belongs upstream in\n' +
        'jrmoulckers/.github.',
    );
  }

  if (unhashed.length + missing.length + mismatched.length > 0) process.exit(1);

  console.log(
    `canon-lock: OK — ${verified} canon file(s) match .studio-sync.lock.json ` +
      `(${managed} managed region(s), ${verified - managed} whole-file).`,
  );
}

main();
