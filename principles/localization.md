# Principles — Localization

> **Status:** Draft · **Owner:** _you_ · **Aligned agent:** `localization-engineer`
>
> This file is authored in a dedicated worktree session. Fill in the tree below.
> Keep each principle short, testable, and specific to this realm.

## Purpose

This realm governs how JRM Studio makes every product correct and natural in every supported
locale. It owns the shared internationalization contract — locale catalogs, terminology,
message format, and locale-aware formatting — so that `@jrm` packages and the product apps
that consume them (Next.js, Svelte, Gradle+Turbo) all localize the same way, with no
hardcoded, framework-specific, or per-app divergence.

## Principles

### 1. No user-facing string is hardcoded

- **Statement:** Every user-facing string is a catalog key resolved at runtime; never inline
  literal copy in components, templates, or resource files.
- **Why:** Hardcoded strings can't be translated, reviewed, or QA'd per locale, and they leak
  English grammar into every app. A key is the only translatable, testable unit.
- **In practice:** Copy lives in `config/i18n/` catalogs keyed by stable, semantic IDs
  (e.g. `recipe.card.saveButton`, not `save` or the English text). Components reference keys;
  a lint/CI check fails on literal user-facing text outside the catalog.
- **Anti-patterns:** `<button>Save</button>`; ternaries that pick between two English strings;
  toast/error text assembled inline; "temporary" English fallbacks shipped in components.

#### 1.1 Keys are stable and semantic

- **Statement:** Name keys by role and context, not by their current English value, and never
  reuse one key in two contexts.
- **Why:** Value-named keys churn on every copy edit; reused keys force one translation onto
  contexts that need different grammar, gender, or length.

#### 1.2 Source strings are translatable by construction

- **Statement:** Author source strings whole — no runtime concatenation, no hidden word order,
  no grammar built from code.
- **Why:** Concatenation and code-assembled sentences assume English syntax and break in
  locales with different order, agreement, or pluralization.

### 2. One source-of-truth catalog per locale

- **Statement:** Keep canonical keys, source text, translator notes/context, and translations
  in `config/i18n/`; every consuming app reads from this shared catalog, not its own copy.
- **Why:** Divergent per-app catalogs drift, duplicate terms, and re-translate the same copy.
  A single source keeps `@jrm` consumers consistent and auditable.
- **In practice:** A canonical source locale (`en`) defines the key set; other locales mirror
  it. Each entry carries context notes and, where useful, a screenshot reference. Catalog
  format is fixed here and only overridden by a product repo's `AGENTS.md`.
- **Anti-patterns:** Strings duplicated into an app's local resource files; a locale catalog
  with keys the source locale doesn't have; translations edited without their context note.

### 3. Explicit fallback, never a silent blank

- **Statement:** Resolve a missing translation through a defined fallback chain
  (locale → base language → source locale) and surface untranslated keys, never an empty UI.
- **Why:** Silent blanks and raw key IDs shipped to users are worse than a legible fallback,
  and hidden gaps never get fixed.
- **In practice:** A documented fallback order; missing-key reporting in CI and dev; new source
  keys are visible as "untranslated" in every locale until filled, and CI blocks releases on
  untranslated keys in supported locales.
- **Anti-patterns:** Rendering `recipe.card.saveButton` to a user; empty string on a missing
  key; a locale silently 40% English with no report.

### 4. Plurals and gender use ICU MessageFormat, not code

- **Statement:** Express pluralization, gender, and conditional wording with ICU
  MessageFormat inside the string; keep that logic out of application code.
- **Why:** English `n === 1` logic is wrong for locales with zero/one/two/few/many/other.
  Only the translator can supply the correct categories, and only in the message.
- **In practice:** `{count, plural, one {# recipe} other {# recipes}}` in the catalog;
  translators provide every plural category their locale requires; interpolation is by named
  placeholder. Tests assert the right category renders for representative counts per locale.
- **Anti-patterns:** `count === 1 ? "recipe" : "recipes"` in a component; appending `"s"`;
  assuming two plural forms; positional `%s` interpolation whose order can't be reordered.

### 5. Placeholders are named, typed, and preserved

- **Statement:** Interpolate only through named placeholders, and require every translation to
  carry the exact placeholder set of its source string.
- **Why:** Placeholders are the contract between code and copy. A dropped, renamed, or
  extra placeholder is a runtime break or an untranslated hole — and a common injection vector.
