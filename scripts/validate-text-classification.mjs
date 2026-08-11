#!/usr/bin/env node
// Asserts no tracked file is classified as binary, and no committed text blob
// carries a stray CR.
//
// Why this exists
// ---------------
// Git's binary heuristic is not only about NUL bytes. A file whose CR count
// exceeds its CRLF pairs is classified `-text`. Canon shipped thirteen
// community-health files in exactly that state -- doubled `\r\r\n`
// terminators, zero NUL bytes, classified binary.
//
// Three properties compound into a silent defect:
//
//   1. `-text` files are EXEMPT from `eol=lf`, so a correct .gitattributes
//      becomes inert for precisely the files that need it.
//   2. `git add --renormalize` SKIPS binary files, so the corruption blocks
//      its own repair -- the remedy reports success and changes nothing.
//   3. `git diff` uses NUL-based detection, so review and blame look normal.
//
// Studio's existing guards do not cover this. `dist.mjs` rejects files that
// aren't valid UTF-8, but a doubled-CR file IS valid UTF-8: it passes the
// encoding check and still becomes `-text`.
//
// Studio tracks no binaries -- the text-only dist/ constraint means there is
// no legitimate `-text` file to exempt -- so this invariant needs no carve-out
// list. If Studio ever legitimately tracks a binary, add it to ALLOWED_BINARY
// deliberately rather than weakening the check.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// Deliberately empty. An entry here is a decision, not a default.
const ALLOWED_BINARY = new Set();

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
}

function main() {
  const root = git(['rev-parse', '--show-toplevel']).trim();

  // Format: "i/<index> w/<worktree> attr/<attrs>\t<path>"
  const rows = git(['ls-files', '--eol'])
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const tab = line.indexOf('\t');
      const fields = line.slice(0, tab).trim().split(/\s+/);
      return {
        index: fields[0],
        worktree: fields[1],
        file: line.slice(tab + 1).trim(),
      };
    });

  if (rows.length === 0) {
    console.error('text-classification: inspected 0 files. Refusing to report success.');
    process.exit(1);
  }

  const binary = [];
  const crBlobs = [];

  for (const { index, worktree, file } of rows) {
    if (ALLOWED_BINARY.has(file)) continue;

    if (index === 'i/-text') {
      binary.push({ file, index, worktree });
      continue;
    }

    // A stray CR in a committed blob is the precursor: enough of them and the
    // file crosses into `-text`, at which point eol=lf stops applying and
    // renormalize can no longer repair it.
    let bytes;
    try {
      bytes = readFileSync(path.join(root, file));
    } catch {
      continue; // absent from the working tree (e.g. sparse checkout)
    }
    let cr = 0;
    for (let i = 0; i < bytes.length; i += 1) {
      if (bytes[i] === 0x0d) cr += 1;
    }
    if (cr > 0) crBlobs.push({ file, cr });
  }

  if (binary.length === 0 && crBlobs.length === 0) {
    console.log(
      `text-classification: OK — ${rows.length} tracked file(s), none classified -text, no stray CR.`,
    );
    return;
  }

  if (binary.length) {
    console.error(
      `\ntext-classification: ${binary.length} tracked file(s) classified as binary by git:\n`,
    );
    for (const { file, index, worktree } of binary) {
      console.error(`  ${file}  (${index} ${worktree})`);
    }
    console.error(
      '\nA file whose CR count exceeds its CRLF pairs is treated as binary even with',
      '\nno NUL bytes. Such a file is exempt from `eol=lf`, and `git add --renormalize`',
      '\nskips it -- so it cannot repair itself. Rewrite the file with LF terminators',
      '\nand commit the result.',
    );
  }

  if (crBlobs.length) {
    console.error(`\ntext-classification: ${crBlobs.length} tracked file(s) contain CR bytes:\n`);
    for (const { file, cr } of crBlobs) {
      console.error(`  ${file}  (${cr} CR)`);
    }
    console.error('\nCommitted blobs must use LF. Strip the CR bytes and commit the result.');
  }

  console.error('');
  process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(`text-classification: ${error.message}`);
  process.exit(1);
}
