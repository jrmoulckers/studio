# Changesets

This directory holds [changesets](https://github.com/changesets/changesets) — one
markdown file per pending change describing which `@jrm/*` packages changed and how.

```bash
pnpm changeset            # author a changeset
pnpm version-packages     # apply changesets → bump versions + changelogs
```

> Publishing is **not** wired up yet. Every `@jrm/*` package is `private` and pinned to
> `0.0.0` until we turn on releases. Do not run `changeset publish`.
