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
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import prettier from 'prettier';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PROVENANCE = 'synced from jrmoulckers/.github';
const REGION_MARKER = ['studio', 'base', 'start'].join(':');

/**
 * This script necessarily contains the very strings it searches for, so scanning it
 * would report itself. It owns no canon, so excluding it costs no coverage.
 */
const SELF = 'scripts/validate-prettier-ignore.mjs';

/** Provenance is a header convention; a passing mention deep in prose is not canon. */
const PROVENANCE_SCAN_LINES = 8;

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
  let canonCount = 0;

  for (const relative of trackedFiles()) {
    if (relative === SELF) continue;

    const absolute = path.join(repoRoot, relative);
    const text = readTextOrNull(absolute);
    if (text === null) continue;

    const kind = classify(relative, text);
    if (!kind) continue;

    canonCount += 1;

    const info = await prettier.getFileInfo(absolute, {
      ignorePath: path.join(repoRoot, '.prettierignore'),
      resolveConfig: false,
    });

    if (!info.ignored) offenders.push({ relative, kind });
  }

  // A guard that silently matches nothing is worse than no guard, because it reads as
  // a passing check. If the provenance convention is ever renamed this must be loud.
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

  console.log(`prettier-ignore: OK — ${canonCount} canon file(s), all ignored.`);
}

await main();
