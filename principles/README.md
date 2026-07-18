# JRM Studio — Principles

A single, standard practice for how we build JRM Studio, organized as a **tree by realm**.
Each realm below is authored in its own dedicated worktree session and is bound to a
specialist agent that must follow it (see [`AGENTS.md`](AGENTS.md)).

## How this is organized

```
principles/
├── README.md        ← you are here (index + tree)
├── AGENTS.md        ← realm → agent alignment + shared practice
├── _template.md     ← the authoring template each realm follows
└── <realm>.md       ← one file per realm (the principle tree for that realm)
```

Each realm file is a tree: top-level principles with optional sub-principles. Keep each
principle short, testable, and specific to its realm.

## The realm tree

| # | Realm | File | Aligned agent |
| - | ----- | ---- | ------------- |
| 1 | Design | [design.md](design.md) | `design-engineer` |
| 2 | Backend | [backend.md](backend.md) | `backend-engineer` |
| 3 | Frontend | [frontend.md](frontend.md) | `web-engineer` |
| 4 | Middleware | [middleware.md](middleware.md) | `architect` |
| 5 | Project Planning | [project-planning.md](project-planning.md) | `product-manager` |
| 6 | Business | [business.md](business.md) | `business-analyst` |
| 7 | Accessibility | [accessibility.md](accessibility.md) | `accessibility-reviewer` |
| 8 | Process | [process.md](process.md) | `release-manager` |
| 9 | DevOps | [devops.md](devops.md) | `devops-engineer` |
| 10 | Testing | [testing.md](testing.md) | `qa-tester` |
| 11 | Featuring | [featuring.md](featuring.md) | `experimentation-engineer` |
| 12 | Security | [security.md](security.md) | `security-reviewer` |
| 13 | Documentation | [documentation.md](documentation.md) | `docs-writer` |
| 14 | Performance | [performance.md](performance.md) | `performance-engineer` |
| 15 | Data & Analytics | [data-analytics.md](data-analytics.md) | `data-engineer` |
| 16 | Architecture | [architecture.md](architecture.md) | `architect` |
| 17 | Localization | [localization.md](localization.md) | `localization-engineer` |
| 18 | Compliance | [compliance.md](compliance.md) | `compliance-specialist` |

## Status

All realm files start as **Draft** and are authored in dedicated worktree sessions.
A realm is **Ratified** once its principle tree is filled in and reviewed.
