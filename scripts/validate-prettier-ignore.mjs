#!/usr/bin/env node
/**
 * Guard: every file whose bytes are owned by jrmoulckers/.github must be Prettier-ignored.
 *
 * The sync engine hashes the bytes it writes into this repository. If those bytes stop
 * matching, it cannot distinguish "the member edited this on purpose" from "canon moved
 * on", so it declines to overwrite and merely warns. Reformatting a synced file therefore
 * does not just create cosmetic drift — it permanently stops that file receiving updates,
 * and it does so quietly. `jrmoulckers/finance` spent long enough in that state for its
 * vendored tokens.css to fall to 20,889 bytes against canon's 45,465.
 *
 * A single `pnpm format` is all it takes, so the rule is enforced here rather than left
 * to `.prettierignore` staying in step with a canon surface that grows over time.
 *
 * Two shapes of canon are recognised:
 *
 *   1. Whole-file generated — carries the provenance stamp near the top.
 *   2. Managed-region — carries `studio:base` start/end markers, with member-owned
 *      content around them. Prettier cannot format around a region, so the whole file
 *      must be ignored even though only part of it is canon.
 *
 * Neither shape is used to *enumerate* the population, only to describe it. The
 * authoritative list of what sync wrote is `.studio-sync.lock.json`, and enumerating
 * from it is the whole point: a stamp is a property of a file's contents, so scanning
 * for one can only find files whose convention this script already anticipates.
 * Recognising a stamp proves a file IS canon; failing to recognise one proves nothing.
 *
 * That distinction was not academic. This guard previously scanned for the stamp in
 * the first 8 lines and saw 24 of the 59 files sync had written — every one of the 22
 * files under `.github/agents/` was invisible, because YAML frontmatter pushes their
 * stamp to line 16. Deleting `.github/agents/` from .prettierignore left 22 canon
 * Markdown files exposed to `pnpm format`, and this guard printed "OK".
 *
 * The vacuity check below could not catch that, and no refinement of it could:
 * `canonCount` stayed at a healthy 24 while a whole population was absent.
 * Non-vacuity is self-checkable; coverage is not. A check can prove it is alive using
 * nothing but itself, but it cannot prove it looked everywhere without an independent
 * statement of what everywhere is. The lock is that statement, it is maintained by the
 * engine rather than by this script, and it does not care what stamp a file carries.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import prettier from 'prettier';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PROVENANCE = 'synced from jrmoulckers/.github';
const REGION_MARKER = ['studio', 'base', 'start'].join(':');

/** The engine's own record of every path it wrote. Authoritative; stamp-agnostic. */
const LOCK = '.studio-sync.lock.json';

/**
 * This script necessarily contains the very strings it searches for, so scanning it
 * would report itself. It owns no canon, so excluding it costs no coverage.
 */
const SELF = 'scripts/validate-prettier-ignore.mjs';

/**
 * Provenance is a header convention; a passing mention deep in prose is not canon.
 *
 * This bound is why the classifier cannot be the enumerator: files with YAML
 * frontmatter carry their stamp well below it. Raising the number would trade one
 * arbitrary boundary for another, so the lock enumerates and this only classifies.
 */
const PROVENANCE_SCAN_LINES = 8;

/**
 * Every path the sync engine wrote, per its own lock file.
 *
 * Hard-fails rather than degrading to the heuristic. A missing or empty lock means
 * this script no longer knows what the population is, and the failure mode it exists
 * to prevent is precisely a confident "OK" over an unexamined set.
 */
function lockedFiles() {
  const absolute = path.join(repoRoot, LOCK);

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(absolute, 'utf8'));
  } catch (error) {
    console.error(
      `ERROR: cannot read ${LOCK} (${error.message}).\n\n` +
        'This file is the authoritative list of paths the sync engine wrote. Without it\n' +
        'this guard would fall back to scanning for a provenance stamp, which silently\n' +
        'misses any canon file whose stamp sits outside the scanned header. Refusing to\n' +
        'report success against a population this script cannot enumerate.',
    );
    process.exit(1);
  }

  const entries = Object.keys(parsed?.entries ?? {});
  if (entries.length === 0) {
    console.error(
      `ERROR: ${LOCK} lists no entries. Either the sync engine's lock format changed, or\n` +
        'this repository is no longer receiving canon. Refusing to report success.',
    );
    process.exit(1);
  }

  return entries;
}

