# Studio Agent Overlay

This is the authoritative local dispatch map for the 22 canonical agent slugs. Canonical
definitions own generic personas, capabilities, and provider syntax. This file owns
Studio's realms, paths, product constraints, risks, and handoffs.

## Authority and adoption boundary

- Mandatory platform and safety rules come first. The nearest Studio instruction and all
  applicable realm principles then override conflicting canonical role guidance.
- Realm files remain authoritative for product decisions. Every realm is currently
  **Draft** with the unresolved `_you_` owner placeholder; this map neither ratifies a
  realm nor assigns a human owner.
- This overlay is provider-neutral Markdown. Future `.github/agents/*.agent.md` files and
  sync lock data are generated canonical outputs; never create or maintain them here.
- Dispatch one lead agent by the changed path and dominant realm. Cross-cutting reviewers
  advise or receive a handoff instead of becoming a second implementer.

## Canonical slug -> Studio responsibility

Risk is the canonical operating risk applied to Studio work. "Handoff only" means the
canonical role remains routable even though Studio has no dedicated realm or owned
implementation path for it.

| Canonical slug             | Studio realm and path focus                                                                      | Risk   | Required handoff or boundary                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `accessibility-reviewer`   | [Accessibility](accessibility.md); read-only review of `packages/tokens/**` outputs              | Low    | Route fixes to `design-engineer` or the consuming `web-engineer`; `qa-tester` verifies.                                            |
| `ai-ops-engineer`          | [AI Process](ai-process.md), [AI Products](ai-products.md), `AGENTS.md`, AI overlay/config       | Medium | Own prompts, evals, dispatch, and overlays; hand product code to its owner and CI to `devops-engineer`.                            |
| `architect`                | [Architecture](architecture.md), [Middleware](middleware.md); package boundaries and contracts   | Medium | Define layering and ADRs; hand implementation to the path owner.                                                                   |
| `backend-engineer`         | [Backend](backend.md); no backend implementation path currently exists here                      | High   | Hand schema/migration work to `database-engineer`; coordinate service reliability with `sre-engineer`.                             |
| `business-analyst`         | [Business](business.md); finance and product decision context                                    | Low    | Analysis does not confer production-code, pricing, or release authority.                                                           |
| `compliance-specialist`    | [Compliance](compliance.md); privacy, retention, residency, and licenses                         | High   | Requirements are advisory; final finance lawful-basis and transfer conclusions require human/legal review.                         |
| `data-engineer`            | [Data & Analytics](data-analytics.md); no telemetry implementation path currently exists here    | High   | Enforce consent/minimization and the no-cross-app-identity rule; hand storage controls to backend/database owners.                 |
| `database-engineer`        | Handoff only; no database realm, schema, or migration path currently exists here                 | High   | Receive persistence work from `backend-engineer`; do not invent a Studio database layer.                                           |
| `design-engineer`          | [Design](design.md); `packages/tokens/**`, token contract in `packages/tailwind-preset/**`       | Medium | Lead token sources; accessibility reviews and QA regression-checks emitted behavior.                                               |
| `devops-engineer`          | [DevOps](devops.md); `.github/workflows/**`, `package.json`, `pnpm-workspace.yaml`, `turbo.json` | High   | Own CI/build wiring; release intent stays with `release-manager`; AI Ops does not edit workflows.                                  |
| `docs-writer`              | [Documentation](documentation.md); `README.md` and package documentation                         | Low    | Preserve architecture, business, compliance, and principle ownership when documenting their decisions.                             |
| `experimentation-engineer` | [Featuring](featuring.md); no flag/experiment implementation path currently exists here          | High   | Hand metrics to `data-engineer`, delivery to `devops-engineer`, and reliability to `sre-engineer`.                                 |
| `localization-engineer`    | [Localization](localization.md); no locale catalog currently exists here                         | Medium | Product catalog/resource edits belong to the consuming web or native owner.                                                        |
| `marketing-strategist`     | Handoff only; no dedicated Studio realm or implementation path                                   | Low    | Consult business, documentation, and compliance owners; no pricing, legal-approval, product-code, or release-submission authority. |
| `native-app-engineer`      | Handoff only; Studio contains no native app or Gradle path                                       | High   | Apply the token contract in finance's Android/Windows/KMP consumers; do not add Gradle to Studio.                                  |
| `performance-engineer`     | [Performance](performance.md); budgets and profiling across shared outputs                       | Medium | Define evidence and budgets; the owning implementation agent makes the fix.                                                        |
| `product-manager`          | [Project Planning](project-planning.md); scope, parity, acceptance, sequencing                   | Medium | Own outcomes and prioritization, not implementation paths.                                                                         |
| `qa-tester`                | [Testing](testing.md); read-only validation and regression orchestration                         | Low    | Reproduce and route defects; Studio currently has no behavior or visual test suite.                                                |
| `release-manager`          | [Process](process.md); `.changeset/**`, release notes, and release intent                        | High   | Prepare changesets only; packages remain private `0.0.0` and are never published.                                                  |
| `security-reviewer`        | [Security](security.md); threat and dependency review                                            | High   | Review first; only scoped critical/high emergency fixes may cross into implementation.                                             |
| `sre-engineer`             | Handoff only; Studio hosts no service                                                            | High   | Receive service work from DevOps or Backend and own it in the repository that operates the service.                                |
| `web-engineer`             | [Frontend](frontend.md), [Local-First](local-first.md); no product app source exists here        | Medium | Keep UI framework-neutral; hand token changes to `design-engineer` and server/sync work to their owners.                           |

