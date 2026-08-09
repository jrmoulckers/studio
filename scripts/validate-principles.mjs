#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const STUDIO_FILES = [
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

const LEGACY_REALMS = [
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
].map(([slug, count]) => ({
  slug,
  count,
  path: `principles/${slug}.md`,
}));

const LEGACY_RANGES = new Map(LEGACY_REALMS.map(({ slug, count }) => [slug, count]));
const EXPECTED_LEGACY_IDS = LEGACY_REALMS.flatMap(({ slug, count }) =>
  Array.from({ length: count }, (_, index) => `studio-legacy:${slug}:${index + 1}`),
);
const EXPECTED_LEGACY_ID_SET = new Set(EXPECTED_LEGACY_IDS);

const AUTHORITY_PINS = {
  Studio: {
    repository: 'jrmoulckers/studio',
    commit: '20dc8e0119d8ee46bd3ec26643f1b21a3eca8df0',
    principleCount: 25,
    catalogSha256: 'fb76743ca159e80cc6ab16e84724b5f3352b455c8c591d290de304f065768976',
    paths: STUDIO_FILES.map(({ path }) => path).sort(),
  },
  Engineering: {
    repository: 'jrmoulckers/engineering',
    commit: 'ea1ad771b46612a62d54b66e8077df4e5af6f16a',
    principleCount: 66,
    catalogSha256: '95b9bc8539ebc7f650fdf7f8085dd2de0302802f70a47e266d8654bbd7c304bf',
    paths: [
      'principles/architecture/boundaries-and-contracts.md',
      'principles/assurance/performance.md',
      'principles/assurance/security-and-privacy.md',
      'principles/assurance/testing.md',
      'principles/operations/build-and-release.md',
      'principles/operations/observability.md',
      'principles/platforms/api-backend.md',
      'principles/platforms/browser-frontend.md',
      'principles/platforms/data-systems.md',
      'principles/platforms/integration-boundaries.md',
      'principles/platforms/local-first.md',
    ],
  },
  Product: {
    repository: 'jrmoulckers/product',
    commit: 'b0b2ef66094bbc5abf19cd4ae0ac85b05f12ddb5',
    principleCount: 40,
    catalogSha256: 'd2e36737dc83b4fc028e764658ed66c9a621bf41b4e1ce4aadf7c97f00a76c69',
    paths: [
      'principles/business.md',
      'principles/compliance.md',
      'principles/content-operations.md',
      'principles/discovery-and-experiments.md',
      'principles/metrics.md',
      'principles/planning-and-delivery.md',
      'principles/release-decisions.md',
      'principles/strategy.md',
    ],
  },
  '.github': {
    repository: 'jrmoulckers/.github',
    commit: '3036d5d1ed882a4c5acffe1ccfa0b49165538eef',
    principleCount: 43,
    catalogSha256: '6d73bff5689daff029268b495c2effc0c043eebad43a73ce6cca175915b7aab6',
    paths: [
      'principles/ai/agent-operations.md',
      'principles/ai/evidence-and-evals.md',
      'principles/ai/product-ai.md',
      'principles/github/actions-and-delivery.md',
      'principles/github/repository-governance.md',
    ],
  },
};

const BASELINE_COMMIT = 'efe6aa3b5ad020331a91f533844b0b9f70d70b76';
const RECEIPT_INTEGRITY_PIN = 'b103a2d6a18b21b0b18e47c884f535d19a48100f294fc9a8d55d5e43656f2863';

// Studio local principle Status is allowed to move from the receipt-pinned historical "Draft"
// to "Ratified" only through an owner-effective Ratification decision record. Each pin below is
// an independent, hardcoded status-excluded content digest for one Studio successor block: the
// exact block bytes at the receipt-pinned commit with only the "- **Status:** <value>" line
// normalized to a fixed placeholder. It is unaffected by a Draft <-> Ratified status edit and
// changes if any other field (Statement, Rationale, Verification, owners, Handoffs, Legacy
// inputs, or the ID/title heading) changes. It is never written into the pinned receipt, which
// stays historical and unrefreshed.
const STUDIO_STATUS_CONTENT_PIN = {
  'STUDIO-A11Y-001': '6b17617fb6f8f7f15490b7a640d331b7d8e912d68338840a86f6148419ccc2fb',
  'STUDIO-A11Y-002': '1cf31ea51e312ca26f5b91e0aeeb802a94c8f9f4fe1847adae5598eea37672ff',
  'STUDIO-A11Y-003': 'cd5aaf501f94179a201bb860b5348b02d3d2da5a65b1f0f4da8bf1cfc10f44ab',
  'STUDIO-CMP-001': '17af9c56b9844daec6b228c23b16c15ec66043edbff33a33a7a5dd51a5a70670',
  'STUDIO-CMP-002': '81122335d04ae6619b5b47c2a710c16e80dc6d793794e5865b3ed8f6621af040',
  'STUDIO-CMP-003': '1bd0e7b0657cd2787477ba197712c341c896ac5da51308cc45393a6bf9ad9cb2',
  'STUDIO-FND-001': '1838b22c9380e0241401f4019094be9c262ab1b5aeaba1941ef658d6a9807145',
  'STUDIO-FND-002': 'eb254f2be23d807fe282ff2ed7992b0edaf7747085d334eb82e29f526146fba1',
  'STUDIO-FND-003': '89632734ee1c5ce2e5a8fa0b85e879bdf93ef23c5dca08e9a73014b2b238b7f0',
  'STUDIO-INT-001': '367fea9df74fd3d1ac92ca898eabce27e581683b6c809cbf3ebd912171766f83',
  'STUDIO-INT-002': '2cf1c6052ac25238c5eb1db0a4ab06565eda7785bdbee77745e90db3dfc968fe',
  'STUDIO-INT-003': '1c1ee7236dc6218064067ed337fab47615ea01185297a100c3e01ac9ead1e9e0',
  'STUDIO-INT-004': '66d6d0480882e1e399fb81d0781fb345d8bba448c14b6c6008661525ad945871',
  'STUDIO-INT-005': '8afd2a62f939fa8020e1818ebee9f601aecec771f8dfef3f03c2466e3893fcb5',
  'STUDIO-L10N-001': '4d23eb28a5fb8449c6aa67fbd8b1f32810103d8a7ad49766502562ad83326ca9',
  'STUDIO-L10N-002': '960610c35139b36a2791643071cc889e5bce349889d60e248217f3a62a8d04f9',
  'STUDIO-L10N-003': '9d9c4114d537445632a4f02ad7fe281fe7f8e68d9be3a89d5f64ec6d2ac0716a',
  'STUDIO-TOK-001': '57d10bfc8a11065cadd9ce1578a6b0ba006e47c8f782e2041098e3237062789a',
  'STUDIO-TOK-002': '65233ab09ab87da92e2b961f4cd5a357dc066163340c98af0d8ee44fd2ae95e3',
  'STUDIO-TOK-003': '2272227893948f13f1edeaa1dc844eb71e762f681f2987e4dcba85aa0eb79c58',
  'STUDIO-TOK-004': '2d28aa2f388ee9c295e88c963845cb2a69af957dff182d066d168f5a54175887',
  'STUDIO-UX-001': '9c5dc6c3ea092746be92199cf9f6d92f060171e3675875db00fd4006fd760c5e',
  'STUDIO-UX-002': '49f9524767e63bc97581900065d5fb04b1b365bc67bb4264fcfb97ad2c695c0a',
  'STUDIO-UX-003': 'e33b988df5585393b0dffa5704b84418668774d2e3ce2ed713456fbe3963e808',
  'STUDIO-UX-004': 'f7e6ada8b8d7dcc351f80bd1d6a61b43939b4eac38587c206693f393a34e069b',
};
const STUDIO_DRAFT_BANNER =
  '> **Status:** Draft (proposed, non-normative). Only the repository owner may ratify.';