- **In practice:** `{userName}`, `{amount}` by name so translators can reorder freely; CI
  validates placeholder parity between source and each translation; interpolated values are
  escaped by the i18n layer, never concatenated into markup.
- **Anti-patterns:** `Welcome {0}` where a locale needs the name later in the sentence; a
  translation missing `{amount}`; building HTML by string-joining a translated fragment.

### 6. Format dates, numbers, and currency by locale — never by hand

- **Statement:** Derive all dates, times, numbers, and currency from the active locale via the
  platform Intl/CLDR APIs; never hardcode separators, symbols, or ordering.
- **Why:** `1,000.50`, `1.000,50`, and `1 000,50` are all "correct"; hand-formatting picks one
  and is wrong everywhere else. Currency symbols are ambiguous across locales.
- **In practice:** `Intl.NumberFormat` / `Intl.DateTimeFormat` (or the app's shared wrapper)
  drive output; currency always carries its **ISO 4217** code (`USD`, `EUR`) and the amount is
  never divorced from it; dates use the locale calendar and format, not a fixed `MM/DD/YYYY`.
- **Anti-patterns:** `` `$${price}` ``; `date.toLocaleString("en-US")` pinned everywhere;
  splitting on `.` to read decimals; hardcoding `,` as the thousands separator.

### 7. Layout is direction-agnostic and RTL-verified

- **Statement:** Build layouts that mirror for right-to-left locales, and verify RTL with real
  bidirectional, mixed-numeral content before shipping a locale.
- **Why:** Arabic, Hebrew, and other RTL locales invert layout, iconography, and text flow;
  physical `left`/`right` assumptions break them and mixed LTR/RTL text mangles without care.
- **In practice:** `dir` is set from the locale; styling uses logical properties
  (`margin-inline-start`, not `margin-left`); directional icons flip; RTL is checked with
  strings that mix Arabic/Hebrew text and Latin numerals/brand names.
- **Anti-patterns:** `padding-left` hardcoded in a shared component; a chevron that points the
  wrong way in RTL; testing RTL only with LTR placeholder text.

### 8. Terminology is glossary-governed across locales

- **Statement:** Product terms follow a shared glossary that defines each term's meaning,
  approved translation, and forbidden translations; keep them consistent across every surface.
- **Why:** Inconsistent terms ("recipe" vs "dish", "score" vs "points") confuse users and
  fracture the brand; verbs that drift across surfaces make actions feel unrelated.
- **In practice:** A glossary in `config/i18n/` (or `docs/i18n/`) lists source term, context,
  approved per-locale translation, and do-not-translate terms (brand names, `@jrm`); translation
  QA checks copy against it.
- **Anti-patterns:** The same object called three names across apps; translating a brand name;
  a new action verb invented per screen.

### 9. Translation ships through a reviewed workflow

- **Statement:** Route source changes through the workflow — extract keys, provide context,
  translate, human-review, then verify — and never machine-translate shipped copy without
  human review.
- **Why:** Localization quality is a process property. Un-reviewed MT ships subtly wrong,
  offensive, or off-brand copy; skipping context forces translators to guess.
- **In practice:** New/changed source keys are extracted with notes and screenshots; MT may
  seed drafts but human review gates shipped user-facing copy; pre-push and CI run localization
  validation (placeholder parity, plural categories, untranslated keys, glossary) before merge.
- **Anti-patterns:** Committing raw MT to a supported locale; adding keys with no context;
  merging with untranslated keys or failing localization checks.

## Aligned agent

`localization-engineer` — this specialist should treat the principles above as binding practice
when working in this realm.

## Related realms

- **[Design](design.md)** (`design-engineer`) — components must leave room for text expansion
  and support RTL mirroring; localization consumes the shared token/component contract.
- **[Frontend](frontend.md)** (`web-engineer`) — wires the i18n runtime, `dir`/`lang`, and
  Intl formatting into each app; must not hardcode strings or re-implement catalogs.
- **[Accessibility](accessibility.md)** (`accessibility-reviewer`) — `lang`/`dir`, screen-reader
  reading order, and legible fallbacks overlap directly with localization.
- **[Content/Documentation](documentation.md)** (`docs-writer`) — source copy authored to be
  translatable (no concatenation, glossary-consistent) starts here.
- **[Compliance](compliance.md)** (`compliance-specialist`) — locale-specific legal copy,
  currency, and regional requirements hand off from this realm.
- **[Testing](testing.md)** (`qa-tester`) — localization validation (placeholder parity, plural
  categories, untranslated keys, RTL) runs as part of the shared test/CI gates.
