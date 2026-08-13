#!/usr/bin/env node
/**
 * Reporter: which canon files in this repository have been superseded upstream?
 *
 * `.studio-sync.lock.json` carries two digests per entry and they answer different
 * questions. `targetSha256` is the bytes the engine wrote *here*, so it answers
 * **conformance** — has this repository drifted from what sync produced?
 * `sourceSha256` is the bytes of canon's *source* file at the moment of delivery, so it
 * answers **currency** — has canon moved since? `validate-canon-lock.mjs` reads the first
 * and gates `pnpm test`. Nothing read the second: it is recorded on every entry and was
 * consumed by no file in this repository, so "are my canon files current?" had no local
 * answer while the answer sat in a tracked file at per-file resolution.
 *
 * The two must not be merged into one verdict. A conformance guard reports `OK` on a tree
 * whose canon is months behind — correctly, because drift is what it was built to detect —
 * and that `OK` is then read as "my canon is fine". For currency it returns the ideal value
 * however far behind the repository is, which is the most reassuring output an instrument
 * has and the one nobody re-opens.
 *
 * ## Why this is a report and never a gate
 *
 * Being behind canon is the normal steady state of a member repository. It is not a defect
 * here, it is not caused here, and it cannot be fixed here — the remedy is an upstream
 * dispatch. A check that failed on it would be permanently red and would be switched off
 * within a week, taking the conformance gate's credibility with it. So this script is
 * deliberately outside `pnpm test`, mirroring `principles:verify-live`, and exits non-zero
 * only when it could not *perform* the measurement. Staleness is a finding, not a failure.
 *
 * ## Inferred paths are a failure mode of their own
 *
 * The lock records the path sync *wrote* and not the path it read, so the canon source path
 * is derived here rather than looked up. A derivation can be wrong, and a path that does not
 * resolve must never be reported as "stale": the two need opposite fixes — one is an upstream
 * delivery, the other is a bug in this file — and reporting them the same way sends the
 * reader after the wrong defect. Unresolved paths are counted separately and fail the run.
 *
 * ## Shown able to discriminate
 *
 * A reporter that cannot return the other answer certifies nothing. When this was written
 * the tree at `5a9e085` returned 59 current and 1 stale against canon `6d25a92`, so the
 * comparison is live rather than uniform; and `sourceSha256` for the one stale file resolved
 * byte-exactly to canon's copy at `d13f39a`, the revision this repository was delivered.
 * Because a clean verdict over an empty population is indistinguishable from a clean verdict
 * over a real one, the population is asserted before any result is printed.
 *
 * ## A count cannot express how far behind a file is
 *
 * The verdict led with `N current, M superseded` — a count, which reads identically whether
 * one file is a revision behind or a third of a megabyte behind, and which keeps reading
 * identically as the gap widens. Worse, it reads *reassuringly* exactly when it should not:
 * staleness concentrates in the largest file, because the largest file is the one that
 * changes most, so a one-in-sixty count can sit atop a majority of the delivered bytes.
 *
 * So a byte deficit is reported per file and in the headline — and only when proven. The
 * lock records no size, so the delivered source size is reconstructed from the target file
 * and accepted only if it reproduces `sourceSha256`; otherwise the deficit is `unknown`.
 * The tempting fallback — subtract the target file's size — is forbidden, because the target
 * carries the injected provenance line and canon's source does not, making the result wrong
 * by the stamp. That error is far too small to change any verdict, which is exactly why
 * nothing downstream would ever surface it.
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The engine's own record of every path it wrote, and the digests it wrote them at. */
const LOCK = '.studio-sync.lock.json';

/** Canon lives in one repository; the lock names it, and this is the fallback. */
const DEFAULT_BACKBONE = 'jrmoulckers/.github';

/**
 * How far into a target to look for the injected provenance block.
 *
 * The engine writes it at the top, but not always at line 1 — a Markdown file with
 * frontmatter carries it below the closing delimiter, and agent and prompt files here put it
 * as far down as line 26. A bounded search keeps a failed reconstruction cheap; it is not
 * what keeps it honest. Acceptance is a sha256 match against the recorded `sourceSha256`, so
 * widening the candidate set cannot admit a wrong answer, only find a right one.
 */
