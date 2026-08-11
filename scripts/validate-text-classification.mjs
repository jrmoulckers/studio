#!/usr/bin/env node
// Asserts no tracked text file has been silently reclassified as binary by
// doubled-CR corruption, and no committed text blob carries a stray CR.
//
// Why this exists
// ---------------
// Git's binary heuristic is not only about NUL bytes. Git classifies a blob
// `-text` when its CR count DIFFERS from its CRLF-pair count -- `cr != crlf`,
// an inequality, not a majority. One carriage return outside a CRLF pair is
// enough. Measured:
//
//   cr=20 crlf=20 nul=0  ->  i/crlf    (pure CRLF, fine)
//   cr=21 crlf=20 nul=0  ->  i/-text   (ONE lone CR flips it)
//   cr=40 crlf=20 nul=0  ->  i/-text   (doubled \r\r\n)
//
// There is no tolerance band and no gradual slide. Canon shipped thirteen
// community-health files in that state -- doubled `\r\r\n` terminators, zero
// NUL bytes, classified binary.
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
// Studio's text-only constraint is load-bearing for the SYNCED SURFACE, not for
// the repository at large: the sync engine prepends a provenance comment to
// every file it transports, which is impossible for a binary. That surface has
// its own two guards -- `dist.mjs` rejects non-UTF-8, and
// `validate-dist-extensions.mjs` rejects any extension whose comment syntax
// isn't classified (verified: a PNG staged into dist/ fails it by name).
//
// So this check does NOT fail on an ordinary binary. Classification here is
// EMPIRICAL, not declared: an asset is `-text` BECAUSE it contains NUL bytes,
// while doubled-CR corruption is `-text` DESPITE containing none. That
// conjunction -- `-text` AND no NUL -- is the whole discriminator, and it needs
// no allowlist: a logo added tomorrow exempts itself by being a real binary.
//
// `git check-attr text` cannot make this distinction. Under canon's
// `* text=auto`, an undeclared PNG and a doubled-CR Markdown file BOTH resolve
// to `auto`; only an explicit `binary` rule yields `unset`. Asking git to
// separate them sounds more principled than reading bytes -- "only git resolves
// attributes" is the right rule for ADR-0011 -- but it is the wrong predicate
// here, because the answer does not vary between the two cases.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

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

  const corrupt = [];
  const binaries = [];
  const crBlobs = [];

  for (const { index, worktree, file } of rows) {
    if (index === 'i/-text') {
      // Read the bytes, because only the bytes separate the two causes. A NUL
      // byte means an ordinary binary -- exempt, and telling someone to
      // "rewrite it with LF terminators" would destroy it. No NUL means the
      // doubled-CR corruption, which is the defect this guard exists to catch.
      let hasNul;
      try {
        hasNul = readFileSync(path.join(root, file)).includes(0x00);
      } catch {
        // Absent from the working tree, so the cause cannot be determined.
        // Report it rather than exempting it: an unreadable `-text` file is
        // the one case where silence could hide real corruption.
        corrupt.push({ file, index, worktree, unread: true });
        continue;
      }
      (hasNul ? binaries : corrupt).push({ file, index, worktree });
      continue;
    }

    // A single stray CR is not a precursor -- it is the defect. Git flips a blob
    // to `-text` on `cr != crlf`, so one carriage return outside a CRLF pair is
    // already enough, at which point eol=lf stops applying and renormalize can
    // no longer repair it. There is no safe number of stray CRs to tolerate,
    // which is why this fails on cr > 0 rather than on any ratio.
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

  if (corrupt.length === 0 && crBlobs.length === 0) {
    const note = binaries.length ? ` ${binaries.length} binary file(s) exempt (NUL-bearing).` : '';
    console.log(
      `text-classification: OK — ${rows.length} tracked file(s), no doubled-CR corruption, no stray CR.${note}`,
    );
    return;
  }

  if (corrupt.length) {
    console.error(
      `\ntext-classification: ${corrupt.length} tracked file(s) classified as binary with no NUL byte:\n`,
    );
    for (const { file, index, worktree, unread } of corrupt) {
      console.error(`  ${file}  (${index} ${worktree})${unread ? '  [unreadable]' : ''}`);
    }
    console.error(
      '\nGit treats a blob as binary when its CR count differs from its CRLF-pair',
      '\ncount (`cr != crlf`) -- an inequality, not a majority -- even with no NUL',
      '\nbytes. Such a file is exempt from `eol=lf`, and `git add --renormalize`',
      '\nskips it -- so it cannot repair itself. Rewrite the file with LF terminators',
      '\nand commit the result.',
      '\n\nA file marked [unreadable] was absent from the working tree, so its cause',
      '\ncould not be determined; it is reported rather than exempted.',
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