const STUDIO_RATIFICATION_BANNER = [
  "> **Ratification:** Each principle's `Status` becomes effective only when the repository owner",
  '> merges the covering Ratification decision record; before that merge, the candidate change is',
  '> proposed and non-normative.',
].join('\n');
const STUDIO_PREAMBLE_CONTENT_PIN = {
  'principles/design/foundations.md':
    '8ad429a989eb308e8d68ae7b05703e7868d235754740042cb80fe56424cb45ba',
  'principles/design/tokens-and-themes.md':
    '5e0e49942e990711bc4cc01a401f7ca9515e2214aeac33dc36735bddbfa19e3b',
  'principles/design/components.md':
    '0fba9e2ea871de09fc9914a40050f1da3855e225847324f0815c21b5c7f3afc1',
  'principles/experience/interaction.md':
    'c9ed50d25d6477bbb2fc4c24f26810495ca76e0d535d44b0c6d99c9a0db3839d',
  'principles/experience/accessibility.md':
    '23515405247b48d30922433723461a9d90964547cb911114c9a8fa948511e14b',
  'principles/experience/localization.md':
    '4d049093f112e2739b3d1a891f819801a12f8fd8a2a94579ba9ff7e0abaa8fc7',
  'principles/experience/ux.md': 'd6004b888f77f01ea35d90d8f8cca83efdd462b9ea0cbb293120e26ef9e314de',
};
const ALLOWED_STUDIO_STATUSES = new Set(['Draft', 'Ratified']);
const RATIFICATION_RECORD_PATH = 'principles/RATIFICATION-DESIGN-EXPERIENCE.md';
const RATIFICATION_REQUIRED_PHRASES = [
  'Content, ownership, IDs, and legacy inputs are unchanged.',
  'Merging this pull request by the repository owner is the effective Ratification approval event.',
  'This record does not itself ratify anything and does not claim owner approval before merge.',
  'remains historical, non-normative evidence; it proves no Ratification and authorizes no deletion.',
  'Downstream finalization remains blocked on Ratification by Engineering, Product, and `.github` plus refreshed live evidence.',
  'PR #15',
  'PR #21',
];
const RATIFICATION_FORBIDDEN_CLAIMS = [
  {
    pattern: /\bpinned receipt\b.{0,160}\bproves Ratification\b/i,
    message: 'the pinned receipt cannot prove Ratification',
  },
  {
    pattern: /\bpinned receipt\b.{0,160}\bauthorizes (?:legacy )?deletion\b/i,
    message: 'the pinned receipt cannot authorize legacy deletion',
  },
  {
    pattern:
      /\b(?:Ratification|owner approval) (?:is|was|became|already occurred).{0,80}\bbefore merge\b/i,
    message: 'Ratification cannot be effective before repository-owner merge',
  },
  {
    pattern:
      /\b(?:contributor|agent|implementation owner)\b.{0,80}\b(?:approve|approves|ratify|ratifies)\b/i,
    message: 'a non-owner cannot approve Ratification',
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
const RETIREMENT_CATEGORIES = new Set([
  'duplicated',
  'incident-specific',
  'operational-convention',
  'operational-housekeeping',
  'over-specific-mechanism',
  'unsupported-proposal',
]);
const DISPOSITIONS = new Set(['rewrite', 'split', 'reference', 'retire']);
const LEDGER_STATUSES = new Set(['proposed', 'ratified', 'implemented', 'verified']);
const AUTHORITIES = Object.keys(AUTHORITY_PINS);
const AUTHORITY_SET = new Set(AUTHORITIES);
const AUTHORITY_ID = {
  Studio: /^STUDIO-[A-Z0-9]+-\d{3}$/,
  Engineering: /^ENG-[A-Z0-9]+-\d{3}$/,
  Product: /^PROD-[A-Z0-9]+-\d{3}$/,
  '.github': /^GH-[A-Z0-9]+-\d{3}$/,
};
const SHA1 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const ID_HEADING = /^###\s+(STUDIO-([A-Z0-9]+)-(\d{3}))\b/;
const STUDIO_HEADING = /^###\s+STUDIO-/;
const FIELD_LINE = /^-\s+\*\*([^:*]+):\*\*\s*(.*)$/;
const LEGACY_TOKEN = /^[a-z0-9-]+#\d+$/;
const RECEIPT_PATH = 'principles/migration-verification-receipt.json';

const filePath = (relativePath) => join(repoRoot, ...relativePath.split('/'));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const gitBlobSha = (buffer) =>
  createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex');
const sortedUnique = (values) => [...new Set(values)].sort();
const arraysEqual = (left, right) =>
  left.length === right.length && left.every((value, index) => value === right[index]);
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const normalizeWhitespace = (text) => text.replace(/\s+/g, ' ').trim();
const STATUS_FIELD_LINE = /^- \*\*Status:\*\* .*$/m;
const normalizeStatusField = (block) =>
  STATUS_FIELD_LINE.test(block)
    ? block.replace(STATUS_FIELD_LINE, '- **Status:** <normalized>')
    : block;

function extractScopeIds(text) {
  const scopeHeadingIndex = text.indexOf('## Scope');
  if (scopeHeadingIndex === -1) return null;
  const fenceMatch = text.slice(scopeHeadingIndex).match(/```text\r?\n([\s\S]*?)```/);
  if (!fenceMatch) return null;
  return fenceMatch[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function validateRatificationRecord(errors, expectedIds, overrideText) {
  if (overrideText === null) return { exists: false, scopeIds: new Set() }; // Simulated deletion.
  let text = overrideText;
  if (text === undefined) {
    try {
      text = readFileSync(filePath(RATIFICATION_RECORD_PATH), 'utf8');
    } catch {
      return { exists: false, scopeIds: new Set() };
    }
  }

  const normalized = normalizeWhitespace(text);
  for (const phrase of RATIFICATION_REQUIRED_PHRASES) {
    if (!normalized.includes(normalizeWhitespace(phrase))) {
      errors.push(`${RATIFICATION_RECORD_PATH}: missing required statement "${phrase}"`);
    }
  }
  for (const { pattern, message } of RATIFICATION_FORBIDDEN_CLAIMS) {
    if (pattern.test(normalized)) {
      errors.push(`${RATIFICATION_RECORD_PATH}: forbidden claim: ${message}`);
    }
  }

  const scopeIds = extractScopeIds(text);
  if (!scopeIds) {
    errors.push(`${RATIFICATION_RECORD_PATH}: missing a parseable "## Scope" fenced ID list`);
    return { exists: true, scopeIds: new Set() };
  }
  const malformed = scopeIds.find((id) => !AUTHORITY_ID.Studio.test(id));
  if (malformed) {
    errors.push(`${RATIFICATION_RECORD_PATH}: scope contains a malformed ID "${malformed}"`);
  }
  if (new Set(scopeIds).size !== scopeIds.length) {
    errors.push(`${RATIFICATION_RECORD_PATH}: scope contains duplicate IDs`);
  }
  if (!arraysEqual([...scopeIds].sort(), [...expectedIds].sort())) {
    errors.push(
      `${RATIFICATION_RECORD_PATH}: scope must list exactly the ${expectedIds.length} Studio successor IDs, no more, no fewer`,
    );
  }
  return { exists: true, scopeIds: new Set(scopeIds) };
}

function readJson(relativePath, errors) {
  const raw = readFileSync(filePath(relativePath), 'utf8');
  errors.push(...findDuplicateJsonKeys(raw, relativePath));
  try {
    return { raw, value: JSON.parse(raw) };
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON (${error.message})`);
    return { raw, value: null };
  }
}

function findDuplicateJsonKeys(raw, label) {
  const errors = [];
  const stack = [];

  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index];
    if (character === '"') {
      const start = index;
      index += 1;
      for (; index < raw.length; index += 1) {
        if (raw[index] === '\\') {
          index += 1;
        } else if (raw[index] === '"') {
          break;
        }
      }
      let cursor = index + 1;
      while (/\s/.test(raw[cursor] ?? '')) cursor += 1;
      const frame = stack.at(-1);
      if (raw[cursor] === ':' && frame?.type === 'object') {
        const key = JSON.parse(raw.slice(start, index + 1));
        if (frame.keys.has(key)) {
          const line = raw.slice(0, start).split('\n').length;
          errors.push(`${label}:${line}: duplicate JSON key "${key}"`);
        }
        frame.keys.add(key);
      }
      continue;
    }
    if (character === '{') stack.push({ type: 'object', keys: new Set() });
    if (character === '[') stack.push({ type: 'array' });
    if (character === '}' || character === ']') stack.pop();
  }

  return errors;
}

function checkExactKeys(value, required, optional, label, errors) {
  if (!isObject(value)) {
    errors.push(`${label} must be an object`);
    return false;
  }
  const allowed = new Set([...required, ...optional]);
  for (const key of required) {
    if (!(key in value)) errors.push(`${label} is missing "${key}"`);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${label} has unknown property "${key}"`);
  }
  return true;
}

function checkNonEmptyString(value, label, errors) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`${label} must be a non-empty string`);
    return false;
  }
  return true;
}

function checkStringArray(value, label, errors, { allowEmpty = false } = {}) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return false;
  }
  if (!allowEmpty && value.length === 0) errors.push(`${label} must not be empty`);
  if (value.some((item) => typeof item !== 'string' || item.length === 0)) {
    errors.push(`${label} must contain only non-empty strings`);
  }
  if (new Set(value).size !== value.length) errors.push(`${label} must not contain duplicates`);
  return true;
}

