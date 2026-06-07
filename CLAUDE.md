# Instructions for Claude

## What this app is

A browser-only SPA that converts Modbus register-map spreadsheets into
device-platform template files, via a 4-step wizard: **Import → Map → Edit →
Preview/Export**. It is a port of an earlier Tkinter desktop tool; the
**Argos `ControllerTemplate` XML** output is the first of an extensible set
of "variant" formats. No backend, nothing
leaves the browser. Full depth lives in `OVERVIEW.md` (technical), `README.md`
(how it works + how to add a variant), `PRODUCT.md` (audience, voice), and
`DESIGN.md` (visual system). This file is the map to those, plus the gotchas
that aren't written down anywhere else.

## Architecture and module locations

- **`src/App.tsx`**: the state owner. Holds `grid`, `mapping`, `defaults`,
  `groups`, `variant`, `meta`, `pointErrors`, `xml`, the `uid()` id counter,
  and the step-transition/validation gate.
- **`src/core/variants/`**: the variant-bundle system. `types.ts` declares
  the `VariantBundle` interface (`id`, `label`, `fields`, `metadata`,
  `spreadsheetColumns`, `hierarchy`, `aliases`, `bulkEditSchema?`, `output`,
  `sample?`, `validateRow`, `serialize`, optional `parse`); `output:
  OutputFormat` (`label`, `extension`, `mimeType`, `syntax: 'xml' | 'plain'`)
  is what lets the Preview step render/label/export non-XML formats without
  hardcoding XML. `registry.ts` exports `VARIANTS` / `DEFAULT_VARIANT`.
  Two bundles are registered:
  - `argos/`: `buildXml`, `fields`, `format`, `mapping`, `parseXml`,
    `prepareRows`, `transforms`, `validate`, plus `__tests__/` (parity +
    groups suites). The original ANPL/XML port; output is XML, locked
    byte-for-byte to the Python reference.
  - `kepware/`: `buildCsv`, `fields`, `format`, `validate`, plus
    `__tests__/` (its own parity suite). A flat tag-import CSV target with
    no Python oracle (a new format, not a port) - its suite instead locks
    the serializer to itself (deterministic, byte-for-byte stable across
    runs on a fixed input). It declares no `parse` (a flat CSV can't carry
    template metadata back in).
- **`src/core/row.ts`**: the generic shapes every variant's data passes
  through, regardless of output target: `CellValue`, `Row`
  (`Record<fieldKey, string>`), `Group` (`{name, points}`), `isNa`.
- **`src/io/`**: `readSpreadsheet` (PapaParse for `.csv`, ExcelJS for
  `.xlsx`), producing a raw `CellValue[][]` grid mirroring
  `pandas.read_*(header=None, dtype=str)`.
- **`src/steps/`**: the four wizard views: `ImportStep`, `MappingStep`,
  `EditStep` (the big one, drag-and-drop editing via `@dnd-kit`, plus a
  multi-select mode for bulk edit/delete), `PreviewStep`.
