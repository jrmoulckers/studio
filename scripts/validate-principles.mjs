#!/usr/bin/env node

/**
 * Offline and authenticated validation for the completed Studio legacy principle migration.
 *
 * Offline (`pnpm principles:check`) proves committed structure only. Every authority fact is
 * pinned here independently of the ledger and of both receipts, so a receipt cannot bootstrap
 * its own authority. Authenticated verification (`pnpm principles:verify-live`) re-reads the
 * remote bytes, owner merge metadata, immutable historical ledger, and deleted legacy blobs.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Independent pins. None of these values is read from the ledger or a receipt.
// ---------------------------------------------------------------------------

const OWNER = { login: 'jrmoulckers', id: 43014188 };

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
].map(([slug, count]) => ({ slug, count, path: `principles/${slug}.md` }));

const LEGACY_RANGES = new Map(LEGACY_REALMS.map(({ slug, count }) => [slug, count]));
const EXPECTED_LEGACY_IDS = LEGACY_REALMS.flatMap(({ slug, count }) =>
  Array.from({ length: count }, (_, index) => `studio-legacy:${slug}:${index + 1}`),
);
const EXPECTED_LEGACY_ID_SET = new Set(EXPECTED_LEGACY_IDS);

// The exact, frozen deletion set. Nothing else may be removed and none of these may return.
const FROZEN_LEGACY_PATHS = LEGACY_REALMS.map(({ path }) => path).sort();
const FROZEN_LEGACY_PATH_SET = new Set(FROZEN_LEGACY_PATHS);

const LEGACY_BASELINE_COMMIT = 'efe6aa3b5ad020331a91f533844b0b9f70d70b76';
const LEGACY_SNAPSHOT = {
  repository: 'jrmoulckers/studio',
  commit: '20dc8e0119d8ee46bd3ec26643f1b21a3eca8df0',
  realmFiles: 21,
  topLevelPrinciples: 192,
  totalBytes: 321943,
};

const RECONCILIATION_LEDGER = {
  repository: 'jrmoulckers/studio',
  commit: '63a5adb46d12fa22dc1ff9c6f1b3dd95a376cea5',
  path: 'principles/migration-ledger.json',
  blobSha: '9996f8c4bdddc6cef4fdfdd5476eda1daf16f20d',
  sha256: '9856852bd9bab8707582f94a4e64d78a4cdecacbb622638902c38e0e1a680de3',
  mappingSha256: '887e11e27b97cdbcf12a0b914e8af685dbc14cda14ee6301ceb35282277d5c75',
};

// Post-finalization ledger amendment: security:8 was corrected from reference→split, adding
// .github GH-REPO-003 as a second successor. The PR #21 mapping pin is preserved above for
// historical-evidence validation; this pin is the current authoritative mapping digest.
const CURRENT_LEDGER_MAPPING_PIN =
  'c1e372db180c05c82f1ef6417a8f359e1323cb2221734505d81e330b1253d6fc';

const HISTORICAL_RECEIPT_PATH = 'principles/migration-verification-receipt.json';
const HISTORICAL_RECEIPT_PIN = {
  verifiedAt: '2026-08-08T23:14:56.835Z',
  integritySha256: 'b103a2d6a18b21b0b18e47c884f535d19a48100f294fc9a8d55d5e43656f2863',
};

const FINAL_RECEIPT_PATH = 'principles/migration-finalization-receipt.json';
// Recomputed when the mandatory `.github` branch-protection and CI gate evidence was added to the
// receipt. The pin stays independent: a tampered receipt that recomputes its own integrity digest
// still fails every authority, mapping, semantic, and protection pin below.
const FINAL_RECEIPT_INTEGRITY_PIN =
  '1a3e3b0fb92dd3688fdb6e5e5f4eb2d3f8dc1b87a75dab862298ab9f50937020';

const LEDGER_PATH = 'principles/migration-ledger.json';
const LEDGER_SCHEMA_PATH = 'principles/migration-ledger.schema.json';
const HISTORICAL_RECEIPT_SCHEMA_PATH = 'principles/migration-verification-receipt.schema.json';
const FINAL_RECEIPT_SCHEMA_PATH = 'principles/migration-finalization-receipt.schema.json';
const FIXTURES_PATH = 'scripts/fixtures/principles/migration-negative-mutations.json';
const RATIFICATION_RECORD_PATH = 'principles/RATIFICATION-DESIGN-EXPERIENCE.md';
const PRINCIPLE_TEMPLATE_PATH = 'principles/_template.md';

// Pre-ratification (Draft) authority state. Pinned so the preserved historical receipt can be
// validated on its own terms and so the live verifier can prove what changed before Ratification.
const DRAFT_AUTHORITY_PINS = {
  Studio: {
    repository: 'jrmoulckers/studio',
    commit: '20dc8e0119d8ee46bd3ec26643f1b21a3eca8df0',
    principleCount: 25,
    catalogSha256: 'fb76743ca159e80cc6ab16e84724b5f3352b455c8c591d290de304f065768976',
    semanticCatalogSha256: '20974e95649ffb2f995b52edac091581128edae6511541120a79f753e73cb5b4',
  },
  Engineering: {
    repository: 'jrmoulckers/engineering',
    commit: 'ea1ad771b46612a62d54b66e8077df4e5af6f16a',
    principleCount: 66,
    catalogSha256: '95b9bc8539ebc7f650fdf7f8085dd2de0302802f70a47e266d8654bbd7c304bf',
    semanticCatalogSha256: '71734ec3c72cbe031b533c5da281247b49e42e3731bc19d030da2797fd1f0407',
  },
  Product: {
    repository: 'jrmoulckers/product',
    commit: 'b0b2ef66094bbc5abf19cd4ae0ac85b05f12ddb5',
    principleCount: 40,
    catalogSha256: 'd2e36737dc83b4fc028e764658ed66c9a621bf41b4e1ce4aadf7c97f00a76c69',
    semanticCatalogSha256: 'b7347e3bfe8fa5bc992a68d47cac1047404901fe176c50ba62ed3ef855593c75',
  },
  '.github': {
    repository: 'jrmoulckers/.github',
    commit: '3036d5d1ed882a4c5acffe1ccfa0b49165538eef',
    principleCount: 43,
    catalogSha256: '6d73bff5689daff029268b495c2effc0c043eebad43a73ce6cca175915b7aab6',
    semanticCatalogSha256: 'b40c5a0a1f8b99045a2682d0917f93bb11a8e75129533443e448b7563af93724',
  },
};

// Owner-ratified authority state. Every value is an independent pin of an immutable merged commit.
const FINAL_AUTHORITY_PINS = {
  Studio: {
    repository: 'jrmoulckers/studio',
    commit: 'e077d700b07dd63be93de22a8f4e3c3b9fa79093',
    principleCount: 25,
    catalogSha256: '919928fbe252d94a01f827f7365601c73f72fdda78aeef945f1681c3a28e60f1',
    semanticCatalogSha256: '20974e95649ffb2f995b52edac091581128edae6511541120a79f753e73cb5b4',
    decisionPath: RATIFICATION_RECORD_PATH,
    decisionBlobSha: 'bd870d37593c6b5075cfd3a41a55bd7c870b3646',
    decisionSha256: '1c02d889d81fb8f52dba09c83d7c6e783dd0877e7a6c99cf40132d41e707319e',
    pullRequest: 25,
    paths: STUDIO_FILES.map(({ path }) => path).sort(),
  },
  Engineering: {
    repository: 'jrmoulckers/engineering',
    commit: '60ff2e43da40b8177b7b8bc591f7193d58af617a',
    principleCount: 66,
    catalogSha256: '1066ad8510609f0d982339b2e92938a2a170171963f413015aa8bc1ac8ada7b6',
    semanticCatalogSha256: '71734ec3c72cbe031b533c5da281247b49e42e3731bc19d030da2797fd1f0407',
    decisionPath: 'docs/ratification/2026-08-09-engineering-principles.md',
    decisionBlobSha: 'b2428fbf2424898d290206eba63ce114e0e29e78',
    decisionSha256: '9b542dbb36f771d9ea5da38d8a42e685683492dbdafb9556f3e75c002ff90552',
    pullRequest: 5,
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
    commit: '3a752c11856515a74eb204675d5d5198cac1e48e',
    principleCount: 40,
    catalogSha256: '874054da77cdb46eeda916cda10eddd30aa4e5442f211609ebfe1c62b707cf0f',
    semanticCatalogSha256: 'b7347e3bfe8fa5bc992a68d47cac1047404901fe176c50ba62ed3ef855593c75',
    decisionPath: 'docs/architecture/0001-ratify-product-principles.md',
    decisionBlobSha: 'ccc67b2160f38ea77fbf750599c51b2bb3096b9f',
    decisionSha256: 'c6187a35ef55a15a6a34c9b48557d78ca9197969c42f57508e358f8c71ba21f0',
    pullRequest: 5,
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
    commit: 'a7be84b20737f9d404ea53213dec159dd59d5747',
    principleCount: 43,
    catalogSha256: '7c8164ffc418209d6bfe32de4d9d312dcfe0e4d554ac2a3b6cdca687058d648e',
    semanticCatalogSha256: 'b614b927bca40b2c19fbd0a08a05d8c7eb6038943354b71e5b93c4861a3d5a78',
    decisionPath: 'principles/decisions/0001-github-ai-owner-ratification.md',
    decisionBlobSha: '1dc4702b5d357c43f15e241816480e34d3a7798d',
    decisionSha256: 'f9ebc479ac14f7eeb7d167d2467586a0fb6c33cb654a67c4d50f53fcc9746a84',
    pullRequest: 99,
    paths: [
      'principles/ai/agent-operations.md',
      'principles/ai/evidence-and-evals.md',
      'principles/ai/product-ai.md',
      'principles/github/actions-and-delivery.md',
      'principles/github/repository-governance.md',
    ],
  },
};

// The only reviewed semantic refinement between the Draft evidence and Ratification.
const EXPECTED_SEMANTIC_CHANGES = [
  {
    authority: '.github',
    id: 'GH-ACT-005',
    historicalSemanticSha256: '42dddba03f87cb55805c891c1a7679cc4454ac4abac7cb08a880de955c80cd57',
    ratifiedSemanticSha256: 'a6c2ce81397f1c94604cefd515f1fb18ceb0ec1d7be8336f82199288f6e7d53d',
    review: {
      repository: 'jrmoulckers/.github',
      pullRequest: 97,
      state: 'closed',
      merged: true,
      mergedAt: '2026-08-09T01:19:53Z',
      baseRef: 'main',
      beforeCommit: '3036d5d1ed882a4c5acffe1ccfa0b49165538eef',
      headCommit: '73a5bf6769a4d4235b55057453d896d876f71069',
      afterCommit: '97ff60ec21321563fa0fc7ba80015261e7dcd6fa',
      authorAssociation: 'OWNER',
      author: { login: 'jrmoulckers', id: 43014188 },
      mergedBy: { login: 'jrmoulckers', id: 43014188 },
    },
  },
];

// The `.github` decision record makes Ratification effective only when the owner merges "after the
// required `CI gate` succeeds", so the protected-branch rule and the gate result on the reviewed
// head are part of that authority's Ratification evidence, not just its decision prose. This pin is
// independent of the receipt and is re-read from the GitHub API by `--live`.
const PROTECTION_AUTHORITY = '.github';
const PROTECTION_PIN = {
  branch: 'main',
  strictRequiredStatusChecks: true,
  requiredChecks: [{ context: 'CI gate', appId: 15368 }],
  allowForcePushes: false,
  allowDeletions: false,
  ratificationHeadChecks: [
    {
      name: 'CI gate',
      required: true,
      status: 'completed',
      conclusion: 'success',
      detailsUrl: 'https://github.com/jrmoulckers/.github/actions/runs/31304248864/job/93221951923',
    },
    {
      name: 'Principle metadata tests',
      required: false,
      status: 'completed',
      conclusion: 'success',
      detailsUrl: 'https://github.com/jrmoulckers/.github/actions/runs/31304248864/job/93221925400',
    },
    {
      name: 'Sync engine tests',
      required: false,
      status: 'completed',
      conclusion: 'success',
      detailsUrl: 'https://github.com/jrmoulckers/.github/actions/runs/31304248864/job/93221925426',
    },
  ],
};

const LEDGER_TOTALS = {
  entries: 192,
  status: 'verified',
  dispositions: { rewrite: 21, split: 44, reference: 121, retire: 6 },
  destinations: { Studio: 44, Engineering: 92, Product: 56, '.github': 51 },
  links: 243,
  uniqueMappedSuccessors: 159,
  citationExceptions: 5,
  retirements: 6,
};

// Independent, status-excluded content digests for the 25 Studio blocks, taken from the reviewed
// pre-Ratification source. They are unaffected by a Draft -> Ratified Status edit and change if any
// other field moves, so local content continuity is provable without trusting either receipt.
const STUDIO_SEMANTIC_CONTENT_PIN = {
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

const STUDIO_RATIFICATION_BANNER = [
  "> **Ratification:** Each principle's `Status` becomes effective only when the repository owner",
  '> merges the covering Ratification decision record; before that merge, the candidate change is',
  '> proposed and non-normative.',
].join('\n');

// Independent digests of each Studio file preamble with only the Ratification banner normalized.
// The 25 principle blocks are pinned by the final receipt, so preamble pin + receipt blocks
// together pin every byte of all seven files while allowing the finalization preamble update.
const STUDIO_PREAMBLE_CONTENT_PIN = {
  'principles/design/foundations.md':
    '6a3880f79066c0db06ff50e83d2728858a6f7c00e1221ae3ff09b9ab04c693a5',
  'principles/design/tokens-and-themes.md':
    '3ea718db7bf2fe51d555811b4c36145ed24df2bc097b540e5c491507e79e0237',
  'principles/design/components.md':
    '0daed62d04dfe7c3140b2eea17098d587f935d91c30fdba8e7cb041cacb71dc6',
  'principles/experience/interaction.md':
    '96a43c3461073c91711fea5f557c61a8602547f74c5bd7de1a363156c6aead35',
  'principles/experience/accessibility.md':
    'ef25f9ad9ef456beb8f4460d9e8c4f10f68cabfabdb914d543d3fca5bd64a0e3',
  'principles/experience/localization.md':
    'f261f498e073d92173585f12ec09a2857adc74904a197856727a434a6d7fdec7',
  'principles/experience/ux.md': 'f365c88cae0f71ac4505e020f5f994afb8305519d426f7ac5f523113641a5f3f',
};

// A finalized preamble may not keep telling readers the legacy tree survives.
const STUDIO_PREAMBLE_FORBIDDEN_CLAIMS = [
  { pattern: /ledger stays at 0\/192/i, message: 'the migration ledger is no longer 0/192' },
  {
    pattern: /\b(?:it )?removes no legacy file\b/i,
    message: 'the 21 legacy realm files are removed',
  },
  {
    pattern: /\bdo(?:es)? not (?:remove|supersede)\b[^.]{0,60}\blegacy file\b/i,
    message: 'the 21 legacy realm files are superseded and removed',
  },
];

// The complete finalized authority/evidence inventory. New principle surfaces require an explicit
// owner-reviewed catalog change; they cannot appear in an unvalidated nested directory.
const PRINCIPLES_FILE_INVENTORY = [
  ...STUDIO_FILES.map(({ path }) => path),
  RATIFICATION_RECORD_PATH,
  LEDGER_PATH,
  LEDGER_SCHEMA_PATH,
  HISTORICAL_RECEIPT_PATH,
  HISTORICAL_RECEIPT_SCHEMA_PATH,
  FINAL_RECEIPT_PATH,
  FINAL_RECEIPT_SCHEMA_PATH,
  PRINCIPLE_TEMPLATE_PATH,
  'principles/README.md',
  'principles/AGENTS.md',
  'principles/MIGRATION.md',
].sort();

// Files that must survive the finalization: successors, decisions, evidence, and their contracts.
const PROTECTED_PATHS = [
  ...PRINCIPLES_FILE_INVENTORY,
  'scripts/validate-principles.mjs',
  FIXTURES_PATH,
].sort();

const PRINCIPLES_ROOT_MARKDOWN = [
  'principles/AGENTS.md',
  'principles/MIGRATION.md',
  'principles/RATIFICATION-DESIGN-EXPERIENCE.md',
  'principles/README.md',
  PRINCIPLE_TEMPLATE_PATH,
].sort();
const PRINCIPLE_TEMPLATE_REQUIRED_PHRASES = [
  'Non-normative until the repository owner merges an explicit Ratification decision.',
  'Use this template in an issue or pull request description;',
  'do not create a new realm file or insert an unpinned block into the Ratified tree.',
  'the implementation must update the declared catalog, owner decision record, finalization receipt, independent semantic pins, and negative fixtures together.',
  'pnpm principles:check` intentionally rejects an incomplete or self-baselined catalog change.',
  '### STUDIO-<AREA>-<NNN> — <Principle title>',
  '- **Status:** Draft',
  '- **Statement:**',
  '- **Rationale:**',
  '- **Verification:**',
  '- **Ratification owner:** repository owner',
  '- **Implementation owner:**',
  '- **Handoffs:**',
  '- **Legacy inputs:**',
];

const RATIFICATION_REQUIRED_PHRASES = [
  'Content, ownership, IDs, and legacy inputs are unchanged.',
  'Merging this pull request by the repository owner is the effective Ratification approval event.',
  'This record does not itself ratify anything and does not claim owner approval before merge.',
  'remains historical, non-normative evidence; it proves no Ratification and authorizes no deletion.',
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

const FINAL_MEANING_REQUIRED_PHRASES = [
  'only as a verified technical precondition',
  'repository-owner merge of the finalization pull request is the effective supersession and deletion act',
];
const FINAL_MEANING_FORBIDDEN_CLAIMS = [
  {
    pattern: /\breplaces?\b.{0,60}\bowner\b.{0,40}\b(?:merge|decision|approval)\b/i,
    message: 'a receipt cannot replace the owner merge decision',
  },
  {
    pattern: /\bwithout\b.{0,60}\bowner\b.{0,40}\b(?:merge|decision|approval)\b/i,
    message: 'deletion cannot be effective without the owner merge',
  },
  {
    pattern: /\b(?:is|becomes) normative\b/i,
    message: 'a receipt cannot become normative',
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
const AUTHORITIES = Object.keys(FINAL_AUTHORITY_PINS);
const AUTHORITY_SET = new Set(AUTHORITIES);
const AUTHORITY_ID = {
  Studio: /^STUDIO-[A-Z0-9]+-\d{3}$/,
  Engineering: /^ENG-[A-Z0-9]+-\d{3}$/,
  Product: /^PROD-[A-Z0-9]+-\d{3}$/,
  '.github': /^GH-[A-Z0-9]+-\d{3}$/,
};
const AUTHORITY_ID_PREFIX = {
  Studio: 'STUDIO',
  Engineering: 'ENG',
  Product: 'PROD',
  '.github': 'GH',
};
const SHA1 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const ID_HEADING = /^###\s+(STUDIO-([A-Z0-9]+)-(\d{3}))\b/;
const STUDIO_HEADING = /^###\s+STUDIO-/;
const FIELD_LINE = /^-\s+\*\*([^:*]+):\*\*\s*(.*)$/;
const LEGACY_TOKEN = /^[a-z0-9-]+#\d+$/;
const ALLOWED_STUDIO_STATUSES = new Set(['Draft', 'Ratified']);

const SCANNED_EXTENSIONS = new Set([
  '.md',
  '.mdx',
  '.json',
  '.mjs',
  '.cjs',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.yml',
  '.yaml',
  '.txt',
  '.ps1',
]);
const SKIPPED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.turbo',
  '.next',
  'coverage',
  '.pnpm-store',
]);

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const filePath = (relativePath) => join(repoRoot, ...relativePath.split('/'));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const gitBlobSha = (buffer) =>
  createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex');
const sortedUnique = (values) => [...new Set(values)].sort();
const arraysEqual = (left, right) =>
  Array.isArray(left) &&
  Array.isArray(right) &&
  left.length === right.length &&
  left.every((value, index) => value === right[index]);
const deepEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const normalizeWhitespace = (text) => text.replace(/\s+/g, ' ').trim();

const statusFieldPattern = (authority) =>
  authority === 'Engineering' ? /^- Status: .*$/m : /^- \*\*Status:\*\* .*$/m;
const statusFieldPlaceholder = (authority) =>
  authority === 'Engineering' ? '- Status: <normalized>' : '- **Status:** <normalized>';

/** Digest of a principle block with only its Status metadata line normalized. */
function semanticBlockSha256(block, authority) {
  const pattern = statusFieldPattern(authority);
  return sha256(
    pattern.test(block) ? block.replace(pattern, statusFieldPlaceholder(authority)) : block,
  );
}

