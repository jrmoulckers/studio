#!/usr/bin/env node
// Dependency-free validator for the Studio Draft principle tree.
// Scope: only the seven new files under principles/design and principles/experience.
// Checks: pinned unique IDs, file-to-area ID prefixes, presence and non-emptiness of every
// required machine-checkable field, exact Draft status, exact "repository owner" ratification
// owner, and valid Legacy inputs. Uses only built-in Node modules.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

// Each new file is pinned to exactly one area prefix. This is the file-to-area contract.
const FILES = [
  {
    path: 'principles/design/foundations.md',
    area: 'FND',
    ids: ['STUDIO-FND-001', 'STUDIO-FND-002', 'STUDIO-FND-003'],
  },
  {
    path: 'principles/design/tokens-and-themes.md',
    area: 'TOK',
    ids: ['STUDIO-TOK-001', 'STUDIO-TOK-002', 'STUDIO-TOK-003', 'STUDIO-TOK-004'],
  },
  {
    path: 'principles/design/components.md',
    area: 'CMP',
    ids: ['STUDIO-CMP-001', 'STUDIO-CMP-002', 'STUDIO-CMP-003'],
  },
  {
    path: 'principles/experience/interaction.md',
    area: 'INT',
    ids: ['STUDIO-INT-001', 'STUDIO-INT-002', 'STUDIO-INT-003', 'STUDIO-INT-004', 'STUDIO-INT-005'],
  },
  {
    path: 'principles/experience/accessibility.md',
    area: 'A11Y',
    ids: ['STUDIO-A11Y-001', 'STUDIO-A11Y-002', 'STUDIO-A11Y-003'],
  },
  {
    path: 'principles/experience/localization.md',
    area: 'L10N',
    ids: ['STUDIO-L10N-001', 'STUDIO-L10N-002', 'STUDIO-L10N-003'],
  },
  {
    path: 'principles/experience/ux.md',
    area: 'UX',
    ids: ['STUDIO-UX-001', 'STUDIO-UX-002', 'STUDIO-UX-003', 'STUDIO-UX-004'],
  },
];

const REQUIRED_FIELDS = [
  'Status',
  'Statement',
  'Rationale',
  'Verification',
  'Ratification owner',
  'Implementation owner',
  'Handoffs',
  'Legacy inputs',
];

const ID_HEADING = /^###\s+(STUDIO-([A-Z0-9]+)-(\d{3}))\b/;
const STUDIO_HEADING = /^###\s+STUDIO-/;
const FIELD_LINE = /^-\s+\*\*([^:*]+):\*\*\s*(.*)$/;
const LEGACY_TOKEN = /^[a-z0-9-]+#\d+$/;
const LEGACY_RANGES = new Map([
  ['accessibility', 7],
  ['ai-process', 22],
  ['ai-products', 8],
  ['architecture', 15],
  ['backend', 7],
  ['business', 6],
  ['compliance', 8],
  ['data-analytics', 7],
  ['design', 13],
  ['devops', 15],
  ['documentation', 7],
  ['featuring', 7],
  ['frontend', 9],
  ['local-first', 4],
  ['localization', 9],
  ['middleware', 7],
  ['performance', 9],
  ['process', 7],
  ['project-planning', 7],
  ['security', 8],
  ['testing', 10],
]);

const errors = [];
const seenIds = new Map(); // id -> file where first seen
const principles = [];

