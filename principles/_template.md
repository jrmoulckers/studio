# Studio principle proposal template

> **Proposal:** Non-normative until the repository owner merges an explicit Ratification
> decision. Use this template in an issue or pull request description; do not create a new
> realm file or insert an unpinned block into the Ratified tree.
>
> Keep the stable area prefix and existing numbering model. Never reuse or renumber a
> published ID.

Use this block to shape the proposed principle:

```markdown
### STUDIO-<AREA>-<NNN> — <Principle title>

- **Status:** Draft
- **Statement:** <One imperative, testable rule.>
- **Rationale:** <Why the rule is durable and the cost of ignoring it.>
- **Verification:** <Observable evidence that proves compliance.>
- **Ratification owner:** repository owner
- **Implementation owner:** <canonical role>
- **Handoffs:** <stable IDs or canonical authority links; use `none` when absent>
- **Legacy inputs:** <comma-separated `<realm>#<n>` IDs, or `none`>
```

Before changing an existing file under `design/` or `experience/`, the implementation must
update the declared catalog, owner decision record, finalization receipt, independent
semantic pins, and negative fixtures together. `pnpm principles:check` intentionally rejects
an incomplete or self-baselined catalog change.

Reference Engineering, Product, and `.github` principles by stable ID and canonical link
instead of copying their text. Use `studio-legacy:*` inputs only for migration traceability.
