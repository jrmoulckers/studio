# Studio principles — Localization UX

> **Ratification:** Each principle's `Status` becomes effective only when the repository owner
> merges the covering Ratification decision record; before that merge, the candidate change is
> proposed and non-normative.
>
> Owner-ratified Studio design authority superseding the UI-facing part of the removed legacy
> localization guidance. Every disposition stays traceable in the final
> [migration ledger](../migration-ledger.json). Legacy inputs are cited by stable
> `<realm>#<n>` ID.

## Purpose

This area governs the user-facing locale behavior Studio owns: layouts that absorb translated
text, bidirectional and RTL correctness, and locale-aware UI behavior. It explicitly hands the
catalog, tooling, terminology, formatting, and compliance mechanisms to their canonical owners.

## Principles

### STUDIO-L10N-001 — UI absorbs text expansion and bidirectional content

- **Status:** Ratified
- **Statement:** Design components and type/spacing scales to tolerate translated string lengths and mixed bidirectional content without truncation, overlap, or clipping, and verify with representative long and mixed-script strings.
- **Rationale:** Translated copy varies widely in length and mixes scripts and numerals; a layout tuned to English width breaks the moment a longer or bidirectional string arrives.
- **Verification:** Representative expanded and mixed LTR/RTL strings render without truncation, overlap, or clipping across components; the check uses real bidirectional content, not LTR placeholder text.
- **Ratification owner:** repository owner
- **Implementation owner:** localization-engineer
- **Handoffs:** The type/spacing scale itself is the token tier in [tokens and themes](../design/tokens-and-themes.md); translation catalogs and source-string authoring are Product and its i18n owners.
- **Legacy inputs:** localization#7

### STUDIO-L10N-002 — Layout mirrors for RTL and behaves by locale

- **Status:** Ratified
- **Statement:** Build direction-agnostic layouts using logical properties that mirror for right-to-left locales, flip directional iconography, set document direction from the active locale, and verify RTL with real bidirectional, mixed-numeral content before shipping a locale.
- **Rationale:** RTL locales invert layout, iconography, and text flow; physical left/right assumptions break them, and mixed LTR/RTL text mangles without deliberate handling.
- **Verification:** Styling uses logical properties (not physical `left`/`right`); `dir` is set from locale; directional icons flip; RTL is checked with strings mixing RTL text and Latin numerals/brand names.
- **Ratification owner:** repository owner
- **Implementation owner:** localization-engineer
- **Handoffs:** `lang`/`dir` on the document is coordinated with [interaction](interaction.md) native semantics; the i18n runtime that resolves the active locale is Engineering.
- **Legacy inputs:** localization#7

### STUDIO-L10N-003 — Localization mechanisms hand off to their owners

- **Status:** Ratified
- **Statement:** Keep Studio's ownership to the user-facing locale UX, and route translation catalogs, translation tooling and workflow, terminology governance, locale formatting mechanisms, and compliance wording to their canonical authorities rather than defining them in Studio.
- **Rationale:** The legacy localization realm mixed Studio UX with Product content operations, Engineering mechanisms, and compliance obligations; after ADR-0003 Studio owns only the user-facing expression, and restating the rest here would create false ownership and drift.
- **Verification:** No Studio localization principle defines catalog format, translation workflow, terminology glossary governance, Intl/date/number/currency formatting mechanisms, or compliance copy; each is referenced by its owning authority.
- **Ratification owner:** repository owner
- **Implementation owner:** localization-engineer
- **Handoffs:** Catalogs, terminology governance, and compliance wording are Product; the i18n runtime, Intl/CLDR formatting, catalog tooling, and CI localization checks are Engineering; `.github` owns any localization automation.
- **Legacy inputs:** localization#1, localization#2, localization#6, localization#8, localization#9

## Related material

- [Interaction](interaction.md) and [Accessibility](accessibility.md) share `lang`/`dir`,
  reading order, and legible-fallback concerns.
- [Tokens and themes](../design/tokens-and-themes.md) owns the scales that must absorb expansion.
