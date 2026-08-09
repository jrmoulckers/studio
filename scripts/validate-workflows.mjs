#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const workflow = readFileSync(join(repoRoot, '.github', 'workflows', 'ci.yml'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
const reusableSha = '97ff60ec21321563fa0fc7ba80015261e7dcd6fa';
const lines = workflow.split(/\r?\n/);

function jobBlock(jobId) {
  const start = lines.indexOf(`  ${jobId}:`);
  assert.notEqual(start, -1, `CI must define the ${jobId} job`);

  const next = lines.findIndex(
    (line, index) => index > start && /^ {2}[a-z][a-z0-9_]*:$/.test(line),
  );
  return lines.slice(start, next === -1 ? lines.length : next).join('\n');
}

assert.match(workflow, /push:\n {4}branches: \[main\]/, 'push validation must target main only');
assert.match(workflow, /\n {2}pull_request:\n/, 'pull request validation must remain enabled');
assert.doesNotMatch(
  workflow,
  /branches: \[['"]\*\*['"]\]/,
  'branch pushes must not duplicate PR runs',
);
assert.match(
  workflow,
  /group: ci-\${{ github\.workflow }}-\${{ github\.event\.pull_request\.number \|\| github\.ref }}/,
  'concurrency must group reruns by pull request or branch',
);
assert.match(
  workflow,
  /permissions:\n {2}contents: read\n {2}pull-requests: read/,
  'caller permissions must grant only the reusable workflow union',
);

for (const reusable of [
  'reusable-ci-lint.yml',
  'reusable-ci-web.yml',
  'reusable-security-ci.yml',
]) {
  assert.match(
    workflow,
    new RegExp(
      `uses: jrmoulckers/\\.github/\\.github/workflows/${reusable.replace('.', '\\.')}@${reusableSha}`,
    ),
    `${reusable} must use the reviewed immutable revision`,
  );
}

const canonicalCalls = [
  ...workflow.matchAll(/uses: jrmoulckers\/\.github\/\.github\/workflows\/[^@\s]+@([^\s]+)/g),
];
assert.equal(
  canonicalCalls.length,
  3,
  'CI must call exactly the three reviewed reusable workflows',
);
assert.ok(
  canonicalCalls.every(([, revision]) => revision === reusableSha),
  'every canonical workflow call must use the reviewed immutable revision',
);
assert.doesNotMatch(workflow, /secrets:\s*inherit/, 'reusable workflows must not inherit secrets');

const lint = jobBlock('lint');
assert.match(lint, /contents: read/);
assert.match(lint, /lint-command: pnpm lint/);
assert.match(lint, /format-check-command: pnpm format:check/);
assert.match(
  lint,
  /pull-requests: read/,
  'semantic title validation requires pull request read access',
);

const web = jobBlock('web');
assert.match(web, /contents: read/);
assert.doesNotMatch(web, /pull-requests: read/);
assert.match(web, /typecheck-command: pnpm typecheck/);
assert.match(web, /test-command: pnpm test/);
assert.match(
  web,
  /build-command: pnpm -r build/,
  'the workspace package graph build must remain explicit',
);

const security = jobBlock('security');
assert.match(security, /contents: read/);
assert.doesNotMatch(security, /pull-requests: read/);
assert.match(security, /run-package-audit: true/);
assert.match(security, /run-secret-scan: true/);
assert.match(security, /run-dependency-review: true/);

const tokens = jobBlock('tokens_dist');
assert.match(
  tokens,
  /run: pnpm tokens:dist:check/,
  'token distribution freshness must remain local',
);

const windows = jobBlock('format_windows');
assert.match(windows, /runs-on: windows-latest/);
assert.match(windows, /run: pnpm format:check/, 'Windows formatting parity must remain local');

for (const localJob of [tokens, windows, jobBlock('build')]) {
  assert.match(localJob, /timeout-minutes: \d+/, 'every local job must have a timeout');
}

const localCheckouts = [
  ...workflow.matchAll(
    /uses: actions\/checkout@[^\n]+\n {8}with:\n {10}persist-credentials: false/g,
  ),
];
assert.equal(localCheckouts.length, 2, 'every local checkout must disable persisted credentials');

const aggregate = jobBlock('build');
assert.match(aggregate, /name: build/, 'the aggregate required-check name must remain stable');
assert.match(aggregate, /permissions: {}/, 'the aggregate must not receive repository permissions');
assert.match(
  aggregate,
  /needs: \[lint, web, security, tokens_dist, format_windows\]/,
  'the stable build aggregate must require every evidence job',
);
for (const result of [
  'needs.lint.result',
  'needs.web.result',
  'needs.security.result',
  'needs.tokens_dist.result',
  'needs.format_windows.result',
]) {
  assert.ok(aggregate.includes(result), `build aggregate must inspect ${result}`);
}

assert.ok(
  packageJson.scripts.test.includes('turbo run test'),
  'package contract tests must remain',
);
assert.ok(
  packageJson.scripts.test.includes('principles:check'),
  'principles validation must remain',
);
assert.ok(
  packageJson.scripts.test.includes('workflows:check'),
  'workflow validation must run in tests',
);

console.log('Workflow validation passed.');