const PROVENANCE_SEARCH_LINES = 40;

/**
 * How many consecutive lines the injected block may occupy.
 *
 * Measured across this repo's lock: 54 of 60 entries reconstruct by removing one line, and
 * four skill checklists need two — the stamp plus the blank line under it. Constraining the
 * *shape* to one line was an error of the same kind a count is: it refused six entries whose
 * size is fully provable, and an over-refusal spends the credibility of the refusals that are
 * real. The two managed-region merges must still refuse, and they do, because no removal
 * reproduces their digest at any width.
 *
 * The removed *width* is a second quantity, and it is not the stamp's width. Comment syntax
 * fixes the stamp; block shape fixes the removal; they diverge wherever a blank line follows.
 * Measured here: 73 B once (`agency.toml`, hash syntax), 80 B on 53 Markdown files (HTML
 * syntax), and 81 B on the four checklists — the same 80-byte HTML stamp plus the blank line,
 * a width no comment-syntax table can produce. Anyone correcting a byte deficit by hand needs
 * the removal width, so reaching for the engine's syntax table returns a plausible wrong
 * answer rather than an obviously missing one.
 *
 * Note what the pre-widening instrument could report about this. Permitting only one-line
 * removals left those four entries unproven, contributing no width, so a census of observed
 * widths returned exactly two and read as complete. The bound under test and the quantity
 * being measured were the same variable: a shape-constrained search cannot enumerate shapes,
 * and nothing in its output says so.
 */
const PROVENANCE_MAX_LINES = 2;

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

const KNOWN_ARGS = new Set(['--json']);

function parseArgs(argv) {
  const options = { ref: 'main', json: false };
  const unknown = [];

  for (const argument of argv) {
    if (argument.startsWith('--ref=')) {
      options.ref = argument.slice('--ref='.length);
      continue;
    }
    if (KNOWN_ARGS.has(argument)) {
      options.json = options.json || argument === '--json';
      continue;
    }
    unknown.push(argument);
  }

  if (unknown.length > 0) {
    console.error(
      `ERROR: unknown argument(s): ${unknown.join(', ')}\n\n` +
        'Usage: node scripts/report-canon-currency.mjs [--ref=<canon ref>] [--json]',
    );
    process.exit(1);
  }

  if (options.ref.trim().length === 0) {
    console.error('ERROR: --ref was given an empty value. Refusing to guess a canon revision.');
    process.exit(1);
  }

  return options;
}

/**
 * The whole lock, with presence decided at the boundary.
 *
 * `absent` and `empty` need opposite fixes, so a nullish default here would merge them at
 * the moment of reading and destroy the evidence before any check could consult it. A
 * schema change must not arrive disguised as an empty lock, and neither may report success.
 */
function readLock() {
  const absolute = path.join(repoRoot, LOCK);

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(absolute, 'utf8'));
  } catch (error) {
    console.error(
      `ERROR: cannot read ${LOCK} (${error.message}).\n\n` +
        'This file is the only local record of which canon revision each file came from.\n' +
        'Without it there is no population to measure. Refusing to report currency against\n' +
        'a set this script cannot enumerate.',
    );
    process.exit(1);
  }

  if (!Object.prototype.hasOwnProperty.call(parsed ?? {}, 'entries')) {
    console.error(
      `ERROR: ${LOCK} has no "entries" key. This is a schema change, not an empty lock —\n` +
        'the two need opposite fixes and must not report the same way.',
    );
    process.exit(1);
  }

  const entries = Object.entries(parsed.entries);
  if (entries.length === 0) {
    console.error(
      `ERROR: ${LOCK} lists no entries. Either this repository is no longer receiving canon,\n` +
        'or the lock was truncated. Refusing to report "all current" over an empty set.',
    );
    process.exit(1);
  }

  return { entries, backbone: parsed.backbone, generatedAt: parsed.generatedAt };
}