function validateSchemaFiles(ledgerSchema, receiptSchema, errors) {
  for (const [label, schema] of [
    ['principles/migration-ledger.schema.json', ledgerSchema],
    ['principles/migration-verification-receipt.schema.json', receiptSchema],
  ]) {
    if (!isObject(schema)) continue;
    if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
      errors.push(`${label}: must use JSON Schema draft 2020-12`);
    }
    if (schema.type !== 'object' || !isObject(schema.properties) || !isObject(schema.$defs)) {
      errors.push(`${label}: root object contract is incomplete`);
    }
  }
}

function validateStudioTree(errors, { fileOverrides = new Map(), ratificationOverrideText } = {}) {
  const seenIds = new Map();
  const statusById = new Map();
  const sourceFiles = [];

  for (const { path, area, ids: expectedIds } of STUDIO_FILES) {
    let buffer;
    if (fileOverrides.has(path)) {
      buffer = fileOverrides.get(path);
    } else {
      try {
        buffer = readFileSync(filePath(path));
      } catch {
        errors.push(`${path}: file is missing`);
        continue;
      }
    }

    const text = buffer.toString('utf8');
    const lines = text.split(/\r?\n/);
    let current = null;
    const fileIds = [];

    const closeBlock = () => {
      if (!current) return;
      validateStudioBlock(current, path, area, errors, seenIds, statusById);
      fileIds.push(current.id);
      current = null;
    };

    for (const line of lines) {
      const idMatch = line.match(ID_HEADING);
      if (idMatch) {
        closeBlock();
        current = {
          id: idMatch[1],
          area: idMatch[2],
          fields: new Map(),
        };
        continue;
      }
      if (STUDIO_HEADING.test(line)) {
        errors.push(
          `${path}: malformed principle heading "${line}" (expected "### STUDIO-${area}-NNN")`,
        );
        closeBlock();
        continue;
      }
      if (!current) continue;
      const fieldMatch = line.match(FIELD_LINE);
      if (!fieldMatch) continue;
      const name = fieldMatch[1].trim();
      if (!REQUIRED_FIELDS.includes(name)) continue;
      if (current.fields.has(name)) {
        errors.push(`${path}: ${current.id} repeats required field "${name}"`);
      } else {
        current.fields.set(name, fieldMatch[2].trim());
      }
    }
    closeBlock();

    if (!arraysEqual(fileIds, expectedIds)) {
      for (const id of expectedIds.filter((id) => !fileIds.includes(id))) {
        errors.push(`${path}: missing stable principle ID ${id}`);
      }
      for (const id of fileIds.filter((id) => !expectedIds.includes(id))) {
        errors.push(`${path}: unexpected principle ID ${id}; stable IDs must not be renumbered`);
      }
      if (fileIds.length === expectedIds.length) {
        errors.push(`${path}: stable principle IDs are out of order`);
      }
    }

    sourceFiles.push({ path, buffer });
  }

  const localCatalog = buildCatalogFromSources('Studio', sourceFiles);
  const contentHashesById = computeStudioStatusExcludedHashes(sourceFiles);
  validateStudioStatuses(statusById, contentHashesById, errors, ratificationOverrideText);
  const distinctLocalStatuses = new Set(statusById.values());
  const localStatus = distinctLocalStatuses.size === 1 ? [...distinctLocalStatuses][0] : 'mixed';
  validateStudioPreambles(sourceFiles, localStatus, errors);
  return { ...localCatalog, localStatus };
}