function checkExactKeys(value, required, optional, label, errors) {
  if (!isObject(value)) {
    errors.push(`${label} must be an object`);
    return false;
  }
  const allowed = new Set([...required, ...optional]);
  let complete = true;
  for (const key of required) {
    if (!(key in value)) {
      errors.push(`${label} is missing "${key}"`);
      complete = false;
    }
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${label} has unknown property "${key}"`);
  }
  return complete;
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

function readJson(relativePath, errors) {
  let raw;
  try {
    raw = readFileSync(filePath(relativePath), 'utf8');
  } catch (error) {
    errors.push(`${relativePath}: cannot be read (${error.message})`);
    return { raw: '', value: null };
  }
  errors.push(...findDuplicateJsonKeys(raw, relativePath));
  try {
    return { raw, value: JSON.parse(raw) };
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON (${error.message})`);
    return { raw, value: null };
  }
}

// ---------------------------------------------------------------------------
// Working-tree view. Negative fixtures inject virtual files without touching disk.
// ---------------------------------------------------------------------------

function createSourceView(overrides = new Map()) {
  return {
    overrides,
    exists(relativePath) {
      if (overrides.has(relativePath)) return overrides.get(relativePath) !== null;
      return existsSync(filePath(relativePath));
    },
    read(relativePath) {
      if (overrides.has(relativePath)) return overrides.get(relativePath);
      try {
        const absolute = filePath(relativePath);
        if (!statSync(absolute).isFile()) return null;
        return readFileSync(absolute);
      } catch {
        return null;
      }
    },
    listFiles() {
      const found = new Set();
      const walk = (relativeDirectory) => {
        const absolute = relativeDirectory ? filePath(relativeDirectory) : repoRoot;
        for (const entry of readdirSync(absolute, { withFileTypes: true })) {
          const child = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            if (!SKIPPED_DIRECTORIES.has(entry.name)) walk(child);
          } else if (entry.isFile()) {
            found.add(child);
          }
        }
      };
      walk('');
      for (const [path, value] of overrides) {
        if (value === null) found.delete(path);
        else found.add(path);
      }
      return [...found].sort();
    },
  };
}

// ---------------------------------------------------------------------------
// Authority catalog parsing (identical rules for local files and remote bytes)
// ---------------------------------------------------------------------------

function authorityHeadingPattern(authority) {
  if (authority === 'Studio') return /^### (STUDIO-[A-Z0-9]+-\d{3}) — (.+)$/gm;
  if (authority === 'Engineering') return /^## (.+)$/gm;
  if (authority === 'Product') return /^## (PROD-[A-Z0-9]+-\d{3}): (.+)$/gm;
  return /^## (GH-[A-Z0-9]+-\d{3}) — (.+)$/gm;
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
  if (authority === 'Studio') {
    for (const match of raw.matchAll(/([a-z0-9-]+)#(\d+)/g)) {
      ids.push(`studio-legacy:${match[1]}:${Number(match[2])}`);
    }
  } else if (authority === '.github') {
    for (const match of raw.matchAll(/([a-z0-9-]+)\.md\s+§(\d+)(?:\.\d+)*/g)) {
      ids.push(`studio-legacy:${match[1]}:${Number(match[2])}`);
    }
  } else {
    ids.push(...(raw.match(/studio-legacy:[a-z0-9-]+:\d+/g) ?? []));
  }
  return sortedUnique(ids);
}

function parseAuthorityPrinciples(authority, text, path, blobSha, fileSha256, includeSemantic) {
  const matches = [...text.matchAll(authorityHeadingPattern(authority))];
  return matches.map((match, index) => {
    const block = text.slice(match.index, matches[index + 1]?.index ?? text.length);
    const id =
      authority === 'Engineering' ? metadataValue(block, authority, 'ID') : match[1].trim();
    const title = authority === 'Engineering' ? match[1].trim() : match[2].trim();
    const record = {
      id,
      path,
      title,
      status: metadataValue(block, authority, 'Status'),
      legacyInputs: normalizeLegacyInputs(
        authority,
        metadataValue(block, authority, 'Legacy inputs'),
      ),
      blobSha,
      fileSha256,
      blockSha256: sha256(block),
    };
    if (includeSemantic) record.semanticSha256 = semanticBlockSha256(block, authority);
    return record;
  });
}

/**
 * Builds the catalog exactly as a receipt records it. `includeSemantic` selects the final
 * (Ratified) record shape; the preserved historical receipt predates the semantic field.
 */
function buildCatalogFromSources(authority, sourceFiles, { includeSemantic = true } = {}) {
  const files = [];
  const principles = [];
  const ordered = [...sourceFiles].sort((left, right) => left.path.localeCompare(right.path));
  for (const { path, buffer, blobSha: suppliedBlobSha } of ordered) {
    const blobSha = suppliedBlobSha ?? gitBlobSha(buffer);
    const fileSha256 = sha256(buffer);
    const parsed = parseAuthorityPrinciples(
      authority,
      buffer.toString('utf8'),
      path,
      blobSha,
      fileSha256,
      includeSemantic,
    );
    files.push({ path, blobSha, sha256: fileSha256, principleCount: parsed.length });
    principles.push(...parsed);
  }
  return {
    files,
    principles,
    catalogSha256: sha256(JSON.stringify({ files, principles })),
    semanticCatalogSha256: includeSemantic ? semanticCatalogSha256(principles) : null,
  };
}

function semanticCatalogSha256(principles) {
  return sha256(
    JSON.stringify(
      principles.map(({ id, path, title, legacyInputs, semanticSha256 }) => ({
        id,
        path,
        title,
        legacyInputs,
        semanticSha256,
      })),
    ),
  );
}

/** Catalog identity that survives a non-principle edit such as a file preamble update. */
function contentCatalogSha256(principles) {
  return sha256(
    JSON.stringify(
      principles.map(({ blobSha: _blobSha, fileSha256: _fileSha256, ...rest }) => rest),
    ),
  );
}

/**
 * Expands a decision record scope: explicit IDs plus inclusive `A through B` / `A–B` ranges.
 * Only IDs belonging to the decision's own authority are collected.
 */
function extractDecisionScopeIds(text, authority) {
  const prefix = AUTHORITY_ID_PREFIX[authority];
  const idSource = `${prefix}-[A-Z0-9]+-\\d{3}`;
  const ids = new Set();
  const ranges = new RegExp(
    '`?(' + idSource + ')`?\\s*(?:through|to|–|—|-)\\s*`?(' + idSource + ')`?',
    'g',
  );
  for (const [, start, end] of text.matchAll(ranges)) {
    const startArea = start.slice(0, start.lastIndexOf('-'));
    const endArea = end.slice(0, end.lastIndexOf('-'));
    if (startArea !== endArea) continue;
    const first = Number(start.slice(-3));
    const last = Number(end.slice(-3));
    if (last < first) continue;
    for (let number = first; number <= last; number += 1) {
      ids.add(`${startArea}-${String(number).padStart(3, '0')}`);
    }
  }
  for (const [id] of text.matchAll(new RegExp(idSource, 'g'))) ids.add(id);
  return [...ids].sort();
}

/** Document-order projection of every ledger entry minus its mutable status and evidence. */
function ledgerMappingSha256(ledger) {
  const entries = Object.entries(ledger?.entries ?? {}).map(([legacyId, entry]) => {
    const projection = {};
    for (const key of Object.keys(entry ?? {})) {
      if (key === 'status' || key === 'evidence') continue;
      projection[key] = entry[key];
    }
    return [legacyId, projection];
  });
  return sha256(JSON.stringify(Object.fromEntries(entries)));
}

// ---------------------------------------------------------------------------
// Preserved historical Draft receipt
// ---------------------------------------------------------------------------

function validateHistoricalReceipt(receipt, errors) {
  const label = HISTORICAL_RECEIPT_PATH;
  const index = new Map();
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
      label,
      errors,
    )
  ) {
    return index;
  }

  if (receipt.$schema !== './migration-verification-receipt.schema.json') {
    errors.push(`${label}: wrong schema reference`);
  }
  if (receipt.schemaVersion !== 1) errors.push(`${label}: schemaVersion must be 1`);
  if (receipt.receiptType !== 'dated-verification-evidence') {
    errors.push(`${label}: receiptType must label dated verification evidence`);
  }
  if (receipt.verifiedAt !== HISTORICAL_RECEIPT_PIN.verifiedAt) {
    errors.push(`${label}: verifiedAt was rewritten; historical evidence must stay byte-preserved`);
  }
  checkNonEmptyString(receipt.purpose, `${label}: purpose`, errors);

  if (
    checkExactKeys(
      receipt.claims,
      ['normativeSource', 'provesRatification', 'authorizesLegacyDeletion'],
      [],
      `${label}: claims`,
      errors,
    )
  ) {
    if (receipt.claims.normativeSource !== false) {
      errors.push(`${label}: historical receipt cannot be a normative source`);
    }
    if (receipt.claims.provesRatification !== false) {
      errors.push(`${label}: historical Draft receipt cannot prove Ratification`);
    }
    if (receipt.claims.authorizesLegacyDeletion !== false) {
      errors.push(`${label}: historical Draft receipt cannot authorize legacy deletion`);
    }
  }

  if (
    checkExactKeys(
      receipt.verification,
      ['sourceKind', 'retrieval', 'digestMethod', 'ledgerWasNotInput', 'liveCommand'],
      [],
      `${label}: verification`,
      errors,
    )
  ) {
    if (receipt.verification.sourceKind !== 'pinned-authority-bytes') {
      errors.push(`${label}: verification must use pinned authority bytes`);
    }
    if (receipt.verification.ledgerWasNotInput !== true) {
      errors.push(`${label}: verification must be independent of the ledger`);
    }
    if (receipt.verification.liveCommand !== 'pnpm principles:verify-live') {
      errors.push(`${label}: live verification command is incorrect`);
    }
    checkNonEmptyString(receipt.verification.retrieval, `${label}: retrieval`, errors);
    checkNonEmptyString(receipt.verification.digestMethod, `${label}: digestMethod`, errors);
  }

  if (
    checkExactKeys(
      receipt.refresh,
      ['requiredWhen', 'procedure', 'offlineLimit'],
      [],
      `${label}: refresh`,
      errors,
    )
  ) {
    for (const field of ['requiredWhen', 'procedure', 'offlineLimit']) {
      checkNonEmptyString(receipt.refresh[field], `${label}: refresh.${field}`, errors);
    }
  }

  validateLegacyCatalogBaseline(receipt.legacyCatalogBaseline, label, errors);
  validateLegacySourceSnapshot(receipt.legacySourceSnapshot, label, errors);

  if (!Array.isArray(receipt.authorities)) {
    errors.push(`${label}: authorities must be an array`);
  } else {
    const seen = new Set();
    for (const record of receipt.authorities) {
      validateHistoricalAuthorityRecord(record, index, errors);
      if (seen.has(record?.authority)) {
        errors.push(`${label}: duplicate authority "${record.authority}"`);
      }
      seen.add(record?.authority);
    }
    if (!arraysEqual([...seen].sort(), [...AUTHORITIES].sort())) {
      errors.push(`${label}: must contain exactly Studio, Engineering, Product, and .github`);
    }
  }

  validateIntegrity(receipt, label, HISTORICAL_RECEIPT_PIN.integritySha256, errors);
  return index;
}

