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

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
}

// Format: "i/<index> w/<worktree> attr/<attrs>\t<path>"
function parseEolRows(raw) {
  return raw
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
}

function classify(root, rows) {
  const corrupt = [];
  const binaries = [];
  const crBlobs = [];
  let scanned = 0;
  let unreadable = 0;

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
        scanned += 1;
        continue;
      }
      (hasNul ? binaries : corrupt).push({ file, index, worktree });
      scanned += 1;
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
      // A tracked file that cannot be read is NOT evidence of cleanliness, and
      // silently skipping it lets the walk report OK over a corpus it never
      // opened. The caller reconciles this against rows.length; a mis-anchored
      // walk shows up here as a large `unreadable` rather than as a green run.
      unreadable += 1;
      continue;
    }
    scanned += 1;
    let cr = 0;
    for (let i = 0; i < bytes.length; i += 1) {
      if (bytes[i] === 0x0d) cr += 1;
    }
    if (cr > 0) crBlobs.push({ file, cr });
  }

  return { corrupt, binaries, crBlobs, scanned, unreadable };
}

// The corpus walk cannot reach the discriminator: it only runs for files git has
// already classified `i/-text`, and Studio tracks none. Both outcomes -- the
// exemption AND the corruption this guard exists to catch -- are therefore
// unexercised by every real run. An external survey cannot close that either:
// a fleet-wide sweep of eight repositories found 60 `-text` files and all 60
// were NUL-bearing, so the detection branch has evidence from nobody.
//
// A buffer-level self-test cannot reach it either, because classification is
// git's verdict, not ours -- it requires a real index. So this builds one.
//
// This proves the instrument functions. It is silent about where the instrument
// was pointed, which is what the corpus walk above is for.
function selfTest() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'studio-text-selftest-'));
  try {
    const g = (args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' });
    g(['init', '--quiet']);
    g(['config', 'core.autocrlf', 'false']);
    g(['config', 'user.email', 'selftest@invalid']);
    g(['config', 'user.name', 'selftest']);

    // `* !text` marks the attribute *unspecified*, restoring git's content
    // detection. An empty file is not enough: repo attributes are consulted
    // before global ones, but an empty file supplies no matching rule, so a
    // developer's global `core.attributesFile` containing `* text` still wins
    // and silently normalizes doubled-cr.txt to `i/crlf` -- retiring the very
    // fixture that reaches the discriminator. Measured: with a global
    // `* text`, an empty repo file yields `i/crlf` and `* !text` yields
    // `i/-text`. Note `* -text` would NOT work here; `-text` only appears in
    // the `attr/` column and never changes `i/`.
    mkdirSync(path.join(dir, 'sub'), { recursive: true });
    writeFileSync(path.join(dir, '.gitattributes'), '* !text\n');

    const fixtures = {
      // NUL-bearing: an ordinary binary. `-text` BECAUSE of the NUL.
      'binary.bin': Buffer.from([0x41, 0x42, 0x00, 0x43]),
      // Doubled CR: cr=4, crlf=2, so cr != crlf flips it to `-text` DESPITE
      // containing no NUL. This is the defect.
      'doubled-cr.txt': Buffer.from('a\r\r\nb\r\r\n', 'latin1'),
      // Pure CRLF: cr == crlf, so it stays text and must be caught by cr > 0.
      'sub/pure-crlf.txt': Buffer.from('a\r\nb\r\n', 'latin1'),
      'clean.txt': Buffer.from('a\nb\n', 'latin1'),
    };
    for (const [name, bytes] of Object.entries(fixtures)) {
      writeFileSync(path.join(dir, name), bytes);
    }
    g(['add', '--all']);

    // Assert the fixtures are CAPABLE before trusting what they report. A
    // doubled-CR fixture that happened to contain a NUL would land in
    // `binaries` and the corrupt assertion would fail for the wrong reason;
    // one that git did not classify `-text` would never reach the
    // discriminator at all and would pass while testing nothing.
    const rows = parseEolRows(g(['ls-files', '--eol']));
    const indexOf = (f) => rows.find((r) => r.file === f)?.index;
    const capability = [
      ['binary.bin is -text', indexOf('binary.bin') === 'i/-text'],
      ['binary.bin has a NUL', fixtures['binary.bin'].includes(0x00)],
      ['doubled-cr.txt is -text', indexOf('doubled-cr.txt') === 'i/-text'],
      ['doubled-cr.txt has NO NUL', !fixtures['doubled-cr.txt'].includes(0x00)],
      ['sub/pure-crlf.txt is not -text', indexOf('sub/pure-crlf.txt') !== 'i/-text'],
    ];
    for (const [what, ok] of capability) {
      if (!ok) {
        throw new Error(`self-test fixture is not capable of exposing the defect: ${what}`);
      }
    }

    const { corrupt, binaries, crBlobs } = classify(dir, rows);
    const names = (list) =>
      list
        .map((e) => e.file)
        .sort()
        .join(',');
    const expected = [
      ['corrupt', names(corrupt), 'doubled-cr.txt'],
      ['binaries', names(binaries), 'binary.bin'],
      ['crBlobs', names(crBlobs), 'sub/pure-crlf.txt'],
    ];
    for (const [bucket, actual, want] of expected) {
      if (actual !== want) {
        throw new Error(`self-test: ${bucket} expected [${want}], got [${actual}]`);
      }
    }

    // An unreadable `-text` file must be REPORTED, not exempted. Reached by
    // classifying against a root where the fixtures do not exist, which is
    // also what a mis-anchored walk looks like from the inside.
    const missingRoot = classify(path.join(dir, 'no-such-root'), rows);
    if (names(missingRoot.corrupt) !== 'binary.bin,doubled-cr.txt') {
      throw new Error(
        `self-test: unreadable -text files must be reported as corrupt, got [${names(missingRoot.corrupt)}]`,
      );
    }
    if (!missingRoot.corrupt.every((e) => e.unread)) {
      throw new Error('self-test: unreadable -text entries must carry unread:true');
    }
    // ...and unreadable non-`-text` files must be counted, never dropped.
    // Without this the walk can report OK over files it never opened. Stated
    // relative to rows.length so adding a fixture cannot silently break it:
    // exactly the two `-text` fixtures land in corrupt-as-unread, and every
    // remaining tracked file (including .gitattributes) counts as unreadable.
    if (missingRoot.scanned !== 2 || missingRoot.unreadable !== rows.length - 2) {
      throw new Error(
        `self-test: expected scanned=2 unreadable=${rows.length - 2} for a bad root, got ` +
          `scanned=${missingRoot.scanned} unreadable=${missingRoot.unreadable}`,
      );
    }
    if (missingRoot.scanned + missingRoot.unreadable !== rows.length) {
      throw new Error('self-test: conservation must hold even when nothing is readable');
    }

    // The root anchor, which needs BOTH `--full-name` (path base) and `-- :/`
    // (selection). `ls-files` otherwise emits CWD-relative paths, so a walk
    // launched from a subdirectory lists every file and then fails to read
    // most of them -- reporting a full-looking row count over a fraction of
    // the corpus. This asserts cwd-invariance of the listing AND that every
    // listed path still resolves, which is the property the corpus walk
    // depends on and can never test, since CI always runs it from the root.
    const fromSub = parseEolRows(
      execFileSync(
        'git',
        ['-C', path.join(dir, 'sub'), 'ls-files', '--eol', '--full-name', '--', ':/'],
        { encoding: 'utf8' },
      ),
    );
    if (fromSub.length !== rows.length) {
      throw new Error(
        `self-test: anchored ls-files is not cwd-invariant (${rows.length} from root, ${fromSub.length} from sub/)`,
      );
    }
    const subResult = classify(dir, fromSub);
    if (subResult.unreadable !== 0 || subResult.scanned !== rows.length) {
      throw new Error(
        `self-test: anchored walk from sub/ lost files ` +
          `(scanned=${subResult.scanned}/${rows.length}, unreadable=${subResult.unreadable})`,
      );
    }

    // The zero-row refusal. `main()` exits 1 rather than reporting success on
    // an empty listing; this pins the predicate that decides it, which no real
    // run can reach because the corpus is never empty.
    if (!isEmptyListing([])) {
      throw new Error('self-test: an empty listing must be refused');
    }
    if (isEmptyListing(rows)) {
      throw new Error('self-test: a populated listing must not be refused');
    }

    // The coverage verdict, on the real numbers a bad root produces.
    if (coverageFault({ listed: rows.length, scanned: 2, unreadable: rows.length - 2 }) === null) {
      throw new Error('self-test: unreadable files must be refused, not reported as success');
    }
    // Conservation specifically: files lost without being counted unreadable.
    // Stated with unreadable=0 so the unreadable branch cannot cover for it.
    if (coverageFault({ listed: rows.length, scanned: rows.length - 1, unreadable: 0 }) === null) {
      throw new Error(
        'self-test: a listed/scanned mismatch must be refused even when unreadable=0',
      );
    }
    if (coverageFault({ listed: rows.length, scanned: rows.length, unreadable: 0 }) !== null) {
      throw new Error('self-test: a fully-scanned corpus must not be refused');
    }

    // End-to-end. Everything above tests predicates in isolation and is
    // therefore silent about whether `main()` acts on them -- deleting the
    // `if (fault)` branch leaves every assertion above green. So run this
    // script as a real process against a repo that is genuinely corrupt and
    // require a non-zero exit. The env guard stops the child from spawning
    // its own child.
    if (!process.env.STUDIO_TEXT_SELFTEST_CHILD) {
      const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
        cwd: dir,
        encoding: 'utf8',
        env: { ...process.env, STUDIO_TEXT_SELFTEST_CHILD: '1' },
      });
      if (child.status !== 1) {
        throw new Error(
          `self-test: end-to-end run over a corrupt repo must exit 1, got ${child.status}. ` +
            `main() is not acting on the classification.`,
        );
      }
      if (!/doubled-cr\.txt/.test(child.stdout + child.stderr)) {
        throw new Error('self-test: end-to-end failure must name the corrupt file');
      }

      // A second end-to-end, for the coverage branch specifically. The repo
      // above is corrupt but fully READABLE, so `fault` is null there and
      // deleting the `if (fault)` branch leaves it green. This one is clean
      // but under-readable: a file staged in the index and then removed from
      // disk, which is what a mis-anchored or partially-checked-out walk looks
      // like to main(). It must refuse rather than report success.
      const short = mkdtempSync(path.join(os.tmpdir(), 'studio-text-coverage-'));
      try {
        const h = (a) => execFileSync('git', ['-C', short, ...a], { encoding: 'utf8' });
        h(['init', '--quiet']);
        h(['config', 'core.autocrlf', 'false']);
        writeFileSync(path.join(short, '.gitattributes'), '* !text\n');
        writeFileSync(path.join(short, 'clean.txt'), Buffer.from('a\nb\n', 'latin1'));
        writeFileSync(path.join(short, 'vanishes.txt'), Buffer.from('c\nd\n', 'latin1'));
        h(['add', '--all']);
        rmSync(path.join(short, 'vanishes.txt'));
        const cover = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
          cwd: short,
          encoding: 'utf8',
          env: { ...process.env, STUDIO_TEXT_SELFTEST_CHILD: '1' },
        });
        if (cover.status !== 1) {
          throw new Error(
            `self-test: end-to-end run over an under-readable repo must exit 1, got ${cover.status}. ` +
              `main() is not acting on the coverage fault.`,
          );
        }
        if (!/could not read/.test(cover.stdout + cover.stderr)) {
          throw new Error('self-test: under-readable failure must report unread files');
        }
      } finally {
        rmSync(short, { recursive: true, force: true });
      }

      // A third end-to-end, launched from a SUBDIRECTORY. The two runs above
      // both use cwd = repo root, where cwd-relative and root-relative paths
      // coincide -- so dropping `--full-name`/`-- :/` from main()'s own listing
      // changes nothing they can observe. Measured: that mutation survives the
      // entire self-test, because the cwd-invariance assertion above pins a
      // listing it constructs itself rather than the one main() evaluates.
      //
      // The corruption lives at the ROOT and the subdirectory holds only a
      // clean file whose name does not exist at the root. An unanchored walk
      // launched from sub/ therefore lists that one file, fails to resolve it
      // against the repo root, and exits 1 via the COVERAGE fault -- so exit
      // status alone cannot tell the two apart. The assertion is on the
      // message: an anchored walk names the corrupt file.
      const deep = mkdtempSync(path.join(os.tmpdir(), 'studio-text-anchor-'));
      try {
        const d = (a) => execFileSync('git', ['-C', deep, ...a], { encoding: 'utf8' });
        d(['init', '--quiet']);
        d(['config', 'core.autocrlf', 'false']);
        mkdirSync(path.join(deep, 'nested'), { recursive: true });
        writeFileSync(path.join(deep, '.gitattributes'), '* !text\n');
        writeFileSync(path.join(deep, 'doubled-cr.txt'), Buffer.from('a\r\r\nb\r\r\n', 'latin1'));
        writeFileSync(path.join(deep, 'nested', 'only-here.txt'), Buffer.from('a\nb\n', 'latin1'));
        d(['add', '--all']);
        const fromNested = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
          cwd: path.join(deep, 'nested'),
          encoding: 'utf8',
          env: { ...process.env, STUDIO_TEXT_SELFTEST_CHILD: '1' },
        });
        if (fromNested.status !== 1) {
          throw new Error(
            `self-test: run from a subdirectory must exit 1, got ${fromNested.status}.`,
          );
        }
        const said = fromNested.stdout + fromNested.stderr;
        if (!/doubled-cr\.txt/.test(said)) {
          throw new Error(
            "self-test: main()'s listing is not anchored -- a run from a subdirectory " +
              'did not reach the root corruption. Got: ' +
              said.replace(/\s+/g, ' ').trim().slice(0, 160),
          );
        }
      } finally {
        rmSync(deep, { recursive: true, force: true });
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function isEmptyListing(rows) {
  return rows.length === 0;
}

// The walk's verdict about its own coverage, separated from the walk so it can
// be exercised. A clean corpus always yields unreadable=0, so no real run can
// ever reach these branches -- the same reason the discriminator went untested.
function coverageFault({ listed, scanned, unreadable }) {
  if (scanned + unreadable !== listed) {
    return `accounting error — listed ${listed}, scanned ${scanned}, unreadable ${unreadable}.`;
  }
  if (unreadable > 0) {
    return `could not read ${unreadable} of ${listed} tracked file(s). Refusing to report success.`;
  }
  return null;
}

function main() {
  selfTest();

  const root = git(['rev-parse', '--show-toplevel']).trim();
  // `--full-name` sets the path BASE to the repo root; `-- :/` sets the
  // SELECTION to the whole repo. Both are required and neither implies the
  // other: from packages/tokens, `-- :/` alone lists all 208 files but prints
  // 134 of them with `../../` prefixes, which do not resolve against `root`.
  const rows = parseEolRows(git(['ls-files', '--eol', '--full-name', '--', ':/']));

  if (isEmptyListing(rows)) {
    console.error('text-classification: inspected 0 files. Refusing to report success.');
    process.exit(1);
  }

  const { corrupt, binaries, crBlobs, scanned, unreadable } = classify(root, rows);

  const fault = coverageFault({ listed: rows.length, scanned, unreadable });
  if (fault) {
    console.error(`text-classification: ${fault}`);
    process.exit(1);
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
