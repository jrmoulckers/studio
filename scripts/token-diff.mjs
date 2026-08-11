#!/usr/bin/env node
// Reports token VALUE shifts between a base ref and the working tree.
//
// Why this exists
// ---------------
// Renames and removals are loud: a consumer's build breaks and someone
// investigates. Value shifts are quiet: everything compiles, every test
// passes, and layout or contrast moves unreviewed. The ceremony was on the
// case that announces itself and absent from the case that cannot.
//
// Additions are the third case, and the worst of the three: quiet AND
// unobservable from inside this repository. A name Studio has never emitted
// before changes nothing HERE, so every measurement taken here reports zero.
// At a consumer it can already be defined -- canon's layer imports after a
// product's base tokens, so at equal `:root` specificity canon wins a name the
// product was authoring against -- and it silently retires fallbacks, because
// `var(--x, 1rem)` renders that fallback only while `--x` is undefined.
//
// That second mechanism inverts the usual audit: a dangling-reference census
// correctly EXCLUDES guarded refs as non-defects, so the sites most likely to
// move are exactly the ones a careful pre-adoption check filters out.
//
// Hence: this reporter must never print an addition count without saying so.
// Reporting "0 value shifts, 45 added" bare reads as "nothing happened," and
// once it did -- the consumer measured 175 shifted call sites.
//
// Studio's other guards do not close this. `tokens:dist:check` proves dist/
// is CURRENT -- it fails when generated output is stale -- but says nothing
// about what changed in value. The sync engine compares hashes, not meanings,
// so a 2px shift and a brand-new file both land under "Updated" as a path.
// The file list is a transport signal, not a safety signal.
//
// This is a REPORTER, not a gate. It needs a base ref, so it is deliberately
// not wired into `pnpm test`. Use it to author PR bodies and release notes.
//
// Usage:
//   pnpm tokens:diff                 # against merge-base with origin/main
//   pnpm tokens:diff -- --base HEAD~1
//   pnpm tokens:diff -- --base v1.2.0

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const THEMES = [
  ['light', 'packages/tokens/dist/js/default/tokens.light.js'],
  ['dark', 'packages/tokens/dist/js/default/tokens.dark.js'],
  ['dark-oled', 'packages/tokens/dist/js/default/tokens.dark-oled.js'],
  ['high-contrast', 'packages/tokens/dist/js/default/tokens.high-contrast.js'],
  ['high-contrast-dark', 'packages/tokens/dist/js/default/tokens.high-contrast-dark.js'],
];