/**
 * The canon path a target path was rendered from.
 *
 * Canon's trees are mounted under `.github/` here — `agents/x` arrives as
 * `.github/agents/x` — while root-level targets such as `.gitattributes` and `agency.toml`
 * keep their name. This is a derivation, not a record, which is why an unresolvable result
 * is surfaced rather than folded into the stale count.
 */
function canonSourcePath(targetPath) {
  return targetPath.startsWith('.github/') ? targetPath.slice('.github/'.length) : targetPath;
}

function githubToken() {
  const environmentToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (environmentToken?.trim()) return environmentToken.trim();
  try {
    return execFileSync('gh', ['auth', 'token'], {
      encoding: 'utf8',
      windowsHide: true,
    }).trim();
  } catch {
    console.error(
      'ERROR: this reporter reads canon over the API and found no credentials.\n\n' +
        'Set GH_TOKEN or GITHUB_TOKEN, or authenticate `gh`. Refusing to report currency\n' +
        'without having read canon — an unreachable source and an up-to-date one must not\n' +
        'produce the same output.',
    );
    process.exit(1);
  }
}

async function githubJson(url, token) {
  let lastStatus = 0;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'jrm-studio-canon-currency',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (response.ok) return response.json();
    lastStatus = response.status;

    // 404 is a statement about the path and will not improve on retry.
    if (response.status === 404) return { notFound: true };
    if (response.status < 500 && response.status !== 403) break;

    await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
  }

  throw new Error(`GitHub API returned ${lastStatus} for ${url}`);
}

/**
 * Canon's bytes for one path, as bytes rather than as text.
 *
 * The contents endpoint stops inlining content above 1MB and canon's largest file is
 * growing steadily toward that, so the blob endpoint is used as a fallback rather than
 * left as a future outage. Decoding base64 into a Buffer keeps the comparison byte-exact:
 * a decoded string would be compared in UTF-16 units and would silently disagree with a
 * digest taken over UTF-8.
 */
async function fetchCanonBytes(repository, sourcePath, ref, token) {
  const encoded = sourcePath.split('/').map(encodeURIComponent).join('/');
  const payload = await githubJson(
    `https://api.github.com/repos/${repository}/contents/${encoded}?ref=${encodeURIComponent(ref)}`,
    token,
  );

  if (payload.notFound) return null;
  if (payload.type !== 'file') return null;

  if (payload.encoding === 'base64' && typeof payload.content === 'string') {
    return Buffer.from(payload.content, 'base64');
  }

  if (typeof payload.sha === 'string') {
    const blob = await githubJson(
      `https://api.github.com/repos/${repository}/git/blobs/${payload.sha}`,
      token,
    );
    if (!blob.notFound && blob.encoding === 'base64' && typeof blob.content === 'string') {
      return Buffer.from(blob.content, 'base64');
    }
  }

  return null;
}

/**
 * How many bytes of canon does one delivered file represent?
 *
 * The lock records `sourceSha256`, `targetSha256` and `syncedAt` — and no byte size at all.
 * So the delivered source size cannot be read; it can only be *reconstructed* from the file
 * on disk, and a reconstruction is worth nothing unless it is proven.
 *
 * The engine injects a provenance block into most whole-file targets, so the target and the
 * canon source differ by that block. Removing a bounded run of lines and hashing the
 * remainder either reproduces `sourceSha256` — in which case the size is established, not
 * estimated — or it does not, in which case this returns null and the caller must report the
 * deficit as unknown. Managed-region merges and rendered targets fall in the second class by
 * design: no removal reproduces their digest, because the engine rewrote their interior.
 *
 * Note where the safety comes from. It is the digest, not the search bounds — the bounds only
 * decide how many candidates are tried. Tightening them does not make a wrong answer less
 * likely; it makes a right answer less findable, and the entries it loses are reported as
 * unknown alongside the ones that are genuinely unprovable.
 *
 * The forbidden shortcut is subtracting the *target* size from canon's size. Those are
 * different byte channels and the difference is the injected stamp, so the result is wrong
 * by exactly the provenance line. It is a small error that changes no conclusion, which is
 * precisely why nothing would ever catch it.
 */