function validateLegacyCatalogBaseline(baseline, label, errors) {
  if (
    !checkExactKeys(
      baseline,
      ['repository', 'commit', 'realmFiles', 'topLevelPrinciples', 'ids'],
      [],
      `${label}: legacyCatalogBaseline`,
      errors,
    )
  ) {
    return;
  }
  if (baseline.repository !== LEGACY_SNAPSHOT.repository) {
    errors.push(`${label}: legacy baseline repository is incorrect`);
  }
  if (baseline.commit !== LEGACY_BASELINE_COMMIT) {
    errors.push(`${label}: legacy baseline commit is incorrect`);
  }
  if (baseline.realmFiles !== 21 || baseline.topLevelPrinciples !== 192) {
    errors.push(`${label}: legacy baseline counts must be 21 files and 192 principles`);
  }
  if (!arraysEqual(baseline.ids, EXPECTED_LEGACY_IDS)) {
    errors.push(`${label}: legacy baseline is not the exact frozen 192-ID inventory`);
  }
}

function validateLegacySourceSnapshot(snapshot, label, errors) {
  if (
    !checkExactKeys(
      snapshot,
      ['repository', 'commit', 'realmFiles', 'topLevelPrinciples', 'files'],
      [],
      `${label}: legacySourceSnapshot`,
      errors,
    )
  ) {
    return;
  }
  if (snapshot.repository !== LEGACY_SNAPSHOT.repository) {
    errors.push(`${label}: legacy source repository is incorrect`);
  }
  if (snapshot.commit !== LEGACY_SNAPSHOT.commit) {
    errors.push(`${label}: legacy source snapshot commit is incorrect`);
  }
  if (snapshot.realmFiles !== 21 || snapshot.topLevelPrinciples !== 192) {
    errors.push(`${label}: legacy snapshot counts must be 21 files and 192 principles`);
  }
  if (!Array.isArray(snapshot.files) || snapshot.files.length !== 21) {
    errors.push(`${label}: legacy snapshot must contain 21 file records`);
    return;
  }
  const expectedIdsByPath = new Map(
    LEGACY_REALMS.map(({ slug, count, path }) => [
      path,
      Array.from({ length: count }, (_, index) => `studio-legacy:${slug}:${index + 1}`),
    ]),
  );
  for (const record of snapshot.files) {
    checkExactKeys(
      record,
      ['path', 'blobSha', 'sha256', 'topLevelIds'],
      [],
      `${label}: legacy file`,
      errors,
    );
    if (!SHA1.test(record.blobSha ?? '')) {
      errors.push(`${label}: ${record.path} has an invalid Git blob SHA`);
    }
    if (!SHA256.test(record.sha256 ?? '')) {
      errors.push(`${label}: ${record.path} has an invalid SHA-256`);
    }
    if (!arraysEqual(record.topLevelIds, expectedIdsByPath.get(record.path))) {
      errors.push(`${label}: ${record.path} does not carry its frozen top-level ID inventory`);
    }
  }
  if (!arraysEqual(snapshot.files.map(({ path }) => path).sort(), FROZEN_LEGACY_PATHS)) {
    errors.push(`${label}: legacy snapshot must contain exactly the 21 frozen realm files`);
  }
}

function validateHistoricalAuthorityRecord(record, index, errors) {
  const authority = record?.authority;
  const label = `${HISTORICAL_RECEIPT_PATH}: ${authority ?? 'unknown authority'}`;
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
  const pin = DRAFT_AUTHORITY_PINS[authority];
  if (!pin) {
    errors.push(`${label}: unknown authority`);
    return;
  }
  if (record.repository !== pin.repository) errors.push(`${label}: repository does not match pin`);
  if (record.commit !== pin.commit) {
    errors.push(`${label}: historical ${authority} commit does not match pin`);
  }
  if (record.principleCount !== pin.principleCount || record.draftCount !== pin.principleCount) {
    errors.push(`${label}: all ${pin.principleCount} historical successors must remain Draft`);
  }
  const files = Array.isArray(record.files) ? record.files : [];
  const principles = Array.isArray(record.principles) ? record.principles : [];
  for (const principle of principles) {
    if (principle.status !== 'Draft') {
      errors.push(`${label}: ${principle.id} must stay Draft in the preserved historical receipt`);
    }
    if ('semanticSha256' in principle) {
      errors.push(`${label}: ${principle.id} was refreshed with post-Ratification fields`);
    }
    index.set(`${authority}:${principle.id}`, {
      ...principle,
      authority,
      repository: record.repository,
      commit: record.commit,
    });
  }
  if (principles.length !== pin.principleCount) {
    errors.push(`${label}: historical catalog count does not match its records`);
  }
  const digest = sha256(JSON.stringify({ files, principles }));
  if (record.catalogSha256 !== digest) {
    errors.push(`${label}: historical catalog digest does not match its records`);
  }
  if (record.catalogSha256 !== pin.catalogSha256) {
    errors.push(`${label}: historical catalog digest does not match the independent pin`);
  }
}

function validateIntegrity(receipt, label, pin, errors) {
  if (
    !checkExactKeys(receipt.integrity, ['algorithm', 'digest'], [], `${label}: integrity`, errors)
  ) {
    return;
  }
  if (receipt.integrity.algorithm !== 'sha256') {
    errors.push(`${label}: integrity algorithm must be sha256`);
  }
  const unsigned = structuredClone(receipt);
  delete unsigned.integrity;
  if (receipt.integrity.digest !== sha256(JSON.stringify(unsigned))) {
    errors.push(`${label}: integrity digest does not match receipt content`);
  }
  if (receipt.integrity.digest !== pin) {
    errors.push(`${label}: integrity digest does not match the independent pin`);
  }
}

// ---------------------------------------------------------------------------
// Final finalization receipt
// ---------------------------------------------------------------------------

function validateFinalReceipt(receipt, historicalReceipt, errors) {
  const label = FINAL_RECEIPT_PATH;
  const index = new Map();
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
        'historicalEvidence',
        'authorities',
        'migration',
        'deletion',
        'integrity',
      ],
      [],
      label,
      errors,
    )
  ) {
    return index;
  }

  if (receipt.$schema !== './migration-finalization-receipt.schema.json') {
    errors.push(`${label}: wrong schema reference`);
  }
  if (receipt.schemaVersion !== 1) errors.push(`${label}: schemaVersion must be 1`);
  if (receipt.receiptType !== 'dated-finalization-verification-evidence') {
    errors.push(`${label}: receiptType must label dated finalization evidence`);
  }
  if (Number.isNaN(Date.parse(receipt.verifiedAt))) {
    errors.push(`${label}: verifiedAt must be an ISO date-time`);
  }
  checkNonEmptyString(receipt.purpose, `${label}: purpose`, errors);

  validateFinalClaims(receipt.claims, errors);
  validateFinalVerification(receipt.verification, errors);
  validateFinalHistoricalEvidence(receipt.historicalEvidence, historicalReceipt, errors);

  if (!Array.isArray(receipt.authorities)) {
    errors.push(`${label}: authorities must be an array`);
  } else {
    const seen = new Set();
    const seenIds = new Set();
    const changes = [];
    for (const record of receipt.authorities) {
      validateFinalAuthorityRecord(record, index, seenIds, changes, errors);
      if (seen.has(record?.authority)) {
        errors.push(`${label}: duplicate authority "${record.authority}"`);
      }
      seen.add(record?.authority);
    }
    if (!arraysEqual([...seen].sort(), [...AUTHORITIES].sort())) {
      errors.push(`${label}: must contain exactly Studio, Engineering, Product, and .github`);
    }
    const expected = EXPECTED_SEMANTIC_CHANGES.map(
      ({ authority, id, historicalSemanticSha256, ratifiedSemanticSha256 }) =>
        `${authority}:${id}:${historicalSemanticSha256}:${ratifiedSemanticSha256}`,
    ).sort();
    if (!arraysEqual(changes.sort(), expected)) {
      errors.push(
        `${label}: recorded semantic changes do not match the independently pinned set (${expected.join(', ')})`,
      );
    }
  }

  validateFinalMigration(receipt.migration, errors);
  validateFinalDeletion(receipt.deletion, errors);
  validateIntegrity(receipt, label, FINAL_RECEIPT_INTEGRITY_PIN, errors);
  return index;
}

function validateFinalClaims(claims, errors) {
  const label = `${FINAL_RECEIPT_PATH}: claims`;
  if (
    !checkExactKeys(
      claims,
      ['normativeSource', 'provesRatification', 'authorizesLegacyDeletion', 'meaning'],
      [],
      label,
      errors,
    )
  ) {
    return;
  }
  if (claims.normativeSource !== false) {
    errors.push(`${label}: a receipt cannot be a normative source`);
  }
  if (claims.provesRatification !== true) {
    errors.push(`${label}: the finalization receipt must record provesRatification: true`);
  }
  if (claims.authorizesLegacyDeletion !== true) {
    errors.push(`${label}: the finalization receipt must record authorizesLegacyDeletion: true`);
  }
  if (!checkNonEmptyString(claims.meaning, `${label}: meaning`, errors)) return;
  const normalized = normalizeWhitespace(claims.meaning);
  for (const phrase of FINAL_MEANING_REQUIRED_PHRASES) {
    if (!normalized.includes(normalizeWhitespace(phrase))) {
      errors.push(`${label}: meaning must state "${phrase}"`);
    }
  }
  for (const { pattern, message } of FINAL_MEANING_FORBIDDEN_CLAIMS) {
    if (pattern.test(normalized)) errors.push(`${label}: forbidden meaning: ${message}`);
  }
}

function validateFinalVerification(verification, errors) {
  const label = `${FINAL_RECEIPT_PATH}: verification`;
  if (
    !checkExactKeys(
      verification,
      [
        'sourceKind',
        'retrieval',
        'digestMethod',
        'ledgerWasNotAuthorityInput',
        'liveCommand',
        'offlineLimit',
      ],
      [],
      label,
      errors,
    )
  ) {
    return;
  }
  if (verification.sourceKind !== 'pinned-authority-and-owner-merge-evidence') {
    errors.push(`${label}: verification must use pinned authority and owner merge evidence`);
  }
  if (verification.ledgerWasNotAuthorityInput !== true) {
    errors.push(`${label}: authority evidence must be independent of the ledger`);
  }
  if (verification.liveCommand !== 'pnpm principles:verify-live') {
    errors.push(`${label}: live verification command is incorrect`);
  }
  for (const field of ['retrieval', 'digestMethod', 'offlineLimit']) {
    checkNonEmptyString(verification[field], `${label}: ${field}`, errors);
  }
  if (
    typeof verification.retrieval === 'string' &&
    !normalizeWhitespace(verification.retrieval).includes(
      'no authority evidence was constructed from the migration ledger',
    )
  ) {
    errors.push(`${label}: retrieval must state that no authority evidence came from the ledger`);
  }
}

function validateFinalHistoricalEvidence(evidence, historicalReceipt, errors) {
  const label = `${FINAL_RECEIPT_PATH}: historicalEvidence`;
  if (
    !checkExactKeys(
      evidence,
      ['draftReceipt', 'legacyCatalogBaseline', 'legacySourceSnapshot', 'reconciliationLedger'],
      [],
      label,
      errors,
    )
  ) {
    return;
  }

  if (
    checkExactKeys(
      evidence.draftReceipt,
      ['path', 'verifiedAt', 'integritySha256'],
      [],
      `${label}: draftReceipt`,
      errors,
    )
  ) {
    if (evidence.draftReceipt.path !== HISTORICAL_RECEIPT_PATH) {
      errors.push(`${label}: draftReceipt.path must point at the preserved historical receipt`);
    }
    if (evidence.draftReceipt.verifiedAt !== HISTORICAL_RECEIPT_PIN.verifiedAt) {
      errors.push(`${label}: draftReceipt.verifiedAt does not match the historical receipt`);
    }
    if (evidence.draftReceipt.integritySha256 !== HISTORICAL_RECEIPT_PIN.integritySha256) {
      errors.push(`${label}: draftReceipt integrity does not match the independent pin`);
    }
  }

  validateLegacyCatalogBaseline(evidence.legacyCatalogBaseline, label, errors);
  validateLegacySourceSnapshot(evidence.legacySourceSnapshot, label, errors);
  if (!deepEqual(evidence.legacyCatalogBaseline, historicalReceipt?.legacyCatalogBaseline)) {
    errors.push(`${label}: legacy baseline disagrees with the preserved historical receipt`);
  }
  if (!deepEqual(evidence.legacySourceSnapshot, historicalReceipt?.legacySourceSnapshot)) {
    errors.push(`${label}: legacy source snapshot disagrees with the preserved historical receipt`);
  }

  if (
    checkExactKeys(
      evidence.reconciliationLedger,
      ['repository', 'commit', 'path', 'blobSha', 'sha256', 'mappingSha256'],
      [],
      `${label}: reconciliationLedger`,
      errors,
    )
  ) {
    for (const [field, expected] of Object.entries(RECONCILIATION_LEDGER)) {
      if (evidence.reconciliationLedger[field] !== expected) {
        errors.push(`${label}: reconciliationLedger.${field} does not match the PR #21 pin`);
      }
    }
  }
}