// A value that renders colour. Moving one of these can invalidate a WCAG
// 2.2 AA result that was passing, and nothing else in CI will notice.
const COLOR_RE = /(^#[0-9a-f]{3,8}$)|\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color-mix)\(/i;

// A value that occupies space. Moving one of these moves layout.
const DIMENSION_RE = /^-?[\d.]+(px|rem|em|%|vh|vw|ch|ms|s)$/i;

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

function repoRoot() {
  return git(['rev-parse', '--show-toplevel']).trim();
}

function resolveBase(requested) {
  if (requested) return requested;
  // Prefer the merge-base so the report describes THIS branch's changes
  // rather than everything that landed on main since it was cut.
  for (const ref of ['origin/main', 'main']) {
    try {
      return git(['merge-base', 'HEAD', ref]).trim();
    } catch {
      /* try the next candidate */
    }
  }
  throw new Error('Could not resolve a base ref. Pass one explicitly: --base <ref>');
}

function readAtRef(ref, relPath) {
  try {
    // Forward slashes: git's object paths are POSIX even on Windows.
    return git(['show', `${ref}:${relPath.split(path.sep).join('/')}`]);
  } catch {
    return null; // absent at that ref (e.g. a newly added theme)
  }
}

function readWorkingTree(root, relPath) {
  const abs = path.join(root, relPath);
  return existsSync(abs) ? readFileSync(abs, 'utf8') : null;
}

// The dist files are Style Dictionary output of the shape:
//   // Auto-generated ...
//   export const tokens = { ... };
// The object literal is strict JSON, so slice it out and parse rather than
// evaluating untrusted file contents.
function parseTokens(source, label) {
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Could not locate a token object in ${label}`);
  }
  const literal = source.slice(start, end + 1);
  try {
    return JSON.parse(literal);
  } catch (error) {
    throw new Error(
      `Could not parse tokens in ${label}: ${error.message}\n` +
        'The generated format may have changed; update scripts/token-diff.mjs.',
    );
  }
}

function flatten(value, prefix = '', out = new Map()) {
  for (const [key, inner] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      flatten(inner, next, out);
    } else {
      out.set(next, Array.isArray(inner) ? JSON.stringify(inner) : inner);
    }
  }
  return out;
}

function classify(before, after) {
  const pair = `${before} ${after}`;
  if (COLOR_RE.test(String(before)) || COLOR_RE.test(String(after))) {
    return 'color';
  }
  if (
    DIMENSION_RE.test(String(before)) ||
    DIMENSION_RE.test(String(after)) ||
    /\b(calc|clamp|min|max)\(/.test(pair)
  ) {
    return 'dimension';
  }
  return 'other';
}

function diffTheme(baseTokens, headTokens) {
  const changed = [];
  const added = [];
  const removed = [];

  for (const [key, after] of headTokens) {
    if (!baseTokens.has(key)) {
      added.push(key);
      continue;
    }
    const before = baseTokens.get(key);
    if (String(before) !== String(after)) {
      changed.push({ key, before, after, kind: classify(before, after) });
    }
  }
  for (const key of baseTokens.keys()) {
    if (!headTokens.has(key)) removed.push(key);
  }

  changed.sort((a, b) => a.key.localeCompare(b.key));
  added.sort();
  removed.sort();
  return { changed, added, removed };
}

function main() {
  const argv = process.argv.slice(2);
  const baseIndex = argv.indexOf('--base');
  const requested = baseIndex === -1 ? null : argv[baseIndex + 1];
  if (baseIndex !== -1 && !requested) {
    console.error('--base requires a ref');
    process.exit(2);
  }

  const root = repoRoot();
  const base = resolveBase(requested);
  const shortBase = base.length === 40 ? base.slice(0, 12) : base;

  const results = [];
  const missingAtBase = [];

  for (const [theme, relPath] of THEMES) {
    const headSource = readWorkingTree(root, relPath);
    if (headSource === null) {
      console.error(`warning: ${relPath} is missing from the working tree`);
      continue;
    }
    const baseSource = readAtRef(base, relPath);
    const headTokens = flatten(parseTokens(headSource, `${relPath} (working tree)`));

    if (baseSource === null) {
      missingAtBase.push(theme);
      results.push({
        theme,
        isNew: true,
        diff: { changed: [], added: [...headTokens.keys()].sort(), removed: [] },
      });
      continue;
    }
    const baseTokens = flatten(parseTokens(baseSource, `${relPath} @ ${shortBase}`));
    results.push({ theme, isNew: false, diff: diffTheme(baseTokens, headTokens) });
  }

  const totalChanged = results.reduce((n, r) => n + r.diff.changed.length, 0);
  const totalAdded = results.reduce((n, r) => n + r.diff.added.length, 0);
  const totalRemoved = results.reduce((n, r) => n + r.diff.removed.length, 0);

  const lines = [];
  lines.push(`## Token changes (vs \`${shortBase}\`)`, '');

  if (totalChanged === 0 && totalAdded === 0 && totalRemoved === 0) {
    lines.push('No token changes.');
    console.log(lines.join('\n'));
    return;
  }

  lines.push(
    `**${totalChanged} value shift${totalChanged === 1 ? '' : 's'}**, ` +
      `${totalAdded} added, ${totalRemoved} removed.`,
    '',
  );

  if (totalChanged > 0) {
    lines.push(
      '> Names held while values moved. The compile-clean path is the risky one:',
      '> nothing in CI fails when a value shifts, so review the table below rather',
      '> than the file list.',
      '',
    );
  }

  if (totalAdded > 0) {
    lines.push(
      '> **An added name is not an additive change downstream.** This count is',
      '> measured inside Studio, where a new name changes nothing -- so it reads as',
      '> zero risk and is not. At a consumer the name may already be defined, and',
      '> canon imports after a product\u2019s base tokens, so at equal `:root`',
      '> specificity canon wins it. Additions also retire fallbacks: `var(--x, 1rem)`',
      '> renders that fallback only while `--x` is undefined, and a dangling-ref',
      '> census correctly excludes guarded refs \u2014 so the sites most likely to move',
      '> are the ones such a check filters out.',
      '>',
      '> Carry the added names into the PR body next to the value shifts, and treat',
      '> the first sync into a consumer as a visual review, not a rubber stamp.',
      '',
    );
  }

  for (const { theme, isNew, diff } of results) {
    if (!diff.changed.length && !diff.added.length && !diff.removed.length) {
      continue;
    }
    lines.push(`### ${theme}${isNew ? ' (new theme)' : ''}`, '');

    if (diff.changed.length) {
      lines.push('| Token | Before | After |', '| --- | --- | --- |');
      for (const { key, before, after } of diff.changed) {
        lines.push(`| \`${key}\` | \`${before}\` | \`${after}\` |`);
      }
      lines.push('');
    }
    if (diff.added.length) {
      lines.push(
        `**Added (${diff.added.length}):** ${diff.added.map((k) => `\`${k}\``).join(', ')}`,
        '',
      );
    }
    if (diff.removed.length) {
      lines.push(
        `**Removed (${diff.removed.length}):** ${diff.removed.map((k) => `\`${k}\``).join(', ')}`,
        '',
      );
    }
  }

  // Re-check surface. Which downstream property a shift can invalidate is not
  // obvious from the token name, so name it explicitly.
  const kinds = new Set();
  for (const { diff } of results) {
    for (const c of diff.changed) kinds.add(c.kind);
  }
  if (kinds.size) {
    lines.push('### Re-check surface', '');
    if (kinds.has('color')) {
      lines.push(
        '- **Colour moved — re-check contrast.** A passing WCAG 2.2 AA result is not',
        '  carried over by a value change, and no test here asserts it for every pair.',
      );
    }
    if (kinds.has('dimension')) {
      lines.push(
        '- **Dimension moved — re-check layout.** Spacing, radius, size and duration',
        '  shifts change rendered output without failing a build.',
      );
    }
    if (kinds.has('other')) {
      lines.push('- **Non-dimensional values moved** — confirm consumers tolerate the new values.');
    }
    lines.push('');
  }

  if (missingAtBase.length) {
    lines.push(
      `_Themes absent at the base ref (all tokens reported as added): ${missingAtBase.join(', ')}._`,
      '',
    );
  }

  lines.push(
    '_Generated by `pnpm tokens:diff` from committed `dist/js` — the bytes consumers receive._',
  );

  console.log(lines.join('\n'));
}

try {
  main();
} catch (error) {
  console.error(`token-diff: ${error.message}`);
  process.exit(1);
}