function deliveredSourceBytes(target, sourceSha256) {
  let buf;
  try {
    buf = readFileSync(path.join(repoRoot, target));
  } catch {
    return { bytes: null, reason: 'target file is not present in this checkout' };
  }

  if (sha256(buf) === sourceSha256) {
    // Delivered verbatim: the target *is* the canon source.
    return { bytes: buf.length, reason: null, shape: 'verbatim' };
  }

  const lines = buf.toString('utf8').split('\n');
  const limit = Math.min(PROVENANCE_SEARCH_LINES, lines.length);
  for (let i = 0; i < limit; i++) {
    for (let run = 1; run <= PROVENANCE_MAX_LINES; run++) {
      if (i + run > lines.length) break;
      const withoutBlock = lines
        .slice(0, i)
        .concat(lines.slice(i + run))
        .join('\n');
      const candidate = Buffer.from(withoutBlock, 'utf8');
      if (sha256(candidate) === sourceSha256) {
        return {
          bytes: candidate.length,
          reason: null,
          shape: `stamp at line ${i + 1}, ${run} line(s), ${buf.length - candidate.length} bytes`,
        };
      }
    }
  }

  return {
    bytes: null,
    reason: 'delivered source size is not reconstructible from the target file',
    shape: null,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { entries, backbone, generatedAt } = readLock();
  const repository =
    typeof backbone === 'string' && backbone.length > 0 ? backbone : DEFAULT_BACKBONE;
  const token = githubToken();

  const current = [];
  const stale = [];
  const unresolved = [];
  const unhashed = [];

  for (const [target, entry] of entries) {
    const recorded = entry?.sourceSha256;
    if (typeof recorded !== 'string' || recorded.length === 0) {
      // Nothing to compare and compared-and-equal must not produce the same output.
      unhashed.push(target);
      continue;
    }

    const source = canonSourcePath(target);

    let bytes;
    try {
      bytes = await fetchCanonBytes(repository, source, options.ref, token);
    } catch (error) {
      unresolved.push({ target, source, reason: error.message });
      continue;
    }

    if (bytes === null) {
      unresolved.push({ target, source, reason: 'no file at this path in canon' });
      continue;
    }

    const upstream = sha256(bytes);
    if (upstream === recorded) {
      current.push({ target, source });
    } else {
      const {
        bytes: deliveredBytes,
        reason: deficitReason,
        shape: deficitShape,
      } = deliveredSourceBytes(target, recorded);
      stale.push({
        target,
        source,
        delivered: recorded,
        upstream,
        upstreamBytes: bytes.length,
        deliveredBytes,
        deficitReason,
        deficitShape,
        deficit: deliveredBytes === null ? null : bytes.length - deliveredBytes,
      });
    }
  }

  const compared = current.length + stale.length;

  if (unhashed.length > 0) {
    console.error(
      `ERROR: ${unhashed.length} lock entr(ies) carry no sourceSha256:\n` +
        unhashed.map((p) => `  ${p}`).join('\n') +
        '\n\nAn entry with nothing to compare is a failure, not a pass. Currency for these\n' +
        'paths is unknown and must not be counted as current.',
    );
  }

  if (unresolved.length > 0) {
    console.error(
      `ERROR: ${unresolved.length} lock entr(ies) could not be resolved in ${repository}:\n` +
        unresolved
          .map((item) => `  ${item.target}\n     tried ${item.source} — ${item.reason}`)
          .join('\n') +
        '\n\nThis is a path-derivation or transport failure, not staleness. The lock records\n' +
        'the path sync wrote, not the path it read, so the source path is inferred here — a\n' +
        'path that does not resolve means that inference is wrong, or canon moved the file.\n' +
        'Reporting it as "behind" would send the reader after an upstream delivery that\n' +
        'would not fix it.',
    );
  }

  if (compared === 0) {
    console.error(
      `\nERROR: compared 0 of ${entries.length} entr(ies). A clean verdict over a population\n` +
        'this script never measured is indistinguishable from a real one. Refusing to report.',
    );
    process.exit(1);
  }

  const netDeficit = stale.reduce((sum, item) => sum + (item.deficit ?? 0), 0);
  const grossDeficit = stale.reduce((sum, item) => sum + Math.abs(item.deficit ?? 0), 0);
  const unprovenDeficits = stale.filter((item) => item.deficit === null).length;

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          repository,
          ref: options.ref,
          generatedAt,
          compared,
          netDeficit,
          grossDeficit,
          unprovenDeficits,
          current,
          stale,
          unresolved,
          unhashed,
        },
        null,
        2,
      ),
    );
  } else {
    // Lead with a quantity that can move. A count reads the same at any deficit, and it
    // reads *reassuringly* whenever staleness concentrates in the largest file — which is
    // the normal case, because the largest file is the one that changes most.
    //
    // Report gross and net together. Net alone repeats the count's defect one level up: a
    // file that grew and a file that shrank cancel, so a large divergence can sum to zero
    // and read as agreement. Net alone is also not signed the way a reader assumes — against
    // an older `--ref` canon is *smaller*, and "behind by a negative number" is not a
    // sentence. Gross states how much moved; net states which way.
    const headlineDeficit =
      stale.length === 0
        ? ''
        : ` Canon differs by ${grossDeficit} proven byte(s)` +
          ` (net ${netDeficit >= 0 ? '+' : ''}${netDeficit}, positive meaning canon is ahead)` +
          (unprovenDeficits > 0 ? `, plus ${unprovenDeficits} file(s) of unknown size` : '') +
          '.';

    console.log(
      `canon-currency: ${repository}@${options.ref} — ${current.length} current, ` +
        `${stale.length} superseded, of ${compared} compared.${headlineDeficit}`,
    );
    console.log(
      `Population: the ${entries.length} entr(ies) recorded in ${LOCK}, which is not the\n` +
        'set of files in any one directory — it omits locally authored files and includes\n' +
        'synced files outside .github.',
    );

    if (stale.length > 0) {
      console.log('\nSuperseded upstream since delivery:\n');
      for (const item of stale) {
        console.log(`  ${item.target}`);
        if (item.deliveredBytes === null) {
          console.log(`     delivered ${item.delivered}  (source size unknown)`);
          console.log(`     canon     ${item.upstream}  (${item.upstreamBytes} bytes)`);
          console.log(`     deficit   unknown — ${item.deficitReason}`);
        } else {
          console.log(`     delivered ${item.delivered}  (${item.deliveredBytes} bytes)`);
          console.log(`     canon     ${item.upstream}  (${item.upstreamBytes} bytes)`);
          console.log(`     deficit   ${item.deficit} bytes`);
          // Print how the size was recovered. A reconstruction that needed an unusual shape is
          // the signal that the search bounds are near their limit — and a bound that is one
          // line too tight reports a provable size as unknown, which is invisible unless the
          // successful shapes are shown next to it.
          console.log(`     proof     ${item.deficitShape}`);
        }
      }
      console.log(
        '\nA deficit is reported only where the delivered source size was reproduced from\n' +
          'the target file and proven against sourceSha256. Where it was not, it is reported\n' +
          'as unknown rather than derived by subtracting the target size: the target carries\n' +
          "the engine's injected provenance line and canon's source does not, so that\n" +
          'subtraction is wrong by the stamp — a small error that changes no conclusion and\n' +
          'is therefore never caught.',
      );
      console.log(
        '\nThese are not defects here and are not fixable here: canon is authored upstream\n' +
          'and arrives by sync. The remedy is an upstream dispatch, which is why this is a\n' +
          'report rather than a gate.',
      );
    }
  }

  // Staleness is a finding. Only an inability to measure is a failure.
  if (unhashed.length + unresolved.length > 0) process.exit(1);
}

await main();