function validateFinalMigration(migration, errors) {
  const label = `${FINAL_RECEIPT_PATH}: migration`;
  if (
    !checkExactKeys(
      migration,
      [
        'ledgerPath',
        'entryCount',
        'requiredEntryStatus',
        'mappingSha256',
        'dispositionCounts',
        'destinationLinks',
        'successorLinks',
        'uniqueMappedSuccessors',
        'citationExceptions',
        'retirements',
      ],
      [],
      label,
      errors,
    )
  ) {
    return;
  }
  if (migration.ledgerPath !== LEDGER_PATH) errors.push(`${label}: ledgerPath is incorrect`);
  if (migration.entryCount !== LEDGER_TOTALS.entries) {
    errors.push(`${label}: entryCount must be ${LEDGER_TOTALS.entries}`);
  }
  if (migration.requiredEntryStatus !== LEDGER_TOTALS.status) {
    errors.push(`${label}: requiredEntryStatus must be "${LEDGER_TOTALS.status}"`);
  }
  if (migration.mappingSha256 !== CURRENT_LEDGER_MAPPING_PIN) {
    errors.push(`${label}: mapping digest does not match the current ledger mapping pin`);
  }
  if (!deepEqual(migration.dispositionCounts, LEDGER_TOTALS.dispositions)) {
    errors.push(`${label}: disposition counts do not match the independent pin`);
  }
  if (!deepEqual(migration.destinationLinks, LEDGER_TOTALS.destinations)) {
    errors.push(`${label}: destination link counts do not match the independent pin`);
  }
  if (migration.successorLinks !== LEDGER_TOTALS.links) {
    errors.push(`${label}: successorLinks must be ${LEDGER_TOTALS.links}`);
  }
  if (migration.uniqueMappedSuccessors !== LEDGER_TOTALS.uniqueMappedSuccessors) {
    errors.push(`${label}: uniqueMappedSuccessors must be ${LEDGER_TOTALS.uniqueMappedSuccessors}`);
  }
  if (migration.citationExceptions !== LEDGER_TOTALS.citationExceptions) {
    errors.push(`${label}: citationExceptions must be ${LEDGER_TOTALS.citationExceptions}`);
  }
  if (migration.retirements !== LEDGER_TOTALS.retirements) {
    errors.push(`${label}: retirements must be ${LEDGER_TOTALS.retirements}`);
  }
}

function validateFinalDeletion(deletion, errors) {
  const label = `${FINAL_RECEIPT_PATH}: deletion`;
  if (
    !checkExactKeys(deletion, ['frozenLegacyPaths', 'pathCount', 'effectiveAct'], [], label, errors)
  ) {
    return;
  }
  if (!arraysEqual(deletion.frozenLegacyPaths, FROZEN_LEGACY_PATHS)) {
    errors.push(`${label}: frozen deletion inventory does not match the independent 21-path pin`);
  }
  if (deletion.pathCount !== 21) errors.push(`${label}: pathCount must be 21`);
  if (deletion.effectiveAct !== 'repository-owner merge of the finalization pull request') {
    errors.push(`${label}: the effective act must remain the repository-owner merge`);
  }
}

function validateFinalAuthorityRecord(record, index, seenIds, changes, errors) {
  const authority = record?.authority;
  const label = `${FINAL_RECEIPT_PATH}: ${authority ?? 'unknown authority'}`;
  if (
    !checkExactKeys(
      record,
      [
        'authority',
        'repository',
        'ratifiedCatalogCommit',
        'currentMainCommitAtVerification',
        'principleCount',
        'ratifiedCount',
        'files',
        'principles',
        'catalogSha256',
        'semanticCatalogSha256',
        'historicalComparison',
        'decision',
      ],
      ['protection'],
      label,
      errors,
    )
  ) {
    return;
  }
  const pin = FINAL_AUTHORITY_PINS[authority];
  if (!pin) {
    errors.push(`${label}: unknown authority`);
    return;
  }
  if (record.repository !== pin.repository) errors.push(`${label}: repository does not match pin`);
  if (record.ratifiedCatalogCommit !== pin.commit) {
    errors.push(`${label}: ratified catalog commit does not match the independent pin`);
  }
  if (!SHA1.test(record.currentMainCommitAtVerification ?? '')) {
    errors.push(`${label}: currentMainCommitAtVerification must be a commit SHA`);
  }
  if (record.principleCount !== pin.principleCount) {
    errors.push(`${label}: principleCount must be ${pin.principleCount}`);
  }
  if (record.ratifiedCount !== pin.principleCount) {
    errors.push(`${label}: all ${pin.principleCount} successors must be Ratified`);
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
      [
        'id',
        'path',
        'title',
        'status',
        'legacyInputs',
        'blobSha',
        'fileSha256',
        'blockSha256',
        'semanticSha256',
      ],
      [],
      `${label}: principle record`,
      errors,
    );
    if (!AUTHORITY_ID[authority].test(principle.id ?? '')) {
      errors.push(`${label}: malformed successor ID ${principle.id}`);
    }
    if (seenIds.has(principle.id)) errors.push(`${label}: duplicate successor ID ${principle.id}`);
    seenIds.add(principle.id);
    checkNonEmptyString(principle.title, `${label}: ${principle.id} title`, errors);
    if (principle.status !== 'Ratified') {
      errors.push(`${label}: ${principle.id} must be Ratified in the final catalog`);
    }
    if (!SHA1.test(principle.blobSha ?? '')) {
      errors.push(`${label}: ${principle.id} invalid Git blob SHA`);
    }
    for (const field of ['fileSha256', 'blockSha256', 'semanticSha256']) {
      if (!SHA256.test(principle[field] ?? '')) {
        errors.push(`${label}: ${principle.id} invalid ${field}`);
      }
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
    index.set(`${authority}:${principle.id}`, {
      ...principle,
      authority,
      repository: record.repository,
      commit: record.ratifiedCatalogCommit,
    });
  }

  for (const file of files) {
    const actual = principles.filter(({ path }) => path === file.path).length;
    if (file.principleCount !== actual) {
      errors.push(`${label}: ${file.path} principleCount does not match its records`);
    }
  }
  if (principles.length !== pin.principleCount) {
    errors.push(`${label}: successor catalog count does not match its records`);
  }
  if (record.ratifiedCount !== principles.filter(({ status }) => status === 'Ratified').length) {
    errors.push(`${label}: ratifiedCount does not match successor statuses`);
  }
  if (record.catalogSha256 !== sha256(JSON.stringify({ files, principles }))) {
    errors.push(`${label}: catalog digest does not match receipt records`);
  }
  if (record.catalogSha256 !== pin.catalogSha256) {
    errors.push(`${label}: catalog digest does not match the independent pin`);
  }
  if (record.semanticCatalogSha256 !== semanticCatalogSha256(principles)) {
    errors.push(`${label}: semantic catalog digest does not match receipt records`);
  }
  if (record.semanticCatalogSha256 !== pin.semanticCatalogSha256) {
    errors.push(`${label}: semantic catalog digest does not match the independent pin`);
  }

  validateHistoricalComparison(record, pin, changes, label, errors);
  validateFinalDecision(record, pin, principles, label, errors);
  validateAuthorityProtection(record, label, errors);
}

/**
 * Branch-protection and required-check evidence for the authority whose merged decision record
 * conditions Ratification on a required check. It is recorded for exactly that authority so the
 * receipt cannot silently generalize a protection claim to repositories it did not verify.
 */
function validateAuthorityProtection(record, label, errors) {
  const protectionLabel = `${label}: protection`;
  if (record.authority !== PROTECTION_AUTHORITY) {
    if ('protection' in record) {
      errors.push(
        `${protectionLabel}: protection evidence is recorded only for ${PROTECTION_AUTHORITY}`,
      );
    }
    return;
  }
  if (!('protection' in record)) {
    errors.push(
      `${protectionLabel}: ${PROTECTION_AUTHORITY} Ratification requires branch-protection and required-check evidence`,
    );
    return;
  }
  const protection = record.protection;
  if (
    !checkExactKeys(
      protection,
      [
        'branch',
        'strictRequiredStatusChecks',
        'requiredChecks',
        'allowForcePushes',
        'allowDeletions',
        'ratificationHeadChecks',
      ],
      [],
      protectionLabel,
      errors,
    )
  ) {
    return;
  }

  if (protection.branch !== PROTECTION_PIN.branch) {
    errors.push(`${protectionLabel}: protection must cover the "${PROTECTION_PIN.branch}" branch`);
  }
  if (protection.strictRequiredStatusChecks !== true) {
    errors.push(`${protectionLabel}: required status checks must be strict`);
  }
  if (protection.allowForcePushes !== false) {
    errors.push(`${protectionLabel}: force pushes must be disabled on the protected branch`);
  }
  if (protection.allowDeletions !== false) {
    errors.push(`${protectionLabel}: branch deletion must be disabled on the protected branch`);
  }
  if (!deepEqual(protection.requiredChecks, PROTECTION_PIN.requiredChecks)) {
    errors.push(`${protectionLabel}: required checks do not match the independent pin`);
  }
  if (!deepEqual(protection.ratificationHeadChecks, PROTECTION_PIN.ratificationHeadChecks)) {
    errors.push(`${protectionLabel}: Ratification head checks do not match the independent pin`);
    return;
  }

  const byName = new Map(protection.ratificationHeadChecks.map((check) => [check.name, check]));
  for (const { context } of protection.requiredChecks) {
    const check = byName.get(context);
    if (!check) {
      errors.push(`${protectionLabel}: required check "${context}" has no result on the head`);
      continue;
    }
    if (check.required !== true) {
      errors.push(`${protectionLabel}: "${context}" is protected but not marked required`);
    }
    if (check.status !== 'completed' || check.conclusion !== 'success') {
      errors.push(
        `${protectionLabel}: required check "${context}" did not succeed on the Ratification head`,
      );
    }
  }
  for (const check of protection.ratificationHeadChecks) {
    if (check.conclusion !== 'success') {
      errors.push(`${protectionLabel}: "${check.name}" did not succeed on the Ratification head`);
    }
  }
}

function validateHistoricalComparison(record, pin, changes, label, errors) {
  const comparison = record.historicalComparison;
  if (
    !checkExactKeys(
      comparison,
      ['draftCommit', 'draftSemanticCatalogSha256', 'changedPrinciples'],
      [],
      `${label}: historicalComparison`,
      errors,
    )
  ) {
    return;
  }
  const draftPin = DRAFT_AUTHORITY_PINS[record.authority];
  if (comparison.draftCommit !== draftPin.commit) {
    errors.push(`${label}: historicalComparison.draftCommit does not match the Draft pin`);
  }
  if (comparison.draftSemanticCatalogSha256 !== draftPin.semanticCatalogSha256) {
    errors.push(
      `${label}: historical semantic catalog digest does not match the independent Draft pin`,
    );
  }
  if (!Array.isArray(comparison.changedPrinciples)) {
    errors.push(`${label}: changedPrinciples must be an array`);
    return;
  }
  const unchanged = comparison.changedPrinciples.length === 0;
  const identical = comparison.draftSemanticCatalogSha256 === record.semanticCatalogSha256;
  if (unchanged !== identical) {
    errors.push(`${label}: changedPrinciples and the historical semantic catalog digest disagree`);
  }
  const byId = new Map((record.principles ?? []).map((principle) => [principle.id, principle]));
  for (const change of comparison.changedPrinciples) {
    const expectedChange = EXPECTED_SEMANTIC_CHANGES.find(
      (expected) => expected.authority === record.authority && expected.id === change?.id,
    );
    if (
      !checkExactKeys(
        change,
        ['id', 'historicalSemanticSha256', 'ratifiedSemanticSha256', 'rationale', 'review'],
        [],
        `${label}: changedPrinciple`,
        errors,
      )
    ) {
      continue;
    }
    checkNonEmptyString(change.rationale, `${label}: ${change.id} rationale`, errors);
    const principle = byId.get(change.id);
    if (!principle) {
      errors.push(`${label}: changed principle ${change.id} is not in the catalog`);
      continue;
    }
    if (change.ratifiedSemanticSha256 !== principle.semanticSha256) {
      errors.push(`${label}: ${change.id} ratified semantic digest disagrees with its record`);
    }
    if (change.historicalSemanticSha256 === change.ratifiedSemanticSha256) {
      errors.push(`${label}: ${change.id} is recorded as changed but both digests are equal`);
    }
    if (!expectedChange) {
      errors.push(`${label}: ${change.id} is not an independently pinned semantic change`);
    } else {
      validateSemanticChangeReview(
        change.review,
        expectedChange.review,
        `${label}: ${change.id} semantic review`,
        errors,
      );
    }
    changes.push(
      `${record.authority}:${change.id}:${change.historicalSemanticSha256}:${change.ratifiedSemanticSha256}`,
    );
  }
}

function validateSemanticChangeReview(review, expected, label, errors) {
  if (
    !checkExactKeys(
      review,
      [
        'repository',
        'pullRequest',
        'state',
        'merged',
        'mergedAt',
        'baseRef',
        'beforeCommit',
        'headCommit',
        'afterCommit',
        'authorAssociation',
        'author',
        'mergedBy',
      ],
      [],
      label,
      errors,
    )
  ) {
    return;
  }
  if (!deepEqual(review, expected)) {
    errors.push(`${label}: provenance does not match the independent PR #97 pin`);
  }
  if (
    !SHA1.test(review.beforeCommit ?? '') ||
    !SHA1.test(review.headCommit ?? '') ||
    !SHA1.test(review.afterCommit ?? '') ||
    new Set([review.beforeCommit, review.headCommit, review.afterCommit]).size !== 3
  ) {
    errors.push(`${label}: before, head, and after commits must be distinct immutable SHAs`);
  }
  if (review.state !== 'closed' || review.merged !== true) {
    errors.push(`${label}: the semantic refinement review must be merged`);
  }
  if (review.baseRef !== 'main') errors.push(`${label}: baseRef must be main`);
  if (Number.isNaN(Date.parse(review.mergedAt))) {
    errors.push(`${label}: mergedAt must be an ISO date-time`);
  }
  if (review.authorAssociation !== 'OWNER') {
    errors.push(`${label}: authorAssociation must be OWNER`);
  }
  for (const field of ['author', 'mergedBy']) {
    if (checkExactKeys(review[field], ['login', 'id'], [], `${label}: ${field}`, errors)) {
      if (review[field].login !== OWNER.login || review[field].id !== OWNER.id) {
        errors.push(`${label}: PR #97 must be owner-authored and owner-merged`);
      }
    }
  }
}

function validateFinalDecision(record, pin, principles, label, errors) {
  const decision = record.decision;
  if (
    !checkExactKeys(
      decision,
      [
        'path',
        'blobSha',
        'sha256',
        'scopeIds',
        'scopeSha256',
        'pullRequest',
        'state',
        'merged',
        'mergedAt',
        'mergeCommit',
        'headCommit',
        'baseRef',
        'authorAssociation',
        'mergedBy',
      ],
      [],
      `${label}: decision`,
      errors,
    )
  ) {
    return;
  }
  const decisionLabel = `${label}: decision`;
  if (decision.path !== pin.decisionPath) {
    errors.push(`${decisionLabel}: path does not match the pinned decision record`);
  }
  if (decision.blobSha !== pin.decisionBlobSha) {
    errors.push(`${decisionLabel}: blob does not match the pinned decision record`);
  }
  if (decision.sha256 !== pin.decisionSha256) {
    errors.push(`${decisionLabel}: digest does not match the pinned decision record`);
  }
  if (decision.pullRequest !== pin.pullRequest) {
    errors.push(`${decisionLabel}: pull request number does not match the independent pin`);
  }
  if (decision.state !== 'closed') errors.push(`${decisionLabel}: state must be closed`);
  if (decision.merged !== true) {
    errors.push(`${decisionLabel}: an unmerged decision cannot ratify a catalog`);
  }
  if (decision.mergeCommit !== pin.commit) {
    errors.push(`${decisionLabel}: merge commit does not match the ratified catalog commit`);
  }
  if (!SHA1.test(decision.headCommit ?? '') || decision.headCommit === decision.mergeCommit) {
    errors.push(`${decisionLabel}: headCommit must be the distinct reviewed head SHA`);
  }
  if (decision.baseRef !== 'main') errors.push(`${decisionLabel}: baseRef must be main`);
  if (decision.authorAssociation !== 'OWNER') {
    errors.push(`${decisionLabel}: authorAssociation must be OWNER`);
  }
  if (Number.isNaN(Date.parse(decision.mergedAt))) {
    errors.push(`${decisionLabel}: mergedAt must be an ISO date-time`);
  }
  if (
    checkExactKeys(decision.mergedBy, ['login', 'id'], [], `${decisionLabel}: mergedBy`, errors)
  ) {
    if (decision.mergedBy.login !== OWNER.login || decision.mergedBy.id !== OWNER.id) {
      errors.push(`${decisionLabel}: only the repository owner merge is an effective Ratification`);
    }
  }
  if (!checkStringArray(decision.scopeIds, `${decisionLabel}: scopeIds`, errors)) return;
  const malformed = decision.scopeIds.find((id) => !AUTHORITY_ID[record.authority].test(id));
  if (malformed) errors.push(`${decisionLabel}: scope contains a malformed ID "${malformed}"`);
  const catalogIds = principles.map(({ id }) => id).sort();
  if (!arraysEqual([...decision.scopeIds].sort(), catalogIds)) {
    errors.push(
      `${decisionLabel}: scope must list exactly the ${catalogIds.length} Ratified successor IDs`,
    );
  }
  if (decision.scopeSha256 !== sha256(JSON.stringify(decision.scopeIds))) {
    errors.push(`${decisionLabel}: scope digest does not match the recorded scope`);
  }
}