function computeStudioStatusExcludedHashes(sourceFiles) {
  const hashesById = new Map();
  for (const { buffer } of sourceFiles) {
    const text = buffer.toString('utf8');
    const matches = [...text.matchAll(/^### (STUDIO-[A-Z0-9]+-\d{3}) — .+$/gm)];
    matches.forEach((match, index) => {
      const block = text.slice(match.index, matches[index + 1]?.index ?? text.length);
      hashesById.set(match[1], sha256(normalizeStatusField(block)));
    });
  }
  return hashesById;
}

function validateStudioPreambles(sourceFiles, localStatus, errors) {
  if (localStatus === 'mixed') return;
  const expectedBanner =
    localStatus === 'Ratified' ? STUDIO_RATIFICATION_BANNER : STUDIO_DRAFT_BANNER;
  for (const { path, buffer } of sourceFiles) {
    const text = buffer.toString('utf8');
    const firstHeading = text.search(/^### STUDIO-/m);
    const preamble = firstHeading === -1 ? text : text.slice(0, firstHeading);
    if (!preamble.includes(expectedBanner)) {
      errors.push(`${path}: preamble does not match the ${localStatus} Ratification state`);
      continue;
    }
    const normalized = preamble.replace(expectedBanner, '> **Ratification:** <normalized>');
    if (sha256(normalized) !== STUDIO_PREAMBLE_CONTENT_PIN[path]) {
      errors.push(`${path}: preamble content changed beyond the Ratification banner`);
    }
  }
}

function validateStudioStatuses(statusById, contentHashesById, errors, ratificationOverrideText) {
  const allExpectedIds = STUDIO_FILES.flatMap(({ ids }) => ids);
  const statuses = allExpectedIds.map((id) => statusById.get(id)).filter(Boolean);
  if (statuses.length !== allExpectedIds.length) return; // missing IDs are already reported.

  const distinctStatuses = new Set(statuses);
  if (distinctStatuses.size > 1) {
    errors.push(
      'Studio successor statuses are mixed; all 25 successors must share exactly one Status ("Draft" or "Ratified")',
    );
    return;
  }

  const [status] = distinctStatuses;
  if (status !== 'Ratified') return; // An all-Draft tree needs no Ratification record.

  const record = validateRatificationRecord(errors, allExpectedIds, ratificationOverrideText);
  if (!record.exists) {
    errors.push(
      `Status: Ratified requires an owner-effective Ratification record at ${RATIFICATION_RECORD_PATH}`,
    );
    return;
  }
  for (const id of allExpectedIds) {
    if (!record.scopeIds.has(id)) {
      errors.push(
        `${id}: Ratified status has no covering entry in the Ratification decision record scope`,
      );
    }
  }

  for (const id of allExpectedIds) {
    const pin = STUDIO_STATUS_CONTENT_PIN[id];
    const actual = contentHashesById.get(id);
    if (!pin) {
      errors.push(`${id}: no independent status-excluded content pin is recorded`);
    } else if (actual !== pin) {
      errors.push(
        `${id}: content changed beyond the Status field (status-excluded content digest mismatch)`,
      );
    }
  }
}

function validateStudioBlock(block, path, expectedArea, errors, seenIds, statusById) {
  if (seenIds.has(block.id)) {
    errors.push(`${path}: duplicate principle ID ${block.id} (also in ${seenIds.get(block.id)})`);
  } else {
    seenIds.set(block.id, path);
  }
  if (block.area !== expectedArea) {
    errors.push(
      `${path}: ${block.id} uses area prefix ${block.area} but this file must use STUDIO-${expectedArea}-NNN`,
    );
  }

  for (const field of REQUIRED_FIELDS) {
    if (!block.fields.has(field)) {
      errors.push(`${path}: ${block.id} is missing required field "${field}"`);
    } else if (block.fields.get(field).length === 0) {
      errors.push(`${path}: ${block.id} has an empty "${field}" field`);
    }
  }
  const status = block.fields.get('Status');
  if (status !== undefined) statusById.set(block.id, status);
  if (!ALLOWED_STUDIO_STATUSES.has(status)) {
    errors.push(`${path}: ${block.id} Status must be exactly "Draft" or "Ratified"`);
  }
  if (block.fields.get('Ratification owner') !== 'repository owner') {
    errors.push(`${path}: ${block.id} Ratification owner must be exactly "repository owner"`);
  }

  const rawLegacyInputs = block.fields.get('Legacy inputs');
  if (!rawLegacyInputs || rawLegacyInputs === 'none') return;
  for (const token of rawLegacyInputs.split(',').map((value) => value.trim())) {
    if (!LEGACY_TOKEN.test(token)) {
      errors.push(
        `${path}: ${block.id} has malformed Legacy inputs entry "${token}" (expected "<realm>#<n>" or "none")`,
      );
      continue;
    }
    const [realm, rawNumber] = token.split('#');
    const number = Number(rawNumber);
    if (!LEGACY_RANGES.has(realm) || number < 1 || number > LEGACY_RANGES.get(realm)) {
      errors.push(`${path}: ${block.id} references unknown legacy input "${token}"`);
    }
  }
}

function validateLegacyCatalog(receipt, errors) {
  const snapshot = receipt?.legacySourceSnapshot;
  const snapshotFiles = new Map(
    Array.isArray(snapshot?.files) ? snapshot.files.map((record) => [record.path, record]) : [],
  );
  const actualIds = [];

  for (const realm of LEGACY_REALMS) {
    let buffer;
    try {
      buffer = readFileSync(filePath(realm.path));
    } catch {
      errors.push(`${realm.path}: legacy realm file is missing`);
      continue;
    }
    const numbers = [...buffer.toString('utf8').matchAll(/^###\s+(\d+)\.\s+/gm)].map((match) =>
      Number(match[1]),
    );
    const expectedNumbers = Array.from({ length: realm.count }, (_, index) => index + 1);
    if (!arraysEqual(numbers, expectedNumbers)) {
      errors.push(
        `${realm.path}: top-level legacy headings must remain exactly 1..${realm.count} (found ${numbers.join(', ')})`,
      );
    }
    const ids = numbers.map((number) => `studio-legacy:${realm.slug}:${number}`);
    actualIds.push(...ids);

    const record = snapshotFiles.get(realm.path);
    if (!record) {
      errors.push(`${realm.path}: missing from legacy source snapshot`);
      continue;
    }
    if (!arraysEqual(record.topLevelIds ?? [], ids)) {
      errors.push(`${realm.path}: receipt top-level ID inventory does not match current headings`);
    }
    const actualSha256 = sha256(buffer);
    const actualBlobSha = gitBlobSha(buffer);
    if (record.sha256 !== actualSha256) {
      errors.push(`${realm.path}: legacy file SHA-256 changed from the pinned source snapshot`);
    }
    if (record.blobSha !== actualBlobSha) {
      errors.push(`${realm.path}: legacy Git blob changed from the pinned source snapshot`);
    }
  }

  if (!arraysEqual(actualIds, EXPECTED_LEGACY_IDS)) {
    errors.push('legacy catalog is not the exact frozen 192-ID inventory');
  }
  const receiptIds = receipt?.legacyCatalogBaseline?.ids ?? [];
  if (!arraysEqual(receiptIds, EXPECTED_LEGACY_IDS)) {
    errors.push('receipt legacy baseline is not the exact frozen 192-ID inventory');
  }
  const snapshotPaths = Array.isArray(snapshot?.files)
    ? snapshot.files.map(({ path }) => path).sort()
    : [];
  const expectedPaths = LEGACY_REALMS.map(({ path }) => path).sort();
  if (!arraysEqual(snapshotPaths, expectedPaths)) {
    errors.push('legacy source snapshot must contain exactly the 21 legacy realm files');
  }

  return actualIds;
}

function validateReceipt(receipt, errors) {
  const successorIndex = new Map();
  if (
    !checkExactKeys(
      receipt,
      [
        '$schema',
        'schemaVersion',
        'receiptType',
        'verifiedAt',
        'purpose',
        'claims',
        'verification',
        'refresh',
        'legacyCatalogBaseline',
        'legacySourceSnapshot',
        'authorities',
        'integrity',
      ],
      [],
      RECEIPT_PATH,
      errors,
    )
  ) {
    return successorIndex;
  }

  if (receipt.$schema !== './migration-verification-receipt.schema.json') {
    errors.push(`${RECEIPT_PATH}: wrong schema reference`);
  }
  if (receipt.schemaVersion !== 1) errors.push(`${RECEIPT_PATH}: schemaVersion must be 1`);
  if (receipt.receiptType !== 'dated-verification-evidence') {
    errors.push(`${RECEIPT_PATH}: receiptType must label dated verification evidence`);
  }
  if (Number.isNaN(Date.parse(receipt.verifiedAt))) {
    errors.push(`${RECEIPT_PATH}: verifiedAt must be an ISO date-time`);
  }
  checkNonEmptyString(receipt.purpose, `${RECEIPT_PATH}: purpose`, errors);

  validateReceiptClaims(receipt.claims, errors);
  validateReceiptVerification(receipt.verification, errors);
  validateReceiptRefresh(receipt.refresh, errors);
  validateLegacyReceiptSections(receipt, errors);

  if (!Array.isArray(receipt.authorities)) {
    errors.push(`${RECEIPT_PATH}: authorities must be an array`);
  } else {
    const seenAuthorities = new Set();
    const seenSuccessorIds = new Set();
    for (const authorityRecord of receipt.authorities) {
      validateAuthorityRecord(authorityRecord, successorIndex, seenSuccessorIds, errors);
      if (seenAuthorities.has(authorityRecord?.authority)) {
        errors.push(`${RECEIPT_PATH}: duplicate authority "${authorityRecord.authority}"`);
      }
      seenAuthorities.add(authorityRecord?.authority);
    }
    if (!arraysEqual([...seenAuthorities].sort(), [...AUTHORITIES].sort())) {
      errors.push(
        `${RECEIPT_PATH}: must contain exactly Studio, Engineering, Product, and .github`,
      );
    }
  }

  validateReceiptIntegrity(receipt, errors);
  return successorIndex;
}

function validateReceiptClaims(claims, errors) {
  if (
    !checkExactKeys(
      claims,
      ['normativeSource', 'provesRatification', 'authorizesLegacyDeletion'],
      [],
      `${RECEIPT_PATH}: claims`,
      errors,
    )
  ) {
    return;
  }
  if (claims.normativeSource !== false) {
    errors.push(`${RECEIPT_PATH}: receipt cannot be a normative source`);
  }
  if (claims.provesRatification !== false) {
    errors.push(`${RECEIPT_PATH}: receipt cannot prove Ratification`);
  }
  if (claims.authorizesLegacyDeletion !== false) {
    errors.push(`${RECEIPT_PATH}: receipt cannot authorize legacy deletion`);
  }
}

function validateReceiptVerification(verification, errors) {
  if (
    !checkExactKeys(
      verification,
      ['sourceKind', 'retrieval', 'digestMethod', 'ledgerWasNotInput', 'liveCommand'],
      [],
      `${RECEIPT_PATH}: verification`,
      errors,
    )
  ) {
    return;
  }
  if (verification.sourceKind !== 'pinned-authority-bytes') {
    errors.push(`${RECEIPT_PATH}: verification must use pinned authority bytes`);
  }
  if (verification.ledgerWasNotInput !== true) {
    errors.push(`${RECEIPT_PATH}: verification must be independent of the ledger`);
  }
  if (verification.liveCommand !== 'pnpm principles:verify-live') {
    errors.push(`${RECEIPT_PATH}: live verification command is incorrect`);
  }
  checkNonEmptyString(verification.retrieval, `${RECEIPT_PATH}: retrieval`, errors);
  checkNonEmptyString(verification.digestMethod, `${RECEIPT_PATH}: digestMethod`, errors);
}

function validateReceiptRefresh(refresh, errors) {
  if (
    !checkExactKeys(
      refresh,
      ['requiredWhen', 'procedure', 'offlineLimit'],
      [],
      `${RECEIPT_PATH}: refresh`,
      errors,
    )
  ) {
    return;
  }
  for (const field of ['requiredWhen', 'procedure', 'offlineLimit']) {
    checkNonEmptyString(refresh[field], `${RECEIPT_PATH}: refresh.${field}`, errors);
  }
}

function validateLegacyReceiptSections(receipt, errors) {
  const baseline = receipt.legacyCatalogBaseline;
  if (
    checkExactKeys(
      baseline,
      ['repository', 'commit', 'realmFiles', 'topLevelPrinciples', 'ids'],
      [],
      `${RECEIPT_PATH}: legacyCatalogBaseline`,
      errors,
    )
  ) {
    if (baseline.repository !== 'jrmoulckers/studio') {
      errors.push(`${RECEIPT_PATH}: legacy baseline repository is incorrect`);
    }
    if (baseline.commit !== BASELINE_COMMIT) {
      errors.push(`${RECEIPT_PATH}: legacy baseline commit is incorrect`);
    }
    if (baseline.realmFiles !== 21 || baseline.topLevelPrinciples !== 192) {
      errors.push(`${RECEIPT_PATH}: legacy baseline counts must be 21 files and 192 principles`);
    }
    checkStringArray(baseline.ids, `${RECEIPT_PATH}: legacy baseline IDs`, errors);
  }

  const snapshot = receipt.legacySourceSnapshot;
  if (
    checkExactKeys(
      snapshot,
      ['repository', 'commit', 'realmFiles', 'topLevelPrinciples', 'files'],
      [],
      `${RECEIPT_PATH}: legacySourceSnapshot`,
      errors,
    )
  ) {
    if (snapshot.repository !== 'jrmoulckers/studio') {
      errors.push(`${RECEIPT_PATH}: legacy source repository is incorrect`);
    }
    if (snapshot.commit !== AUTHORITY_PINS.Studio.commit) {
      errors.push(`${RECEIPT_PATH}: legacy source snapshot commit is incorrect`);
    }
    if (snapshot.realmFiles !== 21 || snapshot.topLevelPrinciples !== 192) {
      errors.push(`${RECEIPT_PATH}: legacy snapshot counts must be 21 files and 192 principles`);
    }
    if (!Array.isArray(snapshot.files) || snapshot.files.length !== 21) {
      errors.push(`${RECEIPT_PATH}: legacy snapshot must contain 21 file records`);
    } else {
      for (const record of snapshot.files) {
        checkExactKeys(
          record,
          ['path', 'blobSha', 'sha256', 'topLevelIds'],
          [],
          `${RECEIPT_PATH}: legacy file`,
          errors,
        );
        if (!SHA1.test(record.blobSha ?? '')) {
          errors.push(`${RECEIPT_PATH}: ${record.path} has an invalid Git blob SHA`);
        }
        if (!SHA256.test(record.sha256 ?? '')) {
          errors.push(`${RECEIPT_PATH}: ${record.path} has an invalid SHA-256`);
        }
        checkStringArray(record.topLevelIds, `${RECEIPT_PATH}: ${record.path} topLevelIds`, errors);
      }
    }
  }
}

function validateAuthorityRecord(record, successorIndex, seenSuccessorIds, errors) {
  const authority = record?.authority;
  const label = `${RECEIPT_PATH}: ${authority ?? 'unknown authority'}`;
  if (
    !checkExactKeys(
      record,
      [
        'authority',
        'repository',
        'commit',
        'principleCount',
        'draftCount',
        'files',
        'principles',
        'catalogSha256',
      ],
      [],
      label,
      errors,
    )
  ) {
    return;
  }
  const pin = AUTHORITY_PINS[authority];
  if (!pin) {
    errors.push(`${label}: unknown authority`);
    return;
  }
  if (record.repository !== pin.repository) errors.push(`${label}: repository does not match pin`);
  if (record.commit !== pin.commit) errors.push(`${label}: ${authority} commit does not match pin`);
  if (record.principleCount !== pin.principleCount) {
    errors.push(`${label}: principleCount must be ${pin.principleCount}`);
  }
  if (record.draftCount !== pin.principleCount) {
    errors.push(`${label}: all ${pin.principleCount} successors must remain Draft`);
  }
  if (!SHA256.test(record.catalogSha256 ?? '')) {
    errors.push(`${label}: invalid catalog digest`);
  }

  const files = Array.isArray(record.files) ? record.files : [];
  const principles = Array.isArray(record.principles) ? record.principles : [];
  if (!Array.isArray(record.files)) errors.push(`${label}: files must be an array`);
  if (!Array.isArray(record.principles)) errors.push(`${label}: principles must be an array`);
  const receiptPaths = files.map(({ path }) => path);
  if (!arraysEqual(receiptPaths, [...receiptPaths].sort())) {
    errors.push(`${label}: file records must be sorted by path`);
  }
  if (!arraysEqual(receiptPaths, pin.paths)) {
    errors.push(`${label}: file paths do not match the pinned authority catalog`);
  }

  const fileIndex = new Map();
  for (const file of files) {
    checkExactKeys(
      file,
      ['path', 'blobSha', 'sha256', 'principleCount'],
      [],
      `${label}: file record`,
      errors,
    );
    if (fileIndex.has(file.path)) errors.push(`${label}: duplicate file path ${file.path}`);
    fileIndex.set(file.path, file);
    if (!SHA1.test(file.blobSha ?? '')) errors.push(`${label}: ${file.path} invalid Git blob SHA`);
    if (!SHA256.test(file.sha256 ?? '')) errors.push(`${label}: ${file.path} invalid SHA-256`);
    if (!Number.isInteger(file.principleCount) || file.principleCount < 1) {
      errors.push(`${label}: ${file.path} principleCount must be a positive integer`);
    }
  }

  for (const principle of principles) {
    checkExactKeys(
      principle,
      ['id', 'path', 'title', 'status', 'legacyInputs', 'blobSha', 'fileSha256', 'blockSha256'],
      [],
      `${label}: principle record`,
      errors,
    );
    if (!AUTHORITY_ID[authority].test(principle.id ?? '')) {
      errors.push(`${label}: malformed successor ID ${principle.id}`);
    }
    if (seenSuccessorIds.has(principle.id)) {
      errors.push(`${label}: duplicate successor ID ${principle.id}`);
    }
    seenSuccessorIds.add(principle.id);
    checkNonEmptyString(principle.title, `${label}: ${principle.id} title`, errors);
    if (principle.status !== 'Draft') {
      errors.push(`${label}: ${principle.id} must remain Draft`);
    }
    if (!SHA1.test(principle.blobSha ?? '')) {
      errors.push(`${label}: ${principle.id} invalid Git blob SHA`);
    }
    if (!SHA256.test(principle.fileSha256 ?? '')) {
      errors.push(`${label}: ${principle.id} invalid file SHA-256`);
    }
    if (!SHA256.test(principle.blockSha256 ?? '')) {
      errors.push(`${label}: ${principle.id} invalid block SHA-256`);
    }
    checkStringArray(principle.legacyInputs, `${label}: ${principle.id} Legacy inputs`, errors, {
      allowEmpty: true,
    });
    if (!arraysEqual(principle.legacyInputs ?? [], [...(principle.legacyInputs ?? [])].sort())) {
      errors.push(`${label}: ${principle.id} Legacy inputs must be sorted`);
    }
    for (const legacyId of principle.legacyInputs ?? []) {
      if (!EXPECTED_LEGACY_ID_SET.has(legacyId)) {
        errors.push(`${label}: ${principle.id} cites unknown legacy ID ${legacyId}`);
      }
    }
    const file = fileIndex.get(principle.path);
    if (!file) {
      errors.push(`${label}: ${principle.id} references unknown path ${principle.path}`);
    } else if (principle.blobSha !== file.blobSha || principle.fileSha256 !== file.sha256) {
      errors.push(`${label}: ${principle.id} file digests do not match ${principle.path}`);
    }
    successorIndex.set(`${authority}:${principle.id}`, {
      ...principle,
      authority,
      repository: record.repository,
      commit: record.commit,
    });
  }

  for (const file of files) {
    const actualCount = principles.filter(({ path }) => path === file.path).length;
    if (file.principleCount !== actualCount) {
      errors.push(`${label}: ${file.path} principleCount does not match its records`);
    }
  }
  if (principles.length !== pin.principleCount || record.principleCount !== principles.length) {
    errors.push(`${label}: successor catalog count does not match its records`);
  }
  if (record.draftCount !== principles.filter(({ status }) => status === 'Draft').length) {
    errors.push(`${label}: draftCount does not match successor statuses`);
  }
  const catalogDigest = sha256(JSON.stringify({ files, principles }));
  if (record.catalogSha256 !== catalogDigest) {
    errors.push(`${label}: catalog digest does not match receipt records`);
  }
  if (record.catalogSha256 !== pin.catalogSha256) {
    errors.push(`${label}: catalog digest does not match the independent pin`);
  }
}

function validateReceiptIntegrity(receipt, errors) {
  if (
    !checkExactKeys(
      receipt.integrity,
      ['algorithm', 'digest'],
      [],
      `${RECEIPT_PATH}: integrity`,
      errors,
    )
  ) {
    return;
  }
  if (receipt.integrity.algorithm !== 'sha256') {
    errors.push(`${RECEIPT_PATH}: integrity algorithm must be sha256`);
  }
  const unsigned = structuredClone(receipt);
  delete unsigned.integrity;
  const actualDigest = sha256(JSON.stringify(unsigned));
  if (receipt.integrity.digest !== actualDigest) {
    errors.push(`${RECEIPT_PATH}: integrity digest does not match receipt content`);
  }
  if (receipt.integrity.digest !== RECEIPT_INTEGRITY_PIN) {
    errors.push(`${RECEIPT_PATH}: integrity digest does not match the independent pin`);
  }
}

function validateLedger(ledger, legacyIds, errors) {
  const legacyIdSet = new Set(legacyIds);
  if (
    !checkExactKeys(
      ledger,
      ['$schema', 'schemaVersion', 'baseline', 'entries'],
      [],
      'principles/migration-ledger.json',
      errors,
    )
  ) {
    return;
  }
  if (ledger.$schema !== './migration-ledger.schema.json') {
    errors.push('principles/migration-ledger.json: wrong schema reference');
  }
  if (ledger.schemaVersion !== 1) {
    errors.push('principles/migration-ledger.json: schemaVersion must be 1');
  }
  validateLedgerBaseline(ledger.baseline, errors);
  if (!isObject(ledger.entries)) {
    errors.push('principles/migration-ledger.json: entries must be an object');
    return;
  }

  const entryIds = Object.keys(ledger.entries);
  if (entryIds.length !== 192) {
    errors.push(`ledger must contain exactly 192 entries (found ${entryIds.length})`);
  }
  for (const legacyId of entryIds) {
    if (!legacyIdSet.has(legacyId)) errors.push(`ledger contains unknown legacy ID ${legacyId}`);
  }
  for (const legacyId of legacyIds) {
    if (!(legacyId in ledger.entries)) errors.push(`ledger is missing legacy ID ${legacyId}`);
  }

  for (const [legacyId, entry] of Object.entries(ledger.entries)) {
    validateLedgerEntry(legacyId, entry, errors);
  }
}

function validateLedgerBaseline(baseline, errors) {
  if (
    !checkExactKeys(
      baseline,
      ['repository', 'commit', 'realmFiles', 'topLevelPrinciples', 'idFormat'],
      [],
      'ledger baseline',
      errors,
    )
  ) {
    return;
  }
  if (baseline.repository !== 'https://github.com/jrmoulckers/studio') {
    errors.push('ledger baseline repository is incorrect');
  }
  if (baseline.commit !== BASELINE_COMMIT) errors.push('ledger baseline commit is incorrect');
  if (baseline.realmFiles !== 21 || baseline.topLevelPrinciples !== 192) {
    errors.push('ledger baseline counts must be 21 files and 192 principles');
  }
  if (baseline.idFormat !== 'studio-legacy:<realm-file-slug>:<top-level-number>') {
    errors.push('ledger baseline ID format is incorrect');
  }
}

function validateLedgerEntry(legacyId, entry, errors) {
  const label = `ledger ${legacyId}`;
  if (
    !checkExactKeys(
      entry,
      ['disposition', 'successors', 'status', 'rationale', 'evidence', 'owner'],
      ['retirementCategory', 'citationException'],
      label,
      errors,
    )
  ) {
    return;
  }
  if (!DISPOSITIONS.has(entry.disposition)) {
    errors.push(`${label}: unknown disposition "${entry.disposition}"`);
  }
  if (!LEDGER_STATUSES.has(entry.status)) errors.push(`${label}: unknown status "${entry.status}"`);
  checkNonEmptyString(entry.rationale, `${label}: rationale`, errors);
  checkStringArray(entry.evidence, `${label}: evidence`, errors);
  if (entry.owner !== 'repository owner') errors.push(`${label}: owner must be repository owner`);
  if (!Array.isArray(entry.successors)) {
    errors.push(`${label}: successors must be an array`);
    return;
  }

  const successorKeys = new Set();
  for (const successor of entry.successors) {
    if (!checkExactKeys(successor, ['authority', 'id'], [], `${label}: successor`, errors)) {
      continue;
    }
    if (!AUTHORITY_SET.has(successor.authority)) {
      errors.push(`${label}: unknown successor authority "${successor.authority}"`);
      continue;
    }
    if (!AUTHORITY_ID[successor.authority].test(successor.id ?? '')) {
      errors.push(`${label}: malformed ${successor.authority} successor ID "${successor.id}"`);
    }
    const key = `${successor.authority}:${successor.id}`;
    if (successorKeys.has(key)) errors.push(`${label}: duplicate successor ${key}`);
    successorKeys.add(key);
  }

  if (['rewrite', 'reference'].includes(entry.disposition) && entry.successors.length !== 1) {
    errors.push(`${label}: ${entry.disposition} requires exactly one successor`);
  }
  if (entry.disposition === 'split' && entry.successors.length < 2) {
    errors.push(`${label}: split requires at least two successors`);
  }
  if (entry.disposition === 'retire' && entry.successors.length !== 0) {
    errors.push(`${label}: retire requires zero successors`);
  }

  if (entry.disposition === 'retire') {
    if (!RETIREMENT_CATEGORIES.has(entry.retirementCategory)) {
      errors.push(`${label}: retire requires a recognized retirementCategory`);
    }
    if ('citationException' in entry) {
      errors.push(`${label}: retire cannot have a citationException`);
    }
    const sourceEvidence = entry.evidence.some((value) =>
      value.includes(`/studio/blob/${AUTHORITY_PINS.Studio.commit}/principles/`),
    );
    if (!sourceEvidence) errors.push(`${label}: retirement must preserve pinned source evidence`);
  } else if ('retirementCategory' in entry) {
    errors.push(`${label}: only retire may set retirementCategory`);
  }

  if ('citationException' in entry) validateCitationException(legacyId, entry, errors);
}

function validateCitationException(legacyId, entry, errors) {
  const label = `ledger ${legacyId}: citationException`;
  const exception = entry.citationException;
  if (!checkExactKeys(exception, ['kind', 'reason', 'evidence'], [], label, errors)) {
    return;
  }
  if (entry.disposition !== 'reference' || entry.successors.length !== 1) {
    errors.push(`${label}: allowed only for a single-successor reference`);
  }
  if (entry.successors[0]?.authority === 'Studio') {
    errors.push(`${label}: allowed only for externally verified ownership`);
  }
  if (exception.kind !== 'externally-verified-ownership') {
    errors.push(`${label}: kind must be externally-verified-ownership`);
  }
  checkNonEmptyString(exception.reason, `${label}: reason`, errors);
  checkStringArray(exception.evidence, `${label}: evidence`, errors);
}

function validateReciprocity(ledger, successorIndex, errors) {
  const mappedSuccessors = new Set();
  for (const [legacyId, entry] of Object.entries(ledger.entries ?? {})) {
    for (const successor of entry.successors ?? []) {
      const successorKey = `${successor.authority}:${successor.id}`;
      const principle = successorIndex.get(successorKey);
      if (!principle) {
        errors.push(`${legacyId}: unknown successor ${successorKey}`);
        continue;
      }
      mappedSuccessors.add(successorKey);
      const citesLegacy = principle.legacyInputs.includes(legacyId);
      if (!citesLegacy && !entry.citationException) {
        errors.push(`${legacyId}: ${successorKey} does not cite the legacy ID`);
      }
      if (citesLegacy && entry.citationException) {
        errors.push(
          `${legacyId}: citationException is unnecessary because ${successorKey} cites it`,
        );
      }
      const sourceUrl = `https://github.com/${principle.repository}/blob/${principle.commit}/${principle.path}`;
      if (!entry.evidence.includes(RECEIPT_PATH) || !entry.evidence.includes(sourceUrl)) {
        errors.push(
          `${legacyId}: evidence must include the receipt and pinned source for ${successorKey}`,
        );
      }
      if (entry.citationException && !entry.citationException.evidence.includes(sourceUrl)) {
        errors.push(
          `${legacyId}: citationException must cite the pinned source for ${successorKey}`,
        );
      }
      if (principle.status === 'Draft' && entry.status !== 'proposed') {
        errors.push(`${legacyId}: a Draft successor cannot advance the disposition past proposed`);
      }
    }
  }

  for (const principle of successorIndex.values()) {
    for (const legacyId of principle.legacyInputs) {
      if (!(legacyId in (ledger.entries ?? {}))) {
        errors.push(
          `${principle.authority}:${principle.id} cites legacy ID ${legacyId} without a disposition`,
        );
      }
    }
  }
  return mappedSuccessors;
}

function validateLocalStudioReceipt(localCatalog, receipt, errors) {
  const studio = receipt.authorities?.find(({ authority }) => authority === 'Studio');
  if (!studio) return;

  const receiptPrinciples = new Map(
    studio.principles.map((principle) => [principle.id, principle]),
  );
  const localPrinciples = new Map(
    localCatalog.principles.map((principle) => [principle.id, principle]),
  );

  if (!arraysEqual([...receiptPrinciples.keys()].sort(), [...localPrinciples.keys()].sort())) {
    errors.push('local Studio successor IDs do not match the pinned receipt catalog');
    return;
  }

  for (const [id, receiptPrinciple] of receiptPrinciples) {
    const localPrinciple = localPrinciples.get(id);
    if (localPrinciple.path !== receiptPrinciple.path) {
      errors.push(`${id}: path "${localPrinciple.path}" does not match the pinned receipt`);
    }
    if (localPrinciple.title !== receiptPrinciple.title) {
      errors.push(`${id}: title does not match the pinned receipt`);
    }
    if (!arraysEqual(localPrinciple.legacyInputs, receiptPrinciple.legacyInputs)) {
      errors.push(`${id}: Legacy inputs do not match the pinned receipt`);
    }

    const receiptStatus = receiptPrinciple.status; // always "Draft": the receipt is unrefreshed.
    const localStatus = localPrinciple.status;
    if (localStatus === receiptStatus) {
      // Nothing is claimed to have changed for this principle: its own block must be identical.
      if (localPrinciple.blockSha256 !== receiptPrinciple.blockSha256) {
        errors.push(`${id}: content changed from the pinned receipt with no Status transition`);
      }
    } else if (receiptStatus === 'Draft' && localStatus === 'Ratified') {
      // The only permitted transition. Content equivalence (besides Status) is proven by the
      // independent status-excluded content pin, cross-checked in validateStudioStatuses;
      // nothing further to compare against the (intentionally unrefreshed) receipt bytes here.
      continue;
    } else {
      errors.push(
        `${id}: Status transition from receipt-pinned "${receiptStatus}" to local "${localStatus}" is not permitted`,
      );
    }
  }
}

function buildCatalogFromSources(authority, sourceFiles) {
  const files = [];
  const principles = [];
  const orderedSources = [...sourceFiles].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  for (const { path, buffer, blobSha: suppliedBlobSha } of orderedSources) {
    const blobSha = suppliedBlobSha ?? gitBlobSha(buffer);
    const fileSha256 = sha256(buffer);
    const parsed = parseAuthorityPrinciples(
      authority,
      buffer.toString('utf8'),
      path,
      blobSha,
      fileSha256,
    );
    files.push({
      path,
      blobSha,
      sha256: fileSha256,
      principleCount: parsed.length,
    });
    principles.push(...parsed);
  }
  return {
    files,
    principles,
    catalogSha256: sha256(JSON.stringify({ files, principles })),
  };
}

function parseAuthorityPrinciples(authority, text, path, blobSha, fileSha256) {
  let heading;
  if (authority === 'Studio') {
    heading = /^### (STUDIO-[A-Z0-9]+-\d{3}) — (.+)$/gm;
  } else if (authority === 'Engineering') {
    heading = /^## (.+)$/gm;
  } else if (authority === 'Product') {
    heading = /^## (PROD-[A-Z0-9]+-\d{3}): (.+)$/gm;
  } else {
    heading = /^## (GH-[A-Z0-9]+-\d{3}) — (.+)$/gm;
  }

  const matches = [...text.matchAll(heading)];
  return matches.map((match, index) => {
    const block = text.slice(match.index, matches[index + 1]?.index ?? text.length);
    const id =
      authority === 'Engineering' ? metadataValue(block, authority, 'ID') : match[1].trim();
    const title = authority === 'Engineering' ? match[1].trim() : match[2].trim();
    const status = metadataValue(block, authority, 'Status');
    const legacyInputs = normalizeLegacyInputs(
      authority,
      metadataValue(block, authority, 'Legacy inputs'),
    );
    return {
      id,
      path,
      title,
      status,
      legacyInputs,
      blobSha,
      fileSha256,
      blockSha256: sha256(block),
    };
  });
}

function metadataValue(block, authority, field) {
  const marker = authority === 'Engineering' ? `- ${field}:` : `- **${field}:**`;
  const lines = block.split(/\r?\n/);
  const index = lines.findIndex((line) => line.startsWith(marker));
  if (index === -1) return '';
  const chunks = [lines[index].slice(marker.length).trim()];
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    const line = lines[cursor];
    if (!/^\s{2,}\S/.test(line) || /^\s*-\s/.test(line)) break;
    chunks.push(line.trim());
  }
  return chunks.filter(Boolean).join(' ');
}

function normalizeLegacyInputs(authority, raw) {
  if (!raw || raw === 'none') return [];
  const ids = [];
  let matcher;
  if (authority === 'Studio') {
    matcher = /([a-z0-9-]+)#(\d+)/g;
    for (const match of raw.matchAll(matcher)) {
      ids.push(`studio-legacy:${match[1]}:${Number(match[2])}`);
    }
  } else if (authority === '.github') {
    matcher = /([a-z0-9-]+)\.md\s+§(\d+)(?:\.\d+)*/g;
    for (const match of raw.matchAll(matcher)) {
      ids.push(`studio-legacy:${match[1]}:${Number(match[2])}`);
    }
  } else {
    matcher = /studio-legacy:[a-z0-9-]+:\d+/g;
    ids.push(...(raw.match(matcher) ?? []));
  }
  return sortedUnique(ids);
}

function validateState({
  ledger,
  receipt,
  ledgerRaw,
  receiptRaw,
  checkLocalSources,
  studioFileOverrides = new Map(),
  ratificationOverrideText,
}) {
  const errors = [
    ...findDuplicateJsonKeys(ledgerRaw, 'principles/migration-ledger.json'),
    ...findDuplicateJsonKeys(receiptRaw, RECEIPT_PATH),
  ];
  const legacyIds = checkLocalSources
    ? validateLegacyCatalog(receipt, errors)
    : EXPECTED_LEGACY_IDS;
  const localStudio = checkLocalSources
    ? validateStudioTree(errors, { fileOverrides: studioFileOverrides, ratificationOverrideText })
    : null;
  const successorIndex = validateReceipt(receipt, errors);
  validateLedger(ledger, legacyIds, errors);
  const mappedSuccessors = validateReciprocity(ledger, successorIndex, errors);
  if (localStudio) validateLocalStudioReceipt(localStudio, receipt, errors);
  return {
    errors,
    summary: summarizeLedger(ledger, successorIndex, mappedSuccessors),
    localStudioStatus: localStudio?.localStatus ?? null,
  };
}

function summarizeLedger(ledger, successorIndex, mappedSuccessors) {
  const dispositions = Object.fromEntries([...DISPOSITIONS].map((value) => [value, 0]));
  const destinations = Object.fromEntries(AUTHORITIES.map((value) => [value, 0]));
  let links = 0;
  let citationExceptions = 0;
  for (const entry of Object.values(ledger.entries ?? {})) {
    if (entry.disposition in dispositions) dispositions[entry.disposition] += 1;
    if (entry.citationException) citationExceptions += 1;
    for (const successor of entry.successors ?? []) {
      links += 1;
      if (successor.authority in destinations) destinations[successor.authority] += 1;
    }
  }
  const draftCatalog = [...successorIndex.values()].filter(
    ({ status }) => status === 'Draft',
  ).length;
  const mappedDraft = [...mappedSuccessors].filter(
    (key) => successorIndex.get(key)?.status === 'Draft',
  ).length;
  return {
    entries: Object.keys(ledger.entries ?? {}).length,
    dispositions,
    destinations,
    links,
    citationExceptions,
    uniqueMappedSuccessors: mappedSuccessors.size,
    draftCatalog,
    mappedDraft,
  };
}

function runNegativeFixtures(fixtures, baseline) {
  const errors = [];
  if (
    !checkExactKeys(fixtures, ['schemaVersion', 'cases'], [], 'negative mutation fixtures', errors)
  ) {
    return { errors, count: 0 };
  }
  if (fixtures.schemaVersion !== 1 || !Array.isArray(fixtures.cases)) {
    errors.push('negative mutation fixtures: invalid schemaVersion or cases');
    return { errors, count: 0 };
  }

  for (const fixture of fixtures.cases) {
    const ledger = structuredClone(baseline.ledger);
    const receipt = structuredClone(baseline.receipt);
    let ledgerRaw = baseline.ledgerRaw;
    let receiptRaw = baseline.receiptRaw;
    let studioFileOverrides = new Map();
    let ratificationOverrideText;
    try {
      ({ ledgerRaw, receiptRaw, studioFileOverrides, ratificationOverrideText } =
        applyNegativeMutation(fixture.mutation, ledger, receipt, ledgerRaw, receiptRaw));
    } catch (error) {
      errors.push(`negative fixture "${fixture.name}" could not be applied: ${error.message}`);
      continue;
    }
    const result = validateState({
      ledger,
      receipt,
      ledgerRaw,
      receiptRaw,
      checkLocalSources: Boolean(fixture.checkLocalSources),
      studioFileOverrides,
      ratificationOverrideText,
    });
    if (!result.errors.some((message) => message.includes(fixture.expectedError))) {
      errors.push(
        `negative fixture "${fixture.name}" did not fail with "${fixture.expectedError}"`,
      );
    }
  }
  return { errors, count: fixtures.cases.length };
}

function applyNegativeMutation(mutation, ledger, receipt, ledgerRaw, receiptRaw) {
  switch (mutation.operation) {
    case 'add-unknown-ledger-entry':
      ledger.entries[mutation.legacyId] = structuredClone(ledger.entries[mutation.cloneFrom]);
      break;
    case 'duplicate-ledger-key': {
      const marker = '"entries": {';
      const insertion = `${marker}\n    "${mutation.legacyId}": {},`;
      ledgerRaw = ledgerRaw.replace(marker, insertion);
      Object.assign(ledger, JSON.parse(ledgerRaw));
      break;
    }
    case 'set-authority-field': {
      const authority = receipt.authorities.find(
        (record) => record.authority === mutation.authority,
      );
      authority[mutation.field] = mutation.value;
      break;
    }
    case 'set-principle-field': {
      const authority = receipt.authorities.find(
        (record) => record.authority === mutation.authority,
      );
      const principle = authority.principles.find(({ id }) => id === mutation.id);
      principle[mutation.field] = mutation.value;
      break;
    }
    case 'delete-principle': {
      const authority = receipt.authorities.find(
        (record) => record.authority === mutation.authority,
      );
      authority.principles = authority.principles.filter(({ id }) => id !== mutation.id);
      break;
    }
    case 'remove-principle-legacy-input': {
      const authority = receipt.authorities.find(
        (record) => record.authority === mutation.authority,
      );
      const principle = authority.principles.find(({ id }) => id === mutation.id);
      principle.legacyInputs = principle.legacyInputs.filter(
        (legacyId) => legacyId !== mutation.legacyId,
      );
      break;
    }
    case 'append-successor':
      ledger.entries[mutation.legacyId].successors.push(mutation.successor);
      break;
    case 'set-ledger-field':
      ledger.entries[mutation.legacyId][mutation.field] = mutation.value;
      break;
    case 'set-receipt-field': {
      let target = receipt;
      for (const segment of mutation.path.slice(0, -1)) target = target[segment];
      target[mutation.path.at(-1)] = mutation.value;
      break;
    }
    case 'mutate-studio-file': {
      const original = readFileSync(filePath(mutation.path), 'utf8');
      if (!original.includes(mutation.find)) {
        throw new Error(`pattern not found in ${mutation.path}`);
      }
      const mutated = original.replace(mutation.find, mutation.replace);
      return {
        ledgerRaw,
        receiptRaw,
        studioFileOverrides: new Map([[mutation.path, Buffer.from(mutated, 'utf8')]]),
      };
    }
    case 'mutate-ratification-record': {
      const original = readFileSync(filePath(RATIFICATION_RECORD_PATH), 'utf8');
      if (!original.includes(mutation.find)) {
        throw new Error('pattern not found in the Ratification decision record');
      }
      return {
        ledgerRaw,
        receiptRaw,
        ratificationOverrideText: original.replace(mutation.find, mutation.replace),
      };
    }
    case 'delete-ratification-record':
      return { ledgerRaw, receiptRaw, ratificationOverrideText: null };
    default:
      throw new Error(`unknown operation "${mutation.operation}"`);
  }
  return { ledgerRaw, receiptRaw };
}

function githubToken() {
  const environmentToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (environmentToken?.trim()) return environmentToken.trim();
  try {
    return execFileSync('gh', ['auth', 'token'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    }).trim();
  } catch {
    throw new Error(
      'live verification requires GH_TOKEN, GITHUB_TOKEN, or an authenticated `gh` session',
    );
  }
}

async function githubJson(url, token) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'jrm-studio-principle-verifier',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (response.ok) return response.json();
    const body = (await response.text()).slice(0, 300);
    const retryable = response.status === 429 || response.status >= 500;
    if (retryable && attempt < 3) {
      const retryAfter = Number(response.headers.get('retry-after') ?? 0);
      await delay(Math.max(retryAfter * 1000, attempt * 500));
      continue;
    }
    throw new Error(`GitHub API ${response.status} for ${url}: ${body}`);
  }
  throw new Error(`GitHub API retry limit reached for ${url}`);
}

async function verifyLiveReceipt(receipt) {
  const token = githubToken();
  for (const authority of AUTHORITIES) {
    const pin = AUTHORITY_PINS[authority];
    const receiptAuthority = receipt.authorities.find((record) => record.authority === authority);
    const apiRoot = `https://api.github.com/repos/${pin.repository}`;
    const tree = await githubJson(`${apiRoot}/git/trees/${pin.commit}?recursive=1`, token);
    if (tree.truncated) throw new Error(`${authority}: Git tree response was truncated`);
    const treeIndex = new Map(tree.tree.map((entry) => [entry.path, entry]));
    const sources = await Promise.all(
      pin.paths.map(async (path) => {
        const entry = treeIndex.get(path);
        if (!entry || entry.type !== 'blob') {
          throw new Error(`${authority}: pinned source path is missing: ${path}`);
        }
        const expectedFile = receiptAuthority.files.find((file) => file.path === path);
        if (entry.sha !== expectedFile.blobSha) {
          throw new Error(`${authority}: ${path} Git blob does not match the receipt`);
        }
        const blob = await githubJson(`${apiRoot}/git/blobs/${entry.sha}`, token);
        if (blob.encoding !== 'base64') {
          throw new Error(`${authority}: ${path} blob did not use base64 encoding`);
        }
        const buffer = Buffer.from(blob.content.replace(/\s/g, ''), 'base64');
        if (gitBlobSha(buffer) !== entry.sha) {
          throw new Error(`${authority}: ${path} Git blob digest failed`);
        }
        if (sha256(buffer) !== expectedFile.sha256) {
          throw new Error(`${authority}: ${path} SHA-256 does not match the receipt`);
        }
        return { path, buffer, blobSha: entry.sha };
      }),
    );
    const liveCatalog = buildCatalogFromSources(authority, sources);
    if (
      JSON.stringify(liveCatalog.files) !== JSON.stringify(receiptAuthority.files) ||
      JSON.stringify(liveCatalog.principles) !== JSON.stringify(receiptAuthority.principles) ||
      liveCatalog.catalogSha256 !== receiptAuthority.catalogSha256
    ) {
      throw new Error(
        `${authority}: live IDs, paths, statuses, Legacy inputs, or content digests differ from the receipt`,
      );
    }
    console.log(
      `  ${authority}: ${liveCatalog.principles.length} Draft principle(s) at ${pin.commit}`,
    );
  }
}

function printFailure(errors) {
  console.error('Principle validation FAILED:\n');
  for (const error of errors) console.error(`  - ${error}`);
  console.error(`\n${errors.length} problem(s).`);
}

const args = process.argv.slice(2);
const unknownArgs = args.filter((argument) => argument !== '--live');
if (unknownArgs.length > 0) {
  printFailure([`unknown argument(s): ${unknownArgs.join(', ')}`]);
  process.exit(1);
}

const loadErrors = [];
const ledgerFile = readJson('principles/migration-ledger.json', loadErrors);
const receiptFile = readJson(RECEIPT_PATH, loadErrors);
const ledgerSchemaFile = readJson('principles/migration-ledger.schema.json', loadErrors);
const receiptSchemaFile = readJson(
  'principles/migration-verification-receipt.schema.json',
  loadErrors,
);
const fixturesFile = readJson(
  'scripts/fixtures/principles/migration-negative-mutations.json',
  loadErrors,
);
validateSchemaFiles(ledgerSchemaFile.value, receiptSchemaFile.value, loadErrors);

if (loadErrors.length > 0 || !ledgerFile.value || !receiptFile.value || !fixturesFile.value) {
  printFailure(loadErrors);
  process.exit(1);
}

const result = validateState({
  ledger: ledgerFile.value,
  receipt: receiptFile.value,
  ledgerRaw: ledgerFile.raw,
  receiptRaw: receiptFile.raw,
  checkLocalSources: true,
});
const fixtureResult =
  result.errors.length === 0
    ? runNegativeFixtures(fixturesFile.value, {
        ledger: ledgerFile.value,
        receipt: receiptFile.value,
        ledgerRaw: ledgerFile.raw,
        receiptRaw: receiptFile.raw,
      })
    : { errors: [], count: 0 };
const errors = [...result.errors, ...fixtureResult.errors];

if (errors.length > 0) {
  printFailure(errors);
  process.exit(1);
}

const { summary, localStudioStatus } = result;
const studioStatusLabel =
  localStudioStatus === 'Ratified'
    ? 'Ratified (locally; the pinned receipt stays historical Draft)'
    : localStudioStatus === 'mixed'
      ? 'mixed'
      : 'Draft';
console.log(
  `Principle validation passed: ${AUTHORITY_PINS.Studio.principleCount} Studio successors are ${studioStatusLabel} and ${summary.entries}/192 legacy dispositions verified.`,
);
console.log(
  `  Dispositions: rewrite ${summary.dispositions.rewrite}, split ${summary.dispositions.split}, reference ${summary.dispositions.reference}, retire ${summary.dispositions.retire}`,
);
console.log(
  `  Successor links: Studio ${summary.destinations.Studio}, Engineering ${summary.destinations.Engineering}, Product ${summary.destinations.Product}, .github ${summary.destinations['.github']}`,
);
console.log(
  `  Receipt: ${summary.draftCatalog} Draft principles; ${summary.uniqueMappedSuccessors} unique mapped successors; ${summary.citationExceptions} verified citation exceptions`,
);
console.log(
  `  Deletion gate: blocked by ${summary.mappedDraft} mapped Draft successors; the receipt authorizes neither Ratification nor deletion`,
);
console.log(`  Negative mutations: ${fixtureResult.count} expected failures confirmed`);

if (args.includes('--live')) {
  console.log('Live authority verification:');
  try {
    await verifyLiveReceipt(receiptFile.value);
  } catch (error) {
    printFailure([error.message]);
    process.exit(1);
  }
  console.log('Live authority verification passed.');
}