for (const { path: relPath, area, ids: expectedIds } of FILES) {
  const abs = join(repoRoot, relPath);
  let text;
  try {
    text = readFileSync(abs, 'utf8');
  } catch {
    errors.push(`${relPath}: file is missing`);
    continue;
  }

  const lines = text.split(/\r?\n/);
  let current = null;
  let filePrincipleCount = 0;
  const fileIds = [];

  const closeBlock = () => {
    if (!current) return;
    validateBlock(current, relPath, area, errors, seenIds);
    principles.push(current);
    fileIds.push(current.id);
    filePrincipleCount += 1;
    current = null;
  };

  for (const line of lines) {
    const idMatch = line.match(ID_HEADING);
    if (idMatch) {
      closeBlock();
      current = {
        id: idMatch[1],
        area: idMatch[2],
        number: idMatch[3],
        fields: new Map(),
      };
      continue;
    }
    if (STUDIO_HEADING.test(line)) {
      errors.push(
        `${relPath}: malformed principle heading "${line}" (expected "### STUDIO-${area}-NNN")`,
      );
      closeBlock();
      continue;
    }
    if (!current) continue;
    const fieldMatch = line.match(FIELD_LINE);
    if (fieldMatch) {
      const name = fieldMatch[1].trim();
      const value = fieldMatch[2].trim();
      if (REQUIRED_FIELDS.includes(name)) {
        if (current.fields.has(name)) {
          errors.push(`${relPath}: ${current.id} repeats required field "${name}"`);
        } else {
          current.fields.set(name, value);
        }
      }
    }
  }
  closeBlock();
  if (filePrincipleCount === 0) {
    errors.push(`${relPath}: no valid principles found`);
  }
  for (const id of expectedIds) {
    if (!fileIds.includes(id)) {
      errors.push(`${relPath}: missing stable principle ID ${id}`);
    }
  }
  for (const id of fileIds) {
    if (!expectedIds.includes(id)) {
      errors.push(`${relPath}: unexpected principle ID ${id}; stable IDs must not be renumbered`);
    }
  }
}

function validateBlock(block, relPath, expectedArea, errors, seenIds) {
  const { id, area, fields } = block;

  // Duplicate ID detection (structural, across all seven files).
  if (seenIds.has(id)) {
    errors.push(`${relPath}: duplicate principle ID ${id} (also in ${seenIds.get(id)})`);
  } else {
    seenIds.set(id, relPath);
  }

  // File-to-area prefix contract.
  if (area !== expectedArea) {
    errors.push(
      `${relPath}: ${id} uses area prefix ${area} but this file must use STUDIO-${expectedArea}-NNN`,
    );
  }

  // Required fields present and non-empty.
  for (const field of REQUIRED_FIELDS) {
    if (!fields.has(field)) {
      errors.push(`${relPath}: ${id} is missing required field "${field}"`);
      continue;
    }
    if (fields.get(field).length === 0) {
      errors.push(`${relPath}: ${id} has an empty "${field}" field`);
    }
  }

  // Exact-value fields.
  if (fields.has('Status') && fields.get('Status') !== 'Draft') {
    errors.push(
      `${relPath}: ${id} Status must be exactly "Draft" (found "${fields.get('Status')}")`,
    );
  }
  if (fields.has('Ratification owner') && fields.get('Ratification owner') !== 'repository owner') {
    errors.push(
      `${relPath}: ${id} Ratification owner must be exactly "repository owner" (found "${fields.get(
        'Ratification owner',
      )}")`,
    );
  }

  // Legacy inputs must be "none" or a comma-separated list of <slug>#<n> tokens.
  if (fields.has('Legacy inputs')) {
    const raw = fields.get('Legacy inputs');
    if (raw.length > 0 && raw !== 'none') {
      const tokens = raw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      for (const token of tokens) {
        if (!LEGACY_TOKEN.test(token)) {
          errors.push(
            `${relPath}: ${id} has malformed Legacy inputs entry "${token}" (expected "<realm>#<n>" or "none")`,
          );
          continue;
        }
        const [realm, rawNumber] = token.split('#');
        const number = Number(rawNumber);
        const max = LEGACY_RANGES.get(realm);
        if (!max || number < 1 || number > max) {
          errors.push(`${relPath}: ${id} references unknown legacy input "${token}"`);
        }
      }
    }
  }
}

if (principles.length === 0) {
  errors.push('no principles were found in the Studio Draft tree');
}

if (errors.length > 0) {
  console.error('Principle validation FAILED:\n');
  for (const err of errors) console.error(`  - ${err}`);
  console.error(`\n${errors.length} problem(s) across ${FILES.length} file(s).`);
  process.exit(1);
}

console.log(
  `Principle validation passed: ${principles.length} principle(s) across ${FILES.length} file(s), all stable IDs present and fields well-formed.`,
);
for (const { area } of FILES) {
  const count = principles.filter((p) => p.area === area).length;
  console.log(`  STUDIO-${area}-*: ${count}`);
}