// ---------------------------------------------------------------------------
// Final migration ledger
// ---------------------------------------------------------------------------

function validateLedger(ledger, errors) {
  if (
    !checkExactKeys(
      ledger,
      ['$schema', 'schemaVersion', 'baseline', 'entries'],
      [],
      LEDGER_PATH,
      errors,
    )
  ) {
    return;
  }
  if (ledger.$schema !== './migration-ledger.schema.json') {
    errors.push(`${LEDGER_PATH}: wrong schema reference`);
  }
  if (ledger.schemaVersion !== 1) errors.push(`${LEDGER_PATH}: schemaVersion must be 1`);

  if (
    checkExactKeys(
      ledger.baseline,
      ['repository', 'commit', 'realmFiles', 'topLevelPrinciples', 'idFormat'],
      [],
      'ledger baseline',
      errors,
    )
  ) {
    if (ledger.baseline.repository !== 'https://github.com/jrmoulckers/studio') {
      errors.push('ledger baseline repository is incorrect');
    }
    if (ledger.baseline.commit !== LEGACY_BASELINE_COMMIT) {
      errors.push('ledger baseline commit is incorrect');
    }
    if (ledger.baseline.realmFiles !== 21 || ledger.baseline.topLevelPrinciples !== 192) {
      errors.push('ledger baseline counts must be 21 files and 192 principles');
    }
    if (ledger.baseline.idFormat !== 'studio-legacy:<realm-file-slug>:<top-level-number>') {
      errors.push('ledger baseline ID format is incorrect');
    }
  }

  if (!isObject(ledger.entries)) {
    errors.push(`${LEDGER_PATH}: entries must be an object`);
    return;
  }

  const entryIds = Object.keys(ledger.entries);
  if (entryIds.length !== LEDGER_TOTALS.entries) {
    errors.push(`ledger must contain exactly 192 entries (found ${entryIds.length})`);
  }
  for (const legacyId of entryIds) {
    if (!EXPECTED_LEGACY_ID_SET.has(legacyId)) {
      errors.push(`ledger contains unknown legacy ID ${legacyId}`);
    }
  }
  for (const legacyId of EXPECTED_LEGACY_IDS) {
    if (!(legacyId in ledger.entries)) errors.push(`ledger is missing legacy ID ${legacyId}`);
  }

  for (const [legacyId, entry] of Object.entries(ledger.entries)) {
    validateLedgerEntry(legacyId, entry, errors);
  }

  const mapping = ledgerMappingSha256(ledger);
  if (mapping !== CURRENT_LEDGER_MAPPING_PIN) {
    errors.push(
      `${LEDGER_PATH}: normalized mapping digest ${mapping} does not match the current ledger mapping pin`,
    );
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
  if (entry.status !== LEDGER_TOTALS.status) {
    errors.push(`${label}: every finalized ledger entry must be "${LEDGER_TOTALS.status}"`);
  }
  checkNonEmptyString(entry.rationale, `${label}: rationale`, errors);
  checkStringArray(entry.evidence, `${label}: evidence`, errors);
  if (entry.owner !== 'repository owner') errors.push(`${label}: owner must be repository owner`);
  if (!Array.isArray(entry.successors)) {
    errors.push(`${label}: successors must be an array`);
    return;
  }

  const successorKeys = new Set();
  for (const successor of entry.successors) {
    if (!checkExactKeys(successor, ['authority', 'id'], [], `${label}: successor`, errors))
      continue;
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
    const realm = legacyId.split(':')[1];
    const snapshotUrl = `https://github.com/${LEGACY_SNAPSHOT.repository}/blob/${LEGACY_SNAPSHOT.commit}/principles/${realm}.md`;
    if (!(entry.evidence ?? []).includes(snapshotUrl)) {
      errors.push(`${label}: retirement must preserve its frozen legacy source evidence`);
    }
  } else if ('retirementCategory' in entry) {
    errors.push(`${label}: only retire may set retirementCategory`);
  }

  if (!(entry.evidence ?? []).includes(HISTORICAL_RECEIPT_PATH) && entry.disposition !== 'retire') {
    errors.push(`${label}: evidence must preserve the historical Draft receipt`);
  }
  if (!(entry.evidence ?? []).includes(FINAL_RECEIPT_PATH)) {
    errors.push(`${label}: evidence must include the final finalization receipt`);
  }

  if ('citationException' in entry) validateCitationException(legacyId, entry, errors);
}

function validateCitationException(legacyId, entry, errors) {
  const label = `ledger ${legacyId}: citationException`;
  const exception = entry.citationException;
  if (!checkExactKeys(exception, ['kind', 'reason', 'evidence'], [], label, errors)) return;
  if (entry.disposition === 'reference' && entry.successors.length !== 1) {
    errors.push(`${label}: reference citationException requires exactly one successor`);
  }
  if (!['reference', 'split'].includes(entry.disposition)) {
    errors.push(`${label}: allowed only for reference or split dispositions`);
  }
  const hasStudioOnlySuccessors =
    entry.successors.length > 0 && entry.successors.every((s) => s.authority === 'Studio');
  if (hasStudioOnlySuccessors) {
    errors.push(`${label}: allowed only for externally verified ownership`);
  }
  if (exception.kind !== 'externally-verified-ownership') {
    errors.push(`${label}: kind must be externally-verified-ownership`);
  }
  checkNonEmptyString(exception.reason, `${label}: reason`, errors);
  checkStringArray(exception.evidence, `${label}: evidence`, errors);
}

/**
 * Reciprocity between the ledger and both receipts. Authority facts come only from the receipts;
 * the ledger is never allowed to introduce a successor the authorities do not carry.
 */
function validateReciprocity(ledger, finalIndex, historicalIndex, errors) {
  const mappedSuccessors = new Set();
  for (const [legacyId, entry] of Object.entries(ledger?.entries ?? {})) {
    for (const successor of entry.successors ?? []) {
      const key = `${successor.authority}:${successor.id}`;
      const principle = finalIndex.get(key);
      if (!principle) {
        errors.push(`${legacyId}: unknown successor ${key}`);
        continue;
      }
      mappedSuccessors.add(key);
      if (principle.status !== 'Ratified') {
        errors.push(`${legacyId}: ${key} is not Ratified in the final receipt`);
      }
      const citesLegacy = (principle.legacyInputs ?? []).includes(legacyId);
      if (!citesLegacy && !entry.citationException) {
        errors.push(`${legacyId}: ${key} does not cite the legacy ID`);
      }
      if (citesLegacy && entry.citationException && entry.successors.length === 1) {
        errors.push(`${legacyId}: citationException is unnecessary because ${key} cites it`);
      }

      const finalUrl = `https://github.com/${principle.repository}/blob/${principle.commit}/${principle.path}`;
      const evidence = entry.evidence ?? [];
      if (!evidence.includes(FINAL_RECEIPT_PATH) || !evidence.includes(finalUrl)) {
        errors.push(
          `${legacyId}: evidence must include the final receipt and the Ratified source for ${key}`,
        );
      }
      const historical = historicalIndex.get(key);
      if (historical) {
        const historicalUrl = `https://github.com/${historical.repository}/blob/${historical.commit}/${historical.path}`;
        if (!evidence.includes(HISTORICAL_RECEIPT_PATH) || !evidence.includes(historicalUrl)) {
          errors.push(
            `${legacyId}: historical evidence for ${key} must be preserved, not replaced`,
          );
        }
        if (
          !citesLegacy &&
          entry.citationException &&
          !entry.citationException.evidence.includes(historicalUrl)
        ) {
          errors.push(`${legacyId}: citationException must keep its reviewed source for ${key}`);
        }
      } else {
        errors.push(`${legacyId}: ${key} has no preserved historical evidence record`);
      }
    }
  }

  for (const principle of finalIndex.values()) {
    for (const legacyId of principle.legacyInputs ?? []) {
      if (!(legacyId in (ledger?.entries ?? {}))) {
        errors.push(
          `${principle.authority}:${principle.id} cites legacy ID ${legacyId} without a disposition`,
        );
      }
    }
  }
  return mappedSuccessors;
}

// ---------------------------------------------------------------------------
// Local Studio tree
// ---------------------------------------------------------------------------

function validateStudioTree(sources, finalReceipt, errors) {
  const seenIds = new Map();
  const statusById = new Map();
  const sourceFiles = [];

  const expectedDirectories = new Map([
    ['principles/design', []],
    ['principles/experience', []],
  ]);
  for (const { path } of STUDIO_FILES) {
    expectedDirectories.get(path.slice(0, path.lastIndexOf('/'))).push(path);
  }
  for (const [directory, expected] of expectedDirectories) {
    const actual = sources
      .listFiles()
      .filter((path) => path.startsWith(`${directory}/`) && path.endsWith('.md'))
      .sort();
    if (!arraysEqual(actual, [...expected].sort())) {
      errors.push(`${directory}: must contain exactly the pinned Studio principle files`);
    }
  }

  for (const { path, area, ids: expectedIds } of STUDIO_FILES) {
    const buffer = sources.read(path);
    if (buffer === null) {
      errors.push(`${path}: file is missing`);
      continue;
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
        current = { id: idMatch[1], area: idMatch[2], fields: new Map() };
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
      for (const id of expectedIds.filter((value) => !fileIds.includes(value))) {
        errors.push(`${path}: missing stable principle ID ${id}`);
      }
      for (const id of fileIds.filter((value) => !expectedIds.includes(value))) {
        errors.push(`${path}: unexpected principle ID ${id}; stable IDs must not be renumbered`);
      }
      if (fileIds.length === expectedIds.length) {
        errors.push(`${path}: stable principle IDs are out of order`);
      }
    }

    sourceFiles.push({ path, buffer });
  }

  const localCatalog = buildCatalogFromSources('Studio', sourceFiles);
  const statuses = new Set(statusById.values());
  const localStatus = statuses.size === 1 ? [...statuses][0] : 'mixed';

  if (statusById.size === 25 && localStatus === 'mixed') {
    errors.push(
      'Studio successor statuses are mixed; all 25 successors must share exactly one Status',
    );
  }
  if (statusById.size === 25 && localStatus !== 'mixed' && localStatus !== 'Ratified') {
    errors.push('the finalized Studio tree must carry Status: Ratified for all 25 successors');
  }

  validateStudioSemanticContinuity(localCatalog.principles, errors);
  validateStudioPreambles(sourceFiles, localStatus, errors);
  validateRatificationRecord(sources, finalReceipt, errors);
  const preambleUpdatedFiles = validateLocalStudioAgainstReceipt(
    localCatalog,
    finalReceipt,
    errors,
  );
  return { ...localCatalog, localStatus, preambleUpdatedFiles };
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

function validateStudioSemanticContinuity(principles, errors) {
  for (const principle of principles) {
    const pin = STUDIO_SEMANTIC_CONTENT_PIN[principle.id];
    if (!pin) {
      errors.push(`${principle.id}: no independent status-excluded content pin is recorded`);
    } else if (principle.semanticSha256 !== pin) {
      errors.push(
        `${principle.id}: content changed beyond the Status field (status-excluded content digest mismatch)`,
      );
    }
  }
}

function validateStudioPreambles(sourceFiles, localStatus, errors) {
  for (const { path, buffer } of sourceFiles) {
    const text = buffer.toString('utf8');
    const firstHeading = text.search(/^### STUDIO-/m);
    const preamble = firstHeading === -1 ? text : text.slice(0, firstHeading);
    if (localStatus !== 'mixed' && !preamble.includes(STUDIO_RATIFICATION_BANNER)) {
      errors.push(`${path}: preamble does not carry the Ratification banner`);
      continue;
    }
    for (const { pattern, message } of STUDIO_PREAMBLE_FORBIDDEN_CLAIMS) {
      if (pattern.test(preamble)) {
        errors.push(`${path}: preamble makes a superseded migration claim: ${message}`);
      }
    }
    const normalized = preamble.replace(
      STUDIO_RATIFICATION_BANNER,
      '> **Ratification:** <normalized>',
    );
    if (sha256(normalized) !== STUDIO_PREAMBLE_CONTENT_PIN[path]) {
      errors.push(`${path}: preamble content changed beyond the Ratification banner`);
    }
  }
}

function validateRatificationRecord(sources, finalReceipt, errors) {
  const buffer = sources.read(RATIFICATION_RECORD_PATH);
  if (buffer === null) {
    errors.push(
      `Status: Ratified requires an owner-effective Ratification record at ${RATIFICATION_RECORD_PATH}`,
    );
    return;
  }
  const text = buffer.toString('utf8');
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

  const pin = FINAL_AUTHORITY_PINS.Studio;
  if (gitBlobSha(buffer) !== pin.decisionBlobSha || sha256(buffer) !== pin.decisionSha256) {
    errors.push(
      `${RATIFICATION_RECORD_PATH}: bytes differ from the owner-merged decision record pinned at ${pin.commit}`,
    );
  }

  const scopeIds = extractDecisionScopeIds(text, 'Studio');
  const expected = STUDIO_FILES.flatMap(({ ids }) => ids).sort();
  if (!arraysEqual(scopeIds, expected)) {
    errors.push(
      `${RATIFICATION_RECORD_PATH}: scope must list exactly the ${expected.length} Studio successor IDs, no more, no fewer`,
    );
  }
  const decision = finalReceipt?.authorities?.find(
    ({ authority }) => authority === 'Studio',
  )?.decision;
  if (decision && !arraysEqual(scopeIds, [...(decision.scopeIds ?? [])].sort())) {
    errors.push(
      `${RATIFICATION_RECORD_PATH}: scope disagrees with the authenticated receipt scope`,
    );
  }
}

function validateLocalStudioAgainstReceipt(localCatalog, finalReceipt, errors) {
  const studio = finalReceipt?.authorities?.find(({ authority }) => authority === 'Studio');
  if (!studio || !Array.isArray(studio.principles)) return 0;

  const receiptById = new Map(studio.principles.map((principle) => [principle.id, principle]));
  const localById = new Map(localCatalog.principles.map((principle) => [principle.id, principle]));
  if (!arraysEqual([...localById.keys()].sort(), [...receiptById.keys()].sort())) {
    errors.push('local Studio successor IDs do not match the Ratified receipt catalog');
    return 0;
  }

  for (const [id, receiptPrinciple] of receiptById) {
    const local = localById.get(id);
    if (local.path !== receiptPrinciple.path) {
      errors.push(`${id}: path "${local.path}" does not match the Ratified receipt`);
    }
    if (local.title !== receiptPrinciple.title) {
      errors.push(`${id}: title does not match the Ratified receipt`);
    }
    if (local.status !== receiptPrinciple.status) {
      errors.push(`${id}: local Status "${local.status}" does not match the Ratified receipt`);
    }
    if (!arraysEqual(local.legacyInputs, receiptPrinciple.legacyInputs)) {
      errors.push(`${id}: Legacy inputs do not match the Ratified receipt`);
    }
    if (local.blockSha256 !== receiptPrinciple.blockSha256) {
      errors.push(`${id}: principle block does not match the Ratified receipt bytes`);
    }
    if (local.semanticSha256 !== receiptPrinciple.semanticSha256) {
      errors.push(`${id}: status-normalized semantics do not match the Ratified receipt`);
    }
  }

  if (contentCatalogSha256(localCatalog.principles) !== contentCatalogSha256(studio.principles)) {
    errors.push('local Studio catalog records do not match the Ratified receipt catalog');
  }
  if (localCatalog.semanticCatalogSha256 !== studio.semanticCatalogSha256) {
    errors.push('local Studio semantic catalog digest does not match the Ratified receipt');
  }
  for (const file of studio.files) {
    const localFile = localCatalog.files.find(({ path }) => path === file.path);
    if (localFile?.principleCount !== file.principleCount) {
      errors.push(`${file.path}: local principle count does not match the Ratified receipt`);
    }
  }
  // A local file may differ from the pinned commit only outside its principle blocks: every block
  // digest above is pinned by the receipt and every preamble is pinned independently, so the two
  // pins together cover every byte of all seven files.
  return studio.files.filter(
    (file) => localCatalog.files.find(({ path }) => path === file.path)?.sha256 !== file.sha256,
  ).length;
}

// ---------------------------------------------------------------------------
// Deletion state and link safety
// ---------------------------------------------------------------------------

function validateDeletionState(sources, historicalReceipt, finalReceipt, errors) {
  for (const path of FROZEN_LEGACY_PATHS) {
    if (sources.exists(path)) {
      errors.push(`${path}: a frozen legacy realm file must be absent after finalization`);
    }
  }
  for (const path of PROTECTED_PATHS) {
    if (!sources.exists(path)) {
      errors.push(`${path}: a protected successor or evidence file must remain present`);
    }
  }

  const inventories = [
    [`${FINAL_RECEIPT_PATH}: deletion inventory`, finalReceipt?.deletion?.frozenLegacyPaths],
    [
      `${FINAL_RECEIPT_PATH}: legacy source snapshot`,
      finalReceipt?.historicalEvidence?.legacySourceSnapshot?.files?.map(({ path }) => path).sort(),
    ],
    [
      `${HISTORICAL_RECEIPT_PATH}: legacy source snapshot`,
      historicalReceipt?.legacySourceSnapshot?.files?.map(({ path }) => path).sort(),
    ],
  ];
  for (const [label, inventory] of inventories) {
    if (!arraysEqual(inventory, FROZEN_LEGACY_PATHS)) {
      errors.push(`${label} does not match the frozen 21-path deletion set`);
    }
  }
  return FROZEN_LEGACY_PATHS.filter((path) => !sources.exists(path)).length;
}

function validatePrincipleAuthoringSurface(sources, errors) {
  const actualInventory = sources
    .listFiles()
    .filter((path) => path.startsWith('principles/'))
    .sort();
  if (!arraysEqual(actualInventory, PRINCIPLES_FILE_INVENTORY)) {
    errors.push(
      'principles/ must contain exactly the pinned Studio authority and migration-evidence files; undeclared realm surfaces are forbidden',
    );
  }

  const actualRootMarkdown = sources
    .listFiles()
    .filter((path) => /^principles\/[^/]+\.md$/.test(path))
    .sort();
  if (!arraysEqual(actualRootMarkdown, PRINCIPLES_ROOT_MARKDOWN)) {
    errors.push(
      'principles root must contain exactly the final governance records and proposal template; top-level realm files are forbidden',
    );
  }

  const template = sources.read(PRINCIPLE_TEMPLATE_PATH);
  if (template === null) return;
  const text = template.toString('utf8');
  const normalized = normalizeWhitespace(text.replace(/^>\s?/gm, ''));
  for (const phrase of PRINCIPLE_TEMPLATE_REQUIRED_PHRASES) {
    if (!normalized.includes(normalizeWhitespace(phrase))) {
      errors.push(`${PRINCIPLE_TEMPLATE_PATH}: missing required authoring rule "${phrase}"`);
    }
  }
}

const MARKDOWN_LINK = /!?\[[^\]]*\]\(\s*<?([^>)\s]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;
const MARKDOWN_REFERENCE = /^[ \t]*\[[^\]]+\]:[ \t]+<?([^>\s]+)>?/gm;
const HTML_TARGET = /\b(?:href|src)\s*=\s*["']([^"']+)["']/g;
const LIVE_BLOB_URL = new RegExp(
  'https?://github\\.com/jrmoulckers/studio/(?:blob|tree|raw)/(?:main|master|HEAD)/(principles/[A-Za-z0-9._/-]+\\.md)',
  'g',
);
const LEGACY_SLUG_PATTERN = new RegExp(
  `(?<![A-Za-z0-9._/-])((?:\\.{1,2}/)*(?:[A-Za-z0-9._-]+/)*(?:${LEGACY_REALMS.map(({ slug }) => slug).join('|')})\\.md)(?![A-Za-z0-9-])`,
  'g',
);
const PINNED_COMMIT_URL = /https?:\/\/github\.com\/[^\s)]+\/blob\/[0-9a-f]{40}\//;

function resolveRepoPath(fromFile, target) {
  const cleaned = target.split('#')[0].split('?')[0].trim();
  if (cleaned.length === 0) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(cleaned)) return null;
  const base = cleaned.startsWith('/')
    ? cleaned.slice(1)
    : posix.join(posix.dirname(fromFile), cleaned);
  const normalized = posix.normalize(base);
  return normalized.startsWith('..') ? null : normalized;
}

