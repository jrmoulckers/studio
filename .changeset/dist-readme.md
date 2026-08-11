---
'@jrm/tokens': minor
---

Ship a generated `dist/README.md` describing the distribution.

Consumers vendor `dist/` as a copied directory, so the `exports` map in the package
manifest never reaches them and the copy arrives as unlabelled generated files. The new
file is that map: it names the aggregate CSS entry point, records that `a11y.css` is not
imported for you, and states that this package owns the structural layer as well as the
colors.

It is rendered from `DIST_OUTPUTS`, so it cannot describe a file that is not shipped, and
an output added without a description fails rather than shipping unlabelled. The build and
distribution trees now have separate declaration guards, since they legitimately differ by
the generated files.
