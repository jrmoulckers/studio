# Principles — Security

> **Status:** Draft · **Owner:** _you_ · **Aligned agent:** `security-reviewer`
>
> This file is authored in a dedicated worktree session. Fill in the tree below.
> Keep each principle short, testable, and specific to this realm.

## Purpose

Security governs how JRM Studio protects the integrity of its shared packages and the
product apps that consume them. Because a compromise in `@jrm/*` propagates to every
downstream repo, this realm exists to keep secrets out of the tree, keep the supply chain
trustworthy, and keep review disciplined enough that a bad change is caught before publish.

## Principles

### 1. No secrets in the repo, ever

- **Statement:** Never commit credentials, tokens, private keys, or `.env` files; source all
  secrets from the environment or a secret manager at runtime.
- **Why:** Git history is forever and this monorepo fans out to many product repos — one
  leaked token is a leak everywhere, and rotation is expensive and error-prone.
- **In practice:** `.env*` stays git-ignored; secrets are read from `process.env`; a secret
  scanner (e.g. gitleaks) runs in CI and pre-commit; publish/registry tokens live only in CI
  secrets, never in `.npmrc` committed to the tree.
- **Anti-patterns:** Hardcoded API keys "just for testing"; `NPM_TOKEN` in a committed
  `.npmrc`; base64-encoding a secret to sneak it past review; disabling the secret scanner.

#### 1.1 Rotate on exposure, don't just delete

- **Statement:** Treat any secret that ever touched a commit, log, or CI output as
  compromised — rotate it, don't just remove the line.
- **Why:** Deleting a secret from `HEAD` leaves it in history and in anyone's clone; only
  rotation actually revokes access.

### 2. Pin and verify the supply chain

- **Statement:** Depend only on vetted packages, and let the committed `pnpm-lock.yaml` be
  the single source of truth for exactly what resolves.
- **Why:** Design tokens and config presets are executed at build time in every consumer, so
  a malicious or typo-squatted transitive dependency is remote code execution across the fleet.
- **In practice:** CI installs with `pnpm install --frozen-lockfile`; lockfile changes are
  reviewed as carefully as source; new deps are justified in the PR; `pnpm audit` (or
  Dependabot/OSV) gates on known-exploitable advisories; prefer few, well-maintained deps.
- **Anti-patterns:** Regenerating the lockfile to make CI pass without reading the diff;
  adding a dependency for a one-line utility; ignoring audit findings indefinitely; using
  `--no-frozen-lockfile` in CI.

#### 2.1 Guard install-time execution

- **Statement:** Scrutinize packages with `postinstall`/lifecycle scripts and prefer
  disabling arbitrary install scripts by default.
- **Why:** Lifecycle scripts run with full developer/CI privileges before any code review of
  behavior; they are the primary supply-chain attack vector.

### 3. Threat-model before you build

- **Statement:** For any new package boundary, build step, or externally-fed input, name the
  assets, entry points, and trust boundaries before writing code.
- **Why:** Most vulnerabilities are missing controls at a boundary nobody mapped; a
  five-minute STRIDE pass is cheaper than an incident.
- **In practice:** New features carry a short threat note (assets / entry points / trust
  boundaries / mitigations) in the PR or design doc; token-build scripts and any code that
  reads files, network, or user config are explicitly modeled.
- **Anti-patterns:** "It's just an internal build script"; discovering the trust boundary
  only during incident response; treating consumer-supplied config as trusted.

### 4. Least privilege by default

- **Statement:** Grant the narrowest access, scope, and lifetime that still lets the job run —
  for tokens, CI jobs, file access, and published surface area.
- **Why:** Blast radius is bounded by privilege; over-broad tokens and jobs turn a small
  mistake into a full compromise.
- **In practice:** CI tokens are read-only unless a job must publish; workflows set minimal
  `permissions:`; packages export only what consumers need and keep everything else internal;
  packages stay `private` until publishing is deliberately wired.
- **Anti-patterns:** A single admin PAT reused across jobs; `permissions: write-all`;
  exporting internals "in case someone needs them"; long-lived tokens where short-lived
  OIDC/ephemeral credentials would do.

### 5. Validate and sanitize every untrusted input

- **Statement:** Validate, type-check, and bound every value that crosses a trust boundary —
  token source files, consumer config, CLI args, and build inputs — before using it.
- **Why:** Injection, path traversal, and prototype pollution all start with unvalidated
  input reaching a sink; a token/config compiler that trusts its input can be weaponized.
- **In practice:** Parse-don't-validate with a schema at boundaries; constrain file paths to
  expected roots; never build shell commands or file paths via string concatenation of
  untrusted data; escape/encode on output for the target context (CSS, HTML, JS).
- **Anti-patterns:** Passing user/config strings straight into `fs`, `exec`, or a generated
  file; trusting `theme` names to be safe path segments; `eval`/dynamic `require` on input.

### 6. Review against OWASP, gated in CI

- **Statement:** Security review is a required, OWASP/SANS-aligned gate — not an optional
  afterthought — and automated checks enforce it on every PR.
- **Why:** Consistent, checklist-driven review catches the common classes (injection,
  broken access control, vulnerable dependencies, secrets) that ad-hoc reading misses.
- **In practice:** CI runs secret scanning, `pnpm audit`, lint, and code scanning (e.g.
  CodeQL); PRs touching auth, inputs, deps, or build scripts get an explicit security review;
  findings are triaged by severity, and CRITICAL/HIGH block merge.
- **Anti-patterns:** Merging with failing/skipped security checks; deferring HIGH findings
  with no owner or date; treating a green build as proof of security without any review.

### 7. Fail securely and never leak internals

- **Statement:** On error, deny by default and keep secrets, tokens, and stack internals out
  of logs, error messages, and published artifacts.
- **Why:** Verbose failures hand attackers a map, and secrets in logs/build output re-create
  the very leak principle 1 forbids.
- **In practice:** Errors surface actionable messages without secret values; build/CI logs are
  scrubbed of tokens; generated artifacts (CSS/JS in `build/`) contain no credentials; caches
  and logs are treated as potentially public.
- **Anti-patterns:** Logging the full request/config including a token; shipping source maps
  or comments that expose secret endpoints; defaulting to "allow" when a check throws.

## Aligned agent

`security-reviewer` — this specialist should treat the principles above as binding practice
when working in this realm.

## Related realms

- [DevOps](devops.md) — CI secret handling, token scopes, and workflow `permissions`.
- [Process](process.md) — the merge gate that enforces security checks and severity blocking.
- [Architecture](architecture.md) — trust boundaries and package export surface area.
- [Compliance](compliance.md) — data retention, deletion, and regulatory obligations.
- [Backend](backend.md) — input validation and authz where server code exists.
- [Testing](testing.md) — security regression tests and dependency-audit gates.
