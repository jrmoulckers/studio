# Agent Alignment

Every specialist agent working in this repo treats the principles in its aligned realm
as **binding practice**. Before acting in a realm, the agent reads that realm's file in
`principles/` and follows its principle tree. When a principle is ambiguous or missing,
the agent proposes an addition rather than inventing an ad-hoc rule.

## Realm → agent map

| Realm | File | Aligned agent |
| ----- | ---- | ------------- |
| Design | [design.md](design.md) | `design-engineer` |
| Backend | [backend.md](backend.md) | `backend-engineer` |
| Frontend | [frontend.md](frontend.md) | `web-engineer` |
| Middleware | [middleware.md](middleware.md) | `architect` |
| Project Planning | [project-planning.md](project-planning.md) | `product-manager` |
| Business | [business.md](business.md) | `business-analyst` |
| Accessibility | [accessibility.md](accessibility.md) | `accessibility-reviewer` |
| Process | [process.md](process.md) | `release-manager` |
| DevOps | [devops.md](devops.md) | `devops-engineer` |
| Testing | [testing.md](testing.md) | `qa-tester` |
| Featuring | [featuring.md](featuring.md) | `experimentation-engineer` |
| Security | [security.md](security.md) | `security-reviewer` |
| Documentation | [documentation.md](documentation.md) | `docs-writer` |
| Performance | [performance.md](performance.md) | `performance-engineer` |
| Data & Analytics | [data-analytics.md](data-analytics.md) | `data-engineer` |
| Architecture | [architecture.md](architecture.md) | `architect` |
| Localization | [localization.md](localization.md) | `localization-engineer` |
| Compliance | [compliance.md](compliance.md) | `compliance-specialist` |
| AI | [ai.md](ai.md) | `ai-ops-engineer` |

## Shared practice (applies to every agent)

1. **Principles are the source of truth.** When work touches a realm, follow that realm's
   file. Cross-cutting work follows every realm it touches.
2. **Cite the principle.** When a decision is driven by a principle, name it.
3. **Propose, don't improvise.** Missing or unclear principle? Draft an addition in the
   realm file and flag it for the owner instead of acting on an unwritten rule.
4. **Keep the tree honest.** Principles must stay short, testable, and specific. Remove
   or split any that drift into vague aspiration.
