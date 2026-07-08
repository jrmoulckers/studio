// @jrm/tokens — dist assembler.
//
// Produces the COMMITTED `packages/tokens/dist/` distribution: a deterministic,
// verbatim mirror of the consumable subset of the (gitignored) Style Dictionary
// output in `build/` — namely `css/`, `tailwind/`, and `js/`.
//
// The registry-free sync engine (in the other backbone repo) shallow-clones this
// repo and copies this whole `dist/` tree verbatim into member repos; it never
// runs this build. So `dist/` must be byte-stable across rebuilds:
//   • files are walked in a stable (sorted) order,
//   • every text file is normalized to LF line endings,
//   • `dist/` is fully cleared first so removed sources can't linger.
//
// Run after the Style Dictionary build (see the `dist` npm script), which emits
// `build/`. This script only reads `build/` and writes `dist/`.

import { fileURLToPath } from 'url';
import { dirname, join, relative, sep } from 'path';
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const buildDir = join(root, 'build');
const distDir = join(root, 'dist');

// The consumable subset copied into `dist/` (everything `build/` emits).
const SUBSET = ['css', 'tailwind', 'js'];

/** Depth-first, lexicographically sorted list of files under `dir`. */
function listFiles(dir) {
  const out = [];
  const walk = (current) => {
    const entries = readdirSync(current).sort();
    for (const name of entries) {
      const full = join(current, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.push(full);
    }
  };
  if (statSync(dir, { throwIfNoEntry: false })?.isDirectory()) walk(dir);
  return out;
}

/** Normalize to LF so committed bytes are identical on every platform. */
const toLf = (text) => text.replace(/\r\n/g, '\n');

function assembleDist() {
  if (statSync(buildDir, { throwIfNoEntry: false }) === undefined) {
    console.error(`✗ @jrm/tokens dist: missing build/ — run the token build first.`);
    process.exit(1);
  }

  rmSync(distDir, { recursive: true, force: true });

  let count = 0;
  for (const subdir of SUBSET) {
    const srcDir = join(buildDir, subdir);
    for (const file of listFiles(srcDir)) {
      const rel = relative(buildDir, file);
      const dest = join(distDir, rel);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, toLf(readFileSync(file, 'utf8')), { encoding: 'utf8' });
      count += 1;
      console.log(`✔︎ dist/${rel.split(sep).join('/')}`);
    }
  }

  if (count === 0) {
    console.error('✗ @jrm/tokens dist: no files copied — build/ output looks empty.');
    process.exit(1);
  }
  console.log(`✅ @jrm/tokens dist assembled (${count} files → packages/tokens/dist).`);
}

assembleDist();
