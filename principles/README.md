# JRM Studio — Principles

A single, standard practice for how we build JRM Studio, organized as a **tree by realm**.
Each realm below is authored in its own dedicated worktree session. The authoritative
canonical-agent mapping, local paths, risks, and handoffs live in
[`AGENTS.md`](AGENTS.md).

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

**Write principles that instruct, not principles that diagnose.** A principle naming a failure
mode explains an incident; a principle naming what to do instead survives contact with the next
one. Where a finding is stated as a diagnosis, convert it before recording it — "a checksum
invariant under the error class it is trusted to catch is worse than none" becomes "before quoting
a reconciliation as reassurance, name a defect it would have caught." Both are true and only the
second tells a reader what to do. The same rule applies to guards: a check that says what to do
when it fires outranks one that only says what went wrong.

## The realm tree

| #   | Realm            | File                                       |
| --- | ---------------- | ------------------------------------------ |
| 1   | Design           | [design.md](design.md)                     |
| 2   | Backend          | [backend.md](backend.md)                   |
| 3   | Frontend         | [frontend.md](frontend.md)                 |
| 4   | Middleware       | [middleware.md](middleware.md)             |
| 5   | Project Planning | [project-planning.md](project-planning.md) |
| 6   | Business         | [business.md](business.md)                 |
| 7   | Accessibility    | [accessibility.md](accessibility.md)       |
| 8   | Process          | [process.md](process.md)                   |
| 9   | DevOps           | [devops.md](devops.md)                     |
| 10  | Testing          | [testing.md](testing.md)                   |
| 11  | Featuring        | [featuring.md](featuring.md)               |
| 12  | Security         | [security.md](security.md)                 |
| 13  | Documentation    | [documentation.md](documentation.md)       |
| 14  | Performance      | [performance.md](performance.md)           |
| 15  | Data & Analytics | [data-analytics.md](data-analytics.md)     |
| 16  | Architecture     | [architecture.md](architecture.md)         |
| 17  | Localization     | [localization.md](localization.md)         |
| 18  | Compliance       | [compliance.md](compliance.md)             |
| 19  | AI Products      | [ai-products.md](ai-products.md)           |
| 20  | AI Process       | [ai-process.md](ai-process.md)             |
| 21  | Local-First      | [local-first.md](local-first.md)           |

## Status

All realm files start as **Draft** and are authored in dedicated worktree sessions.
A realm is **Ratified** once its principle tree is filled in and reviewed.