- **`src/components/`**: `HelpModal`, `FeedbackModal`, `StepHeader`,
  `CodePreview` (generic XML/plain-text preview pane; renamed from
  `XmlPreview` when Kepware's CSV output needed a non-XML preview), `CpuIcon`.
- **`src/hooks/useTheme.ts`**: Amber Terminal/Daylight theme toggle.
- **`src/tokens.css`**: OKLCH design tokens; **`src/index.css`**: everything
  else (component styles, modal shells, type scale).

## The pipeline (locked by parity tests)

`readSpreadsheet → fileColsOf/detectHeaderRow → autoMap → prepareRows → buildXml`

`src/core/variants/argos/__tests__/parity.test.ts` asserts the TS output
matches a set of pre-generated fixtures
(`src/core/__tests__/fixtures/parity.json`) byte-for-byte. **Don't simplify
or "clean up" `format.ts`** (`pyRound`,
`formatG`, `pyInt`/`pyFloat`, `xmlEscape`): their exact, sometimes-quirky
behavior (Python-style rounding, `%g`-style formatting, `%` escaped to
`%25`) is the contract the fixtures lock in, not an implementation detail.

`ARGOS_FIELDS` (`src/core/variants/argos/fields.ts`) is the canonical 10-field
schema: `point_name, register_index, group_name, register_type, data_format,
unit, scaling, decimals, min_val, max_val`.

## Important gotchas

- **Dual ID counters can collide.** `App.tsx:35` (`_idCounter`, starts at 0)
  and `EditStep.tsx:28` (`_idCtr`, starts at 1000) both mint string ids for
  React keys and drag-and-drop. Importing more than roughly 1000 combined
  groups and points in one session can produce duplicate ids. Known, not yet
  fixed; be aware of it if you touch id generation in either file.
- **Conditional transforms are column-name-gated, not field-gated.**
  `prepareRows.ts` only applies the hex-address parse when the mapped source
  column is the literal ANPL name `Address(0x)`, and only inverts
  coefficient to scaling when the mapped column is `Coefficient`
  (see `isCoefficientCol` at `prepareRows.ts:30`). A generic spreadsheet with
  a plain `Scaling` column must NOT trigger the inversion: don't refactor this
  to key on the field instead of the source column name.
- **XML export specifics** (`buildXml.ts`): `id`/`uid` attributes are always
  reset to `"0"` (the platform assigns real ids on import); empty groups are
  omitted from the output but reported via `omittedGroups`; `scaling` is
  omitted entirely when its value is `"1"`; literal `%` is escaped to `%25`.
  Output must match Python `xml.dom.minidom.toprettyxml(indent="   ")`
  byte-for-byte, including whitespace.
- **Validation gates the Edit to Preview transition.** `generate()` in
  `App.tsx` runs `variant.validateRow` over every point, sets `pointErrors`,
  and blocks the transition while any row is invalid.
- **`prepareRows` is hardcoded to `ARGOS_FIELDS`, for every variant.**
  `App.tsx` imports it directly from `argos/` (the "import-path wrinkle" -
  see README's "Adding a new output variant"), and it iterates
  `ARGOS_FIELDS` (`prepareRows.ts:63`) regardless of which variant is
  selected. That means the canonical `Row` the spreadsheet-import path
  produces is *always* keyed by Argos's field keys (`point_name`,
  `point_type`, `register_index`, `group_name`, `register_type`,
  `data_format`, `unit`, `scaling`, `decimals`, `min_val`, `max_val`). Any
  new variant's `fields` array must reuse a subset of those same keys (not
  invent its own) for the shared import pipeline to populate it correctly -
  this is exactly what `kepware/fields.ts` does (it reuses 8 of the 11 keys
  and omits `decimals`/`min_val`/`max_val`, which its CSV has no columns for).
- **`EditStep.tsx` cross-group drag moves** happen in `onDragOver`, not
  `onDragEnd`: if you touch the `@dnd-kit` wiring, that's where a point
  changes group mid-drag.

## Coding standards

- TypeScript strict mode (`tsconfig.app.json`). `npm run build` runs
  `tsc --noEmit && vite build`, so type errors fail the build.
- `deslop/rules/arch.yaml` enforces two structural gates checked by
  `npm run deslop:check`: **feature-isolation** (no feature imports another
  feature transitively) and **no-tests-in-prod** (production code never
  imports test utilities, even transitively).
- Adding a new output format means writing one self-contained bundle under
  `src/core/variants/<id>/` and registering it in `registry.ts`; see
  `README.md` ("Adding a new output variant") for the full checklist,
  including the import-path wrinkle (`fileColsOf`, `prepareRows`, and the
  ANPL transforms currently live under `argos/` and aren't yet generalized
  behind the bundle interface).

## Design system

"Amber Terminal" (dark) and "Amber Daylight" (light): IBM Plex Mono
throughout, **0px border-radius** (sharp corners, no exceptions), OKLCH amber
tokens in `src/tokens.css` (`--c-bg`, `--c-surface`, `--c-border`, `--c-ink`,
`--c-muted`, `--c-accent`, `--c-danger`, and friends). **The One Amber Rule**:
amber signals interactive or active state only, never decoration. New UI
should be modeled on existing components (`HelpModal` is the reference for
modal shells, type scale, and spacing); match computed styles rather than
eyeballing them. Full rationale and palette live in `DESIGN.md`.

## Writing style

- **No em dashes (—) anywhere**: not in code, comments, docs, commit messages,
  or UI copy. Use commas, colons, semicolons, periods, or parentheses instead.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server (HMR), `http://localhost:5173` |
| `npm test` | Parity test suite (vitest); about 60s |
| `npm run type-check` | `tsc --noEmit` |
| `npm run build` | Type-check, then production build to `dist/` |
| `npm run deslop:check` | Architecture quality gates (interactive, needs a real terminal) |