function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 })
    .toString('utf8')
    .split('\0')
    .filter(Boolean);
}

function readTextOrNull(absolute) {
  let buffer;
  try {
    buffer = readFileSync(absolute);
  } catch {
    return null;
  }
  // A NUL byte means binary; Prettier would never format it and it carries no stamp.
  if (buffer.includes(0)) return null;
  return buffer.toString('utf8');
}

function classify(relative, text) {
  if (text.includes(REGION_MARKER)) return 'managed region';
  const header = text.split('\n', PROVENANCE_SCAN_LINES).join('\n');
  if (header.includes(PROVENANCE)) return 'generated (provenance-stamped)';
  return null;
}

async function main() {
  const offenders = [];
  const tracked = new Set(trackedFiles());

  // The lock is the population. The classifier only adds files it can prove are canon
  // but which the lock does not list yet — a locally-seeded managed region, or a file
  // from a sync whose lock write did not land. It never subtracts.
  const canon = new Map();
  const stale = [];

  for (const relative of lockedFiles()) {
    // A lock entry for a path no longer tracked is stale bookkeeping, not exposure:
    // Prettier cannot rewrite a file that is not there. Reported, never fatal.
    if (!tracked.has(relative)) {
      stale.push(relative);
      continue;
    }
    canon.set(relative, 'sync lock');
  }
  const lockCount = canon.size;

  for (const relative of tracked) {
    if (relative === SELF || canon.has(relative)) continue;

    const text = readTextOrNull(path.join(repoRoot, relative));
    if (text === null) continue;

    const kind = classify(relative, text);
    if (kind) canon.set(relative, kind);
  }

  for (const [relative, kind] of canon) {
    const absolute = path.join(repoRoot, relative);

    const info = await prettier.getFileInfo(absolute, {
      ignorePath: path.join(repoRoot, '.prettierignore'),
      resolveConfig: false,
    });

    if (!info.ignored) offenders.push({ relative, kind });
  }

  const canonCount = canon.size;

  // A guard that silently matches nothing is worse than no guard, because it reads as
  // a passing check. If the provenance convention is ever renamed this must be loud.
  //
  // Retained, but note it is now the weaker of the two defences: `lockedFiles()` fails
  // loudly on an unreadable or empty lock, which is the case this could only catch
  // after the fact. A non-zero count never established coverage — that was the bug.
  if (canonCount === 0) {
    console.error(
      'ERROR: found no canon files at all. Either the provenance convention changed, or\n' +
        'this guard is no longer looking in the right place. Refusing to report success.',
    );
    process.exit(1);
  }

  if (offenders.length > 0) {
    console.error(
      `ERROR: ${offenders.length} file(s) owned by jrmoulckers/.github are not Prettier-ignored.\n\n` +
        'Running `pnpm format` would rewrite bytes this repository does not own. The sync\n' +
        'engine would then treat each as locally-modified and stop updating it — quietly,\n' +
        'and for good. Add them to .prettierignore rather than formatting them.\n',
    );
    for (const { relative, kind } of offenders) {
      console.error(`  ${relative}  [${kind}]`);
    }
    process.exit(1);
  }

  if (stale.length > 0) {
    console.warn(
      `note: ${stale.length} ${LOCK} entr(ies) name paths no longer tracked; ` +
        'not exposure, but the lock is out of step with the tree.',
    );
  }

  console.log(
    `prettier-ignore: OK — ${canonCount} canon file(s) ` +
      `(${lockCount} from ${LOCK}, ${canonCount - lockCount} by stamp), all ignored.`,
  );
}

await main();