## Studio facts every canonical role must preserve

### Kernel, consumers, and build graph

- Studio is a pnpm `10.16.1` workspace (`packages/*`) on Node `>=20`; CI currently uses
  Node 24. It contains no product `apps/`, backend, database, or Gradle build.
- Turbo's `^build` graph enforces `@jrm/tokens` -> `@jrm/tailwind-preset`. Token primitives
  stay at the bottom, presets consume them, and config packages remain independent leaves.
- The consumer matrix spans Next.js (`jrm-recipes`), Svelte/Vite PWA (`score-king`),
  React/Vite web (`finance`), and Gradle/KMP native (`finance`). Plain CSS custom
  properties are the shared contract; framework-specific glue is not.

### Tokens, themes, and generated output

- `@jrm/tokens` follows the three-tier primitive -> semantic -> component reference chain
  and emits CSS variables, a Tailwind preset, and typed JS/TS.
- Four color modes ship: light, dark, dark-OLED, and high-contrast. The
  `data-a11y-cognitive="true"` mode is orthogonal; its spacing, focus, elevation, border,
  and touch-target role coverage remains a documented gap.
- `packages/tokens/build/` is ignored local output. `packages/tokens/dist/` is a committed,
  deterministic, text-only distribution interface copied byte-for-byte by the external
  sync engine. Regenerate both; hand-edit neither.

### Local-first, privacy, and identity

- When a client is the system of record, reads and durable writes work offline first.
  Portable user-owned data is structurally separate from device-local state.
- Optional sync lives behind a narrow provider seam. Conflict behavior, including
  tombstones/deletes, is explicit and tested. Optional integrations degrade to a no-op,
  and a fresh clone boots without secrets.
- `@jrm/*` packages carry no personal data. Never emit transaction amounts, account
  numbers, raw content, or secrets to analytics. Analytics identity is per-app, rotating,
  non-reversible, and never joined to authenticated identity or across products.

### Release and regression gates

- Every package stays private and `0.0.0`. Changesets record semver intent, but no package
  is published unless a future policy explicitly replaces the registry-free model.
- Existing gates are `pnpm -r build`, `pnpm typecheck`, `pnpm lint`,
  `pnpm format:check`, and `pnpm tokens:dist:check`.
- Token-surface and visual regression coverage across all modes is required by
  [Testing](testing.md), but Studio does not yet have a test or visual-regression suite.
  Do not report those checks as available until they exist.

## Shared practice

1. Read every touched realm; cross-cutting work follows all of them.
2. Cite the principle driving a decision.
3. Propose a short, testable addition when a principle is missing; do not improvise.
4. Preserve Draft/ownership metadata unless explicit review ratifies or assigns it.
