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
      stale.push({ target, source, delivered: recorded, upstream, upstreamBytes: bytes.length });
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

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          repository,
          ref: options.ref,
          generatedAt,
          compared,
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
    console.log(
      `canon-currency: ${repository}@${options.ref} — ${current.length} current, ` +
        `${stale.length} superseded, of ${compared} compared.`,
    );

    if (stale.length > 0) {
      console.log('\nSuperseded upstream since delivery:\n');
      for (const item of stale) {
        console.log(`  ${item.target}`);
        console.log(`     delivered ${item.delivered}`);
        console.log(`     canon     ${item.upstream}  (${item.upstreamBytes} bytes)`);
      }
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