/** Repo-wide guard: no live link, path, or instruction may resolve to a deleted realm file. */
function validateLinkSafety(sources, errors) {
  let scanned = 0;
  for (const path of sources.listFiles()) {
    // The negative fixtures deliberately carry adversarial payloads; they are test data, never
    // an instruction surface, and each payload is proven to fail by the fixture that owns it.
    if (path === FIXTURES_PATH) continue;
    const name = path.slice(path.lastIndexOf('/') + 1);
    const dot = name.lastIndexOf('.');
    const extension = dot > 0 ? name.slice(dot) : '';
    if (!SCANNED_EXTENSIONS.has(extension)) continue;
    const buffer = sources.read(path);
    if (buffer === null) continue;
    const text = buffer.toString('utf8');
    scanned += 1;

    for (const [, target] of text.matchAll(LIVE_BLOB_URL)) {
      if (FROZEN_LEGACY_PATH_SET.has(target)) {
        errors.push(`${path}: a live branch URL still resolves to the deleted ${target}`);
      }
    }
    if (extension !== '.md' && extension !== '.mdx') continue;

    for (const pattern of [MARKDOWN_LINK, MARKDOWN_REFERENCE, HTML_TARGET]) {
      pattern.lastIndex = 0;
      for (const [, target] of text.matchAll(pattern)) {
        const resolved = resolveRepoPath(path, target);
        if (resolved && FROZEN_LEGACY_PATH_SET.has(resolved)) {
          errors.push(`${path}: Markdown link resolves to the deleted legacy path ${resolved}`);
        }
      }
    }

    let fenced = false;
    text.split(/\r?\n/).forEach((line, offset) => {
      if (/^\s*(?:```|~~~)/.test(line)) {
        fenced = !fenced;
        return;
      }
      if (fenced) return; // Inert fenced inventories are history, not instructions.
      if (line.includes('studio-legacy:') || PINNED_COMMIT_URL.test(line)) return;
      LEGACY_SLUG_PATTERN.lastIndex = 0;
      for (const [, token] of line.matchAll(LEGACY_SLUG_PATTERN)) {
        const resolved = token.startsWith('principles/')
          ? posix.normalize(token)
          : resolveRepoPath(path, token);
        if (resolved && FROZEN_LEGACY_PATH_SET.has(resolved)) {
          errors.push(
            `${path}:${offset + 1}: live reference to the deleted legacy path ${resolved}`,
          );
        }
      }
    });
  }
  return scanned;
}

function validateSchemaFiles(schemas, errors) {
  for (const [label, schema] of schemas) {
    if (!isObject(schema)) {
      errors.push(`${label}: must be a JSON Schema object`);
      continue;
    }
    if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
      errors.push(`${label}: must use JSON Schema draft 2020-12`);
    }
    if (schema.type !== 'object' || !isObject(schema.properties) || !isObject(schema.$defs)) {
      errors.push(`${label}: root object contract is incomplete`);
    }
  }
}

// ---------------------------------------------------------------------------
// Whole-state validation
// ---------------------------------------------------------------------------

function validateState(state) {
  const { ledger, ledgerRaw, historical, historicalRaw, final, finalRaw, sources } = state;
  const errors = [
    ...findDuplicateJsonKeys(ledgerRaw, LEDGER_PATH),
    ...findDuplicateJsonKeys(historicalRaw, HISTORICAL_RECEIPT_PATH),
    ...findDuplicateJsonKeys(finalRaw, FINAL_RECEIPT_PATH),
  ];

  const historicalIndex = validateHistoricalReceipt(historical, errors);
  const finalIndex = validateFinalReceipt(final, historical, errors);
  validateLedger(ledger, errors);
  const mappedSuccessors = validateReciprocity(ledger, finalIndex, historicalIndex, errors);
  const localStudio = validateStudioTree(sources, final, errors);
  const deletedCount = validateDeletionState(sources, historical, final, errors);
  validatePrincipleAuthoringSurface(sources, errors);
  const scannedFiles = validateLinkSafety(sources, errors);

  const summary = summarize(ledger, finalIndex, mappedSuccessors, deletedCount, scannedFiles);
  summary.preambleUpdatedFiles = localStudio?.preambleUpdatedFiles ?? 0;
  checkLedgerTotals(summary, errors);
  return { errors, summary, localStudioStatus: localStudio?.localStatus ?? null };
}

function summarize(ledger, finalIndex, mappedSuccessors, deletedCount, scannedFiles) {
  const dispositions = Object.fromEntries([...DISPOSITIONS].map((value) => [value, 0]));
  const destinations = Object.fromEntries(AUTHORITIES.map((value) => [value, 0]));
  const statuses = new Set();
  let links = 0;
  let citationExceptions = 0;
  let retirements = 0;
  for (const entry of Object.values(ledger?.entries ?? {})) {
    if (entry.disposition in dispositions) dispositions[entry.disposition] += 1;
    if (entry.disposition === 'retire') retirements += 1;
    if (entry.citationException) citationExceptions += 1;
    statuses.add(entry.status);
    for (const successor of entry.successors ?? []) {
      links += 1;
      if (successor.authority in destinations) destinations[successor.authority] += 1;
    }
  }
  return {
    entries: Object.keys(ledger?.entries ?? {}).length,
    statuses: [...statuses].sort(),
    dispositions,
    destinations,
    links,
    citationExceptions,
    retirements,
    uniqueMappedSuccessors: mappedSuccessors.size,
    ratifiedCatalog: [...finalIndex.values()].filter(({ status }) => status === 'Ratified').length,
    deletedCount,
    scannedFiles,
  };
}

function checkLedgerTotals(summary, errors) {
  if (!deepEqual(summary.dispositions, LEDGER_TOTALS.dispositions)) {
    errors.push('ledger disposition counts do not match the independent pin');
  }
  if (!deepEqual(summary.destinations, LEDGER_TOTALS.destinations)) {
    errors.push('ledger destination link counts do not match the independent pin');
  }
  if (summary.links !== LEDGER_TOTALS.links) {
    errors.push(`ledger must contain exactly ${LEDGER_TOTALS.links} successor links`);
  }
  if (summary.uniqueMappedSuccessors !== LEDGER_TOTALS.uniqueMappedSuccessors) {
    errors.push(
      `ledger must map exactly ${LEDGER_TOTALS.uniqueMappedSuccessors} unique Ratified successors`,
    );
  }
  if (summary.citationExceptions !== LEDGER_TOTALS.citationExceptions) {
    errors.push(
      `ledger must retain exactly ${LEDGER_TOTALS.citationExceptions} citation exceptions`,
    );
  }
  if (summary.retirements !== LEDGER_TOTALS.retirements) {
    errors.push(`ledger must retain exactly ${LEDGER_TOTALS.retirements} retirement judgments`);
  }
  if (summary.ratifiedCatalog !== 174) {
    errors.push('the final receipt must carry exactly 174 Ratified catalog records');
  }
  if (summary.deletedCount !== 21) {
    errors.push('exactly the 21 frozen legacy realm files must be absent');
  }
}

// ---------------------------------------------------------------------------
// Persistent negative mutation fixtures
// ---------------------------------------------------------------------------

function cloneBaseline(baseline) {
  return {
    ledger: structuredClone(baseline.ledger),
    ledgerRaw: baseline.ledgerRaw,
    historical: structuredClone(baseline.historical),
    historicalRaw: baseline.historicalRaw,
    final: structuredClone(baseline.final),
    finalRaw: baseline.finalRaw,
    overrides: new Map(),
  };
}

function requireValue(value, description) {
  if (value === undefined || value === null) throw new Error(`missing ${description}`);
  return value;
}

function resolveContainer(root, path) {
  let target = root;
  for (const segment of path.slice(0, -1))
    target = requireValue(target?.[segment], `path ${segment}`);
  return target;
}

function findAuthority(receipt, authority) {
  return requireValue(
    receipt.authorities.find((record) => record.authority === authority),
    `authority ${authority}`,
  );
}

function applyMutation(mutation, state) {
  switch (mutation.operation) {
    case 'add-unknown-ledger-entry':
      state.ledger.entries[mutation.legacyId] = structuredClone(
        requireValue(state.ledger.entries[mutation.cloneFrom], `entry ${mutation.cloneFrom}`),
      );
      break;
    case 'duplicate-ledger-key': {
      const marker = '"entries": {';
      state.ledgerRaw = state.ledgerRaw.replace(
        marker,
        `${marker}\n    "${mutation.legacyId}": {},`,
      );
      state.ledger = JSON.parse(state.ledgerRaw);
      break;
    }
    case 'set-ledger-field':
      requireValue(state.ledger.entries[mutation.legacyId], `entry ${mutation.legacyId}`)[
        mutation.field
      ] = mutation.value;
      break;
    case 'append-successor':
      requireValue(
        state.ledger.entries[mutation.legacyId],
        `entry ${mutation.legacyId}`,
      ).successors.push(mutation.successor);
      break;
    case 'set-ledger-successor-id':
      requireValue(
        state.ledger.entries[mutation.legacyId]?.successors?.[mutation.index],
        `successor ${mutation.index}`,
      ).id = mutation.value;
      break;
    case 'remove-ledger-evidence': {
      const entry = requireValue(state.ledger.entries[mutation.legacyId], 'ledger entry');
      if (!entry.evidence.includes(mutation.value)) throw new Error('evidence value not present');
      entry.evidence = entry.evidence.filter((value) => value !== mutation.value);
      break;
    }
    case 'delete-ledger-citation-exception': {
      const entry = requireValue(state.ledger.entries[mutation.legacyId], 'ledger entry');
      if (!entry.citationException) throw new Error('entry has no citationException');
      delete entry.citationException;
      break;
    }
    case 'set-final-field':
      resolveContainer(state.final, mutation.path)[mutation.path.at(-1)] = mutation.value;
      break;
    case 'set-historical-field':
      resolveContainer(state.historical, mutation.path)[mutation.path.at(-1)] = mutation.value;
      break;
    case 'set-final-authority-field':
      findAuthority(state.final, mutation.authority)[mutation.field] = mutation.value;
      break;
    case 'set-final-decision-field':
      findAuthority(state.final, mutation.authority).decision[mutation.field] = mutation.value;
      break;
    case 'set-final-principle-field': {
      const authority = findAuthority(state.final, mutation.authority);
      requireValue(
        authority.principles.find(({ id }) => id === mutation.id),
        `principle ${mutation.id}`,
      )[mutation.field] = mutation.value;
      break;
    }
    case 'set-final-protection-field': {
      const authority = findAuthority(state.final, mutation.authority);
      requireValue(authority.protection, `${mutation.authority} protection`)[mutation.field] =
        mutation.value;
      break;
    }
    case 'delete-final-protection': {
      const authority = findAuthority(state.final, mutation.authority);
      requireValue(authority.protection, `${mutation.authority} protection`);
      delete authority.protection;
      break;
    }
    case 'copy-final-protection': {
      const from = findAuthority(state.final, mutation.from);
      const to = findAuthority(state.final, mutation.to);
      to.protection = structuredClone(requireValue(from.protection, 'source protection'));
      break;
    }
    case 'delete-final-principle': {
      const authority = findAuthority(state.final, mutation.authority);
      const before = authority.principles.length;
      authority.principles = authority.principles.filter(({ id }) => id !== mutation.id);
      if (authority.principles.length === before) throw new Error(`no principle ${mutation.id}`);
      break;
    }
    case 'mutate-source-file': {
      const buffer = requireValue(createSourceView().read(mutation.path), `file ${mutation.path}`);
      const original = buffer.toString('utf8');
      if (!original.includes(mutation.find)) {
        throw new Error(`pattern not found in ${mutation.path}`);
      }
      state.overrides.set(
        mutation.path,
        Buffer.from(original.replace(mutation.find, mutation.replace), 'utf8'),
      );
      break;
    }
    case 'write-source-file':
      state.overrides.set(mutation.path, Buffer.from(mutation.content, 'utf8'));
      break;
    case 'remove-source-file':
      if (!createSourceView().exists(mutation.path)) throw new Error(`${mutation.path} is absent`);
      state.overrides.set(mutation.path, null);
      break;
    default:
      throw new Error(`unknown operation "${mutation.operation}"`);
  }

  if (mutation.syncFinalMapping) {
    state.final.migration.mappingSha256 = ledgerMappingSha256(state.ledger);
  }
  if (mutation.recomputeFinalIntegrity) {
    const unsigned = structuredClone(state.final);
    delete unsigned.integrity;
    state.final.integrity.digest = sha256(JSON.stringify(unsigned));
  }
  if (mutation.recomputeHistoricalIntegrity) {
    const unsigned = structuredClone(state.historical);
    delete unsigned.integrity;
    state.historical.integrity.digest = sha256(JSON.stringify(unsigned));
  }
}

function runNegativeFixtures(fixtures, baseline, baselineErrors) {
  const errors = [];
  if (!checkExactKeys(fixtures, ['schemaVersion', 'cases'], [], 'negative fixtures', errors)) {
    return { errors, count: 0 };
  }
  if (fixtures.schemaVersion !== 1 || !Array.isArray(fixtures.cases)) {
    errors.push('negative fixtures: invalid schemaVersion or cases');
    return { errors, count: 0 };
  }
  if (fixtures.cases.length === 0) {
    errors.push('negative fixtures: at least one persistent mutation case is required');
    return { errors, count: 0 };
  }
  if (baselineErrors.length > 0) {
    errors.push('negative fixtures cannot run against a failing baseline');
    return { errors, count: 0 };
  }

  const seenNames = new Set();
  for (const fixture of fixtures.cases) {
    if (!checkExactKeys(fixture, ['name', 'mutation', 'expectedError'], [], 'fixture', errors)) {
      continue;
    }
    if (seenNames.has(fixture.name)) errors.push(`duplicate negative fixture "${fixture.name}"`);
    seenNames.add(fixture.name);

    // No self-baselining: the expected failure must be absent before the mutation is applied.
    if (baselineErrors.some((message) => message.includes(fixture.expectedError))) {
      errors.push(
        `negative fixture "${fixture.name}" expects an error the clean baseline already reports`,
      );
      continue;
    }

    const state = cloneBaseline(baseline);
    try {
      applyMutation(fixture.mutation, state);
    } catch (error) {
      errors.push(`negative fixture "${fixture.name}" could not be applied: ${error.message}`);
      continue;
    }
    const result = validateState({
      ledger: state.ledger,
      ledgerRaw: state.ledgerRaw,
      historical: state.historical,
      historicalRaw: state.historicalRaw,
      final: state.final,
      finalRaw: state.finalRaw,
      sources: createSourceView(state.overrides),
    });
    if (!result.errors.some((message) => message.includes(fixture.expectedError))) {
      errors.push(
        `negative fixture "${fixture.name}" did not fail with "${fixture.expectedError}"`,
      );
    }
  }
  return { errors, count: fixtures.cases.length };
}

// ---------------------------------------------------------------------------
// Authenticated live verification
// ---------------------------------------------------------------------------

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

async function fetchFile(repository, path, ref, token) {
  const url = `https://api.github.com/repos/${repository}/contents/${path}?ref=${ref}`;
  const payload = await githubJson(url, token);
  if (payload.type !== 'file' || payload.encoding !== 'base64') {
    throw new Error(`${repository}@${ref}: ${path} is not a base64 file`);
  }
  const buffer = Buffer.from(payload.content.replace(/\s/g, ''), 'base64');
  if (gitBlobSha(buffer) !== payload.sha) {
    throw new Error(`${repository}@${ref}: ${path} Git blob digest failed`);
  }
  return { path, buffer, blobSha: payload.sha };
}

async function fetchSources(repository, paths, ref, token) {
  return Promise.all(paths.map((path) => fetchFile(repository, path, ref, token)));
}

async function verifyLiveReconciliationLedger(ledger, token) {
  const pin = RECONCILIATION_LEDGER;
  const { buffer, blobSha } = await fetchFile(pin.repository, pin.path, pin.commit, token);
  if (blobSha !== pin.blobSha) {
    throw new Error(`PR #21 ledger blob at ${pin.commit} is not ${pin.blobSha}`);
  }
  if (sha256(buffer) !== pin.sha256) {
    throw new Error(`PR #21 ledger content digest at ${pin.commit} changed`);
  }
  const historical = JSON.parse(buffer.toString('utf8'));
  const historicalMapping = ledgerMappingSha256(historical);
  if (historicalMapping !== pin.mappingSha256) {
    throw new Error(`PR #21 normalized mapping is ${historicalMapping}, not ${pin.mappingSha256}`);
  }
  if (ledgerMappingSha256(ledger) !== historicalMapping) {
    throw new Error('the current ledger mapping differs from the immutable PR #21 mapping');
  }
  const entries = Object.keys(historical.entries ?? {}).length;
  console.log(`  PR #21 ledger: ${entries} frozen mappings recomputed at ${pin.commit}`);
}

async function verifyLiveLegacySnapshot(historicalReceipt, finalReceipt, token) {
  const snapshot = finalReceipt.historicalEvidence.legacySourceSnapshot;
  const historicalFiles = new Map(
    historicalReceipt.legacySourceSnapshot.files.map((file) => [file.path, file]),
  );
  let bytes = 0;
  let principles = 0;
  for (const record of snapshot.files) {
    const { buffer, blobSha } = await fetchFile(
      LEGACY_SNAPSHOT.repository,
      record.path,
      LEGACY_SNAPSHOT.commit,
      token,
    );
    if (blobSha !== record.blobSha || sha256(buffer) !== record.sha256) {
      throw new Error(`${record.path}: deleted legacy bytes differ from the pinned snapshot`);
    }
    if (!deepEqual(historicalFiles.get(record.path), record)) {
      throw new Error(`${record.path}: the two receipts disagree about the deleted bytes`);
    }
    const slug = record.path.slice('principles/'.length, -'.md'.length);
    const ids = [...buffer.toString('utf8').matchAll(/^###\s+(\d+)\.\s+/gm)].map(
      (match) => `studio-legacy:${slug}:${Number(match[1])}`,
    );
    if (!arraysEqual(ids, record.topLevelIds)) {
      throw new Error(`${record.path}: recomputed top-level IDs differ from the pinned snapshot`);
    }
    bytes += buffer.length;
    principles += ids.length;
  }
  if (principles !== LEGACY_SNAPSHOT.topLevelPrinciples || bytes !== LEGACY_SNAPSHOT.totalBytes) {
    throw new Error(
      `deleted legacy content is ${principles} principles / ${bytes} bytes, not ${LEGACY_SNAPSHOT.topLevelPrinciples} / ${LEGACY_SNAPSHOT.totalBytes}`,
    );
  }
  console.log(
    `  Deleted legacy source: ${snapshot.files.length} files, ${principles} principles, ${bytes} bytes recomputed at ${LEGACY_SNAPSHOT.commit}`,
  );
}

async function verifyLiveAuthority(authority, historicalReceipt, finalReceipt, token) {
  const pin = FINAL_AUTHORITY_PINS[authority];
  const draftPin = DRAFT_AUTHORITY_PINS[authority];
  const record = finalReceipt.authorities.find((entry) => entry.authority === authority);
  const historicalRecord = historicalReceipt.authorities.find(
    (entry) => entry.authority === authority,
  );
  const apiRoot = `https://api.github.com/repos/${pin.repository}`;

  const sources = await fetchSources(pin.repository, pin.paths, pin.commit, token);
  for (const source of sources) {
    const expected = record.files.find((file) => file.path === source.path);
    if (source.blobSha !== expected.blobSha || sha256(source.buffer) !== expected.sha256) {
      throw new Error(`${authority}: ${source.path} differs from the Ratified receipt`);
    }
  }
  const catalog = buildCatalogFromSources(authority, sources);
  if (
    !deepEqual(catalog.files, record.files) ||
    !deepEqual(catalog.principles, record.principles) ||
    catalog.catalogSha256 !== record.catalogSha256 ||
    catalog.catalogSha256 !== pin.catalogSha256 ||
    catalog.semanticCatalogSha256 !== record.semanticCatalogSha256 ||
    catalog.semanticCatalogSha256 !== pin.semanticCatalogSha256
  ) {
    throw new Error(
      `${authority}: live IDs, paths, statuses, Legacy inputs, or digests differ from the Ratified receipt`,
    );
  }
  if (catalog.principles.some(({ status }) => status !== 'Ratified')) {
    throw new Error(`${authority}: the live catalog is not fully Ratified`);
  }

  const decision = await fetchFile(pin.repository, pin.decisionPath, pin.commit, token);
  if (
    decision.blobSha !== pin.decisionBlobSha ||
    sha256(decision.buffer) !== pin.decisionSha256 ||
    decision.blobSha !== record.decision.blobSha ||
    sha256(decision.buffer) !== record.decision.sha256
  ) {
    throw new Error(`${authority}: the decision record bytes changed`);
  }
  const scopeIds = extractDecisionScopeIds(decision.buffer.toString('utf8'), authority);
  if (
    !arraysEqual(scopeIds, [...record.decision.scopeIds].sort()) ||
    !arraysEqual(scopeIds, catalog.principles.map(({ id }) => id).sort())
  ) {
    throw new Error(`${authority}: the live decision scope does not cover exactly its catalog`);
  }

  const pullRequest = await githubJson(`${apiRoot}/pulls/${pin.pullRequest}`, token);
  if (
    pullRequest.state !== 'closed' ||
    pullRequest.merged !== true ||
    pullRequest.merge_commit_sha !== pin.commit ||
    pullRequest.base?.ref !== 'main' ||
    pullRequest.head?.sha !== record.decision.headCommit ||
    pullRequest.merged_at !== record.decision.mergedAt ||
    pullRequest.author_association !== 'OWNER' ||
    pullRequest.merged_by?.login !== OWNER.login ||
    pullRequest.merged_by?.id !== OWNER.id
  ) {
    throw new Error(
      `${authority}: PR #${pin.pullRequest} is not an owner merge of ${pin.commit} into main`,
    );
  }

  await verifyLiveMainState(authority, pin, record, catalog, token);
  await verifyLiveProtection(authority, pin, record, token);
  await verifyLiveHistoricalComparison(
    authority,
    draftPin,
    historicalRecord,
    record,
    catalog,
    token,
  );
  console.log(
    `  ${authority}: ${catalog.principles.length} Ratified principle(s) at ${pin.commit}; owner merge PR #${pin.pullRequest}`,
  );
}

/**
 * The pinned Ratification commit must remain in `main` history and the pinned catalog and
 * decision content must still be served there. Later unrelated commits are allowed, so the
 * Studio finalization merge cannot invalidate its own evidence.
 */
async function verifyLiveMainState(authority, pin, record, catalog, token) {
  const apiRoot = `https://api.github.com/repos/${pin.repository}`;
  const branch = await githubJson(`${apiRoot}/branches/main`, token);
  const head = branch.commit?.sha;
  if (!SHA1.test(head ?? '')) throw new Error(`${authority}: main head is not a commit SHA`);
  if (head === pin.commit) return;

  const comparison = await githubJson(`${apiRoot}/compare/${pin.commit}...${head}`, token);
  if (comparison.status !== 'ahead' && comparison.status !== 'identical') {
    throw new Error(
      `${authority}: pinned Ratification commit ${pin.commit} is no longer an ancestor of main (${comparison.status})`,
    );
  }

  const decision = await fetchFile(pin.repository, pin.decisionPath, head, token);
  if (decision.blobSha !== pin.decisionBlobSha) {
    throw new Error(`${authority}: the decision record changed at current main`);
  }
  const sources = await fetchSources(pin.repository, pin.paths, head, token);
  const current = buildCatalogFromSources(authority, sources);
  if (
    contentCatalogSha256(current.principles) !== contentCatalogSha256(catalog.principles) ||
    current.semanticCatalogSha256 !== catalog.semanticCatalogSha256
  ) {
    throw new Error(`${authority}: the Ratified catalog changed at current main (${head})`);
  }
  const changedFiles = sources.filter(
    (source) => source.blobSha !== record.files.find((file) => file.path === source.path)?.blobSha,
  ).length;
  console.log(
    `    ${authority}: main is ${head} (ahead of the pin); catalog unchanged, ${changedFiles} non-principle file edit(s)`,
  );
}

/** Recomputes the pre-Ratification semantics and proves exactly which principles changed. */
async function verifyLiveHistoricalComparison(
  authority,
  draftPin,
  historicalRecord,
  record,
  catalog,
  token,
) {
  const paths = historicalRecord.files.map(({ path }) => path);
  const sources = await fetchSources(draftPin.repository, paths, draftPin.commit, token);
  for (const source of sources) {
    const expected = historicalRecord.files.find((file) => file.path === source.path);
    if (source.blobSha !== expected.blobSha || sha256(source.buffer) !== expected.sha256) {
      throw new Error(`${authority}: ${source.path} differs from the historical Draft receipt`);
    }
  }
  const historicalCatalog = buildCatalogFromSources(authority, sources, { includeSemantic: false });
  if (
    !deepEqual(historicalCatalog.principles, historicalRecord.principles) ||
    historicalCatalog.catalogSha256 !== historicalRecord.catalogSha256 ||
    historicalCatalog.catalogSha256 !== draftPin.catalogSha256
  ) {
    throw new Error(`${authority}: the historical Draft catalog no longer reproduces its receipt`);
  }
  const semanticCatalog = buildCatalogFromSources(authority, sources);
  if (
    semanticCatalog.semanticCatalogSha256 !== draftPin.semanticCatalogSha256 ||
    semanticCatalog.semanticCatalogSha256 !== record.historicalComparison.draftSemanticCatalogSha256
  ) {
    throw new Error(`${authority}: the recomputed historical semantic catalog does not match`);
  }

  const historicalById = new Map(
    semanticCatalog.principles.map((principle) => [principle.id, principle]),
  );
  const changes = [];
  for (const principle of catalog.principles) {
    const before = historicalById.get(principle.id);
    if (!before) throw new Error(`${authority}: ${principle.id} has no pre-Ratification record`);
    if (
      before.path !== principle.path ||
      before.title !== principle.title ||
      !arraysEqual(before.legacyInputs, principle.legacyInputs)
    ) {
      throw new Error(`${authority}: ${principle.id} changed identity, path, or Legacy inputs`);
    }
    if (before.semanticSha256 !== principle.semanticSha256) {
      changes.push(
        `${authority}:${principle.id}:${before.semanticSha256}:${principle.semanticSha256}`,
      );
    }
  }
  const expected = EXPECTED_SEMANTIC_CHANGES.filter((change) => change.authority === authority)
    .map(
      ({ id, historicalSemanticSha256, ratifiedSemanticSha256 }) =>
        `${authority}:${id}:${historicalSemanticSha256}:${ratifiedSemanticSha256}`,
    )
    .sort();
  if (!arraysEqual(changes.sort(), expected)) {
    throw new Error(
      `${authority}: semantic changes since the Draft evidence are ${changes.length ? changes.join(', ') : 'none'}, expected ${expected.length ? expected.join(', ') : 'none'}`,
    );
  }
  for (const change of EXPECTED_SEMANTIC_CHANGES.filter(
    (expectedChange) => expectedChange.authority === authority,
  )) {
    await verifyLiveSemanticChangeReview(
      authority,
      FINAL_AUTHORITY_PINS[authority],
      record,
      change,
      token,
    );
  }
}

async function verifyLiveSemanticChangeReview(authority, pin, record, expected, token) {
  const change = record.historicalComparison.changedPrinciples.find(({ id }) => id === expected.id);
  if (!change || !deepEqual(change.review, expected.review)) {
    throw new Error(
      `${authority}: ${expected.id} review provenance differs from the independent pin`,
    );
  }
  const review = expected.review;
  const apiRoot = `https://api.github.com/repos/${review.repository}`;
  const pullRequest = await githubJson(`${apiRoot}/pulls/${review.pullRequest}`, token);
  if (
    pullRequest.state !== review.state ||
    pullRequest.merged !== review.merged ||
    pullRequest.merged_at !== review.mergedAt ||
    pullRequest.base?.ref !== review.baseRef ||
    pullRequest.base?.sha !== review.beforeCommit ||
    pullRequest.head?.sha !== review.headCommit ||
    pullRequest.merge_commit_sha !== review.afterCommit ||
    pullRequest.author_association !== review.authorAssociation ||
    pullRequest.user?.login !== review.author.login ||
    pullRequest.user?.id !== review.author.id ||
    pullRequest.merged_by?.login !== review.mergedBy.login ||
    pullRequest.merged_by?.id !== review.mergedBy.id
  ) {
    throw new Error(
      `${authority}: PR #${review.pullRequest} is not the pinned owner-reviewed ${expected.id} refinement`,
    );
  }

  const reviewComparison = await githubJson(
    `${apiRoot}/compare/${review.beforeCommit}...${review.afterCommit}`,
    token,
  );
  if (reviewComparison.status !== 'ahead') {
    throw new Error(
      `${authority}: ${expected.id} after commit is not descended from its pinned before commit`,
    );
  }
  const ratificationComparison = await githubJson(
    `${apiRoot}/compare/${review.afterCommit}...${pin.commit}`,
    token,
  );
  if (ratificationComparison.status !== 'ahead' && ratificationComparison.status !== 'identical') {
    throw new Error(
      `${authority}: ${expected.id} reviewed after commit is not in the Ratification history`,
    );
  }

  const afterSources = await fetchSources(review.repository, pin.paths, review.afterCommit, token);
  const afterCatalog = buildCatalogFromSources(authority, afterSources);
  const after = afterCatalog.principles.find(({ id }) => id === expected.id);
  if (
    after?.semanticSha256 !== expected.ratifiedSemanticSha256 ||
    afterCatalog.semanticCatalogSha256 !== pin.semanticCatalogSha256
  ) {
    throw new Error(
      `${authority}: ${expected.id} reviewed after commit does not reproduce the Ratified semantics`,
    );
  }
  console.log(
    `    ${authority}: ${expected.id} semantic exception verified through owner merge PR #${review.pullRequest} (${review.beforeCommit} -> ${review.afterCommit})`,
  );
}

/**
 * Re-reads the protected-branch rule that is still in force and the required-check results on the
 * reviewed Ratification head. The `.github` decision record makes owner merge effective only after
 * the required `CI gate` succeeds, so this is a Ratification precondition, not decision prose.
 */
async function verifyLiveProtection(authority, pin, record, token) {
  if (authority !== PROTECTION_AUTHORITY) return;
  const apiRoot = `https://api.github.com/repos/${pin.repository}`;
  const protection = record.protection;

  let live;
  try {
    live = await githubJson(`${apiRoot}/branches/${protection.branch}/protection`, token);
  } catch (error) {
    throw new Error(
      `${authority}: branch protection could not be read (${error.message}); this check needs a token with admin read on ${pin.repository}`,
    );
  }
  const required = live.required_status_checks;
  const liveChecks = (required?.checks ?? [])
    .map(({ context, app_id: appId }) => ({ context, appId }))
    .sort((left, right) => left.context.localeCompare(right.context));
  if (
    required?.strict !== true ||
    !deepEqual(liveChecks, PROTECTION_PIN.requiredChecks) ||
    !deepEqual(liveChecks, protection.requiredChecks) ||
    !arraysEqual(
      [...(required?.contexts ?? [])].sort(),
      PROTECTION_PIN.requiredChecks.map(({ context }) => context).sort(),
    )
  ) {
    throw new Error(
      `${authority}: ${protection.branch} no longer strictly requires exactly ${PROTECTION_PIN.requiredChecks.map(({ context }) => context).join(', ')}`,
    );
  }
  if (live.allow_force_pushes?.enabled !== false || live.allow_deletions?.enabled !== false) {
    throw new Error(
      `${authority}: ${protection.branch} must keep force pushes and branch deletion disabled`,
    );
  }

  const head = record.decision.headCommit;
  const runs = await githubJson(`${apiRoot}/commits/${head}/check-runs?per_page=100`, token);
  const liveHeadChecks = (runs.check_runs ?? [])
    .map((run) => ({
      name: run.name,
      required: PROTECTION_PIN.requiredChecks.some(({ context }) => context === run.name),
      status: run.status,
      conclusion: run.conclusion,
      detailsUrl: run.details_url,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  if (
    !deepEqual(liveHeadChecks, PROTECTION_PIN.ratificationHeadChecks) ||
    !deepEqual(liveHeadChecks, protection.ratificationHeadChecks)
  ) {
    throw new Error(
      `${authority}: check results on Ratification head ${head} differ from the pinned evidence`,
    );
  }
  for (const { context } of PROTECTION_PIN.requiredChecks) {
    const check = liveHeadChecks.find((run) => run.name === context);
    if (check?.status !== 'completed' || check?.conclusion !== 'success') {
      throw new Error(
        `${authority}: required check "${context}" was not successful on Ratification head ${head}`,
      );
    }
  }
  console.log(
    `    ${authority}: ${protection.branch} strictly requires ${PROTECTION_PIN.requiredChecks.map(({ context }) => context).join(', ')}; force pushes and deletion disabled; ${liveHeadChecks.length} check(s) successful on ${head}`,
  );
}

async function verifyLive(ledger, historicalReceipt, finalReceipt) {
  const token = githubToken();
  await verifyLiveReconciliationLedger(ledger, token);
  await verifyLiveLegacySnapshot(historicalReceipt, finalReceipt, token);
  for (const authority of AUTHORITIES) {
    await verifyLiveAuthority(authority, historicalReceipt, finalReceipt, token);
  }
}

// ---------------------------------------------------------------------------
// Optional one-time finalization diff
// ---------------------------------------------------------------------------

function verifyFinalizationDiff() {
  const base = FINAL_AUTHORITY_PINS.Studio.commit;
  const output = execFileSync(
    'git',
    ['-C', repoRoot, 'diff', '--no-renames', '--name-status', base, '--'],
    { encoding: 'utf8', windowsHide: true },
  );
  const deleted = output
    .split(/\r?\n/)
    .filter((line) => line.startsWith('D\t'))
    .map((line) => line.slice(2).trim())
    .sort();
  if (!arraysEqual(deleted, FROZEN_LEGACY_PATHS)) {
    const unexpected = deleted.filter((path) => !FROZEN_LEGACY_PATH_SET.has(path));
    const missing = FROZEN_LEGACY_PATHS.filter((path) => !deleted.includes(path));
    throw new Error(
      `deletions against ${base} must be exactly the frozen 21 paths (unexpected: ${unexpected.join(', ') || 'none'}; missing: ${missing.join(', ') || 'none'})`,
    );
  }
  console.log(
    `Finalization diff: ${deleted.length} deletion(s) against ${base}, all frozen legacy realm paths.`,
  );
}

function printFailure(errors) {
  console.error('Principle validation FAILED:\n');
  for (const error of errors) console.error(`  - ${error}`);
  console.error(`\n${errors.length} problem(s).`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const KNOWN_ARGS = new Set(['--live', '--finalization-diff']);
const args = process.argv.slice(2);
const unknownArgs = args.filter((argument) => !KNOWN_ARGS.has(argument));
if (unknownArgs.length > 0) {
  printFailure([`unknown argument(s): ${unknownArgs.join(', ')}`]);
  process.exit(1);
}

const loadErrors = [];
const ledgerFile = readJson(LEDGER_PATH, loadErrors);
const historicalFile = readJson(HISTORICAL_RECEIPT_PATH, loadErrors);
const finalFile = readJson(FINAL_RECEIPT_PATH, loadErrors);
const ledgerSchemaFile = readJson(LEDGER_SCHEMA_PATH, loadErrors);
const historicalSchemaFile = readJson(HISTORICAL_RECEIPT_SCHEMA_PATH, loadErrors);
const finalSchemaFile = readJson(FINAL_RECEIPT_SCHEMA_PATH, loadErrors);
const fixturesFile = readJson(FIXTURES_PATH, loadErrors);
validateSchemaFiles(
  [
    [LEDGER_SCHEMA_PATH, ledgerSchemaFile.value],
    [HISTORICAL_RECEIPT_SCHEMA_PATH, historicalSchemaFile.value],
    [FINAL_RECEIPT_SCHEMA_PATH, finalSchemaFile.value],
  ],
  loadErrors,
);

if (
  loadErrors.length > 0 ||
  !ledgerFile.value ||
  !historicalFile.value ||
  !finalFile.value ||
  !fixturesFile.value
) {
  printFailure(loadErrors.length > 0 ? loadErrors : ['required migration records could not load']);
  process.exit(1);
}

const baseline = {
  ledger: ledgerFile.value,
  ledgerRaw: ledgerFile.raw,
  historical: historicalFile.value,
  historicalRaw: historicalFile.raw,
  final: finalFile.value,
  finalRaw: finalFile.raw,
};
const result = validateState({ ...baseline, sources: createSourceView() });
const fixtureResult = runNegativeFixtures(fixturesFile.value, baseline, result.errors);
const errors = [...result.errors, ...fixtureResult.errors];

if (errors.length > 0) {
  printFailure(errors);
  process.exit(1);
}

const { summary } = result;
console.log(
  `Principle validation passed: ${summary.ratifiedCatalog} Ratified authority principles, ${summary.entries}/192 legacy dispositions ${summary.statuses.join('/')}.`,
);
console.log(
  `  Dispositions: rewrite ${summary.dispositions.rewrite}, split ${summary.dispositions.split}, reference ${summary.dispositions.reference}, retire ${summary.dispositions.retire}`,
);
console.log(
  `  Successor links: ${summary.links} total — Studio ${summary.destinations.Studio}, Engineering ${summary.destinations.Engineering}, Product ${summary.destinations.Product}, .github ${summary.destinations['.github']}`,
);
console.log(
  `  Receipts: historical Draft evidence preserved (proves no Ratification, authorizes no deletion); finalization evidence gates ${summary.uniqueMappedSuccessors} unique mapped successors and ${summary.citationExceptions} citation exceptions`,
);
console.log(
  `  Studio tree: 25 Ratified blocks byte-identical to the pinned receipt; ${summary.preambleUpdatedFiles}/7 file(s) differ only in their independently pinned preamble`,
);
console.log(
  `  Deletion: ${summary.deletedCount}/21 frozen legacy realm files absent, ${summary.retirements} retirement judgments preserved, ${summary.scannedFiles} text files scanned for live references`,
);
console.log(
  '  Effective act: repository-owner merge of the finalization pull request; neither receipt can substitute for it',
);
const protectionRecord = finalFile.value.authorities.find(
  ({ authority }) => authority === PROTECTION_AUTHORITY,
)?.protection;
if (protectionRecord) {
  const required = protectionRecord.requiredChecks.map(({ context }) => context).join(', ');
  const successful = protectionRecord.ratificationHeadChecks.filter(
    ({ conclusion }) => conclusion === 'success',
  ).length;
  console.log(
    `  Protected branch: ${PROTECTION_AUTHORITY} ${protectionRecord.branch} strictly requires ${required}; force pushes and deletion disabled; ${successful}/${protectionRecord.ratificationHeadChecks.length} check(s) successful on Ratification head`,
  );
}
console.log(`  Negative mutations: ${fixtureResult.count} expected failures confirmed`);

if (args.includes('--live')) {
  console.log('Live authority verification:');
  try {
    await verifyLive(ledgerFile.value, historicalFile.value, finalFile.value);
  } catch (error) {
    printFailure([error.message]);
    process.exit(1);
  }
  console.log('Live authority verification passed.');
}

if (args.includes('--finalization-diff')) {
  try {
    verifyFinalizationDiff();
  } catch (error) {
    printFailure([error.message]);
    process.exit(1);
  }
}
