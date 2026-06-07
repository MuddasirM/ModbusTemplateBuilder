# Modbus Template Builder

A browser port of an earlier Tkinter desktop app. Same 4-step wizard
(Import → Map → Edit → Preview), now fronted by an output-format picker on
the Import step. Each format is a self-contained "variant bundle"
(`src/core/variants/`) declaring its own field schema, validation, template
metadata, output shape, and serializer. Two are registered today: **Argos**
(`ControllerTemplate` XML), ported 1:1 from the original implementation and
locked to a byte-for-byte parity suite, and **Kepware** (a flat tag-import
CSV). The same XML-import path (skip straight to the editor) is preserved
for any variant that declares a `parse` step.

- **Stack:** React 19 + Vite 7 + TypeScript, IBM Plex Mono, ExcelJS, PapaParse, @dnd-kit.
- **Hosting:** static SPA (no backend). See [DEPLOY.md](DEPLOY.md).

## How it works

The wizard moves data through four steps, all driven by the selected
**variant bundle** (`src/core/variants/<id>/`, registered in
[`core/variants/registry.ts`](src/core/variants/registry.ts)):

1. **Import** - pick an output format, then drop a `.csv`/`.xlsx` register
   map, or (for variants that declare a `parse` step) an existing export to
   edit directly. `readSpreadsheet` (PapaParse for `.csv`, ExcelJS for
   `.xlsx`) produces a raw `CellValue[][]` grid mirroring
   `pandas.read_*(header=None, dtype=str)`: strings, with `null` for empty
   cells.
2. **Map** - `autoMap` matches each of the variant's declared `fields` to a
   column in that grid, first via the variant's alias table
   (`norm(columnName) → fieldKey`), then by fuzzy substring match against the
   field's key/label. Unmapped fields fall back to a per-field default value
   applied to every row.
3. **Edit** - `prepareRows` slices off the header row, walks the data rows,
   and emits the variant's canonical `Group[]` (each `{ name, points: Row[] }`,
   where `Row` is `Record<fieldKey, string>`). `App.tsx` wraps these in
   `GroupState`/`PointState` - adding stable string ids via the `uid()`
   counter for drag-and-drop and React keys - before handing them to
   `EditStep`. Cell edits mutate this state directly; `variant.validateRow(row)`
   runs on blur and gates the transition to Preview.
4. **Preview / Export** - `stateToCore` strips the ids back down to plain
   `Group[]`/`Row[]`. `variant.serialize(groups, meta)` turns that, plus the
   template-level `meta` (one value per declared `MetadataFieldDef`), into
   the final text. `PreviewStep` renders that text through `CodePreview`
   (XML syntax highlighting or plain text, per `variant.output.syntax`) and
   offers copy/download using the label/extension/MIME type the variant
   declares in `output: OutputFormat`, alongside a spreadsheet view and
   `.xlsx` export driven by `variant.spreadsheetColumns`.

Generic shapes - `CellValue`, `Row`, `Group`, `isNa` - live in
[`core/row.ts`](src/core/row.ts): the "prepared row" form every variant's
data passes through regardless of output target. Everything
variant-specific (field schema, validation, serialization, template
metadata, spreadsheet columns, and - for Argos - the ANPL row transforms)
lives under `core/variants/<id>/`.

A `✉` button in the header, beside the theme toggle and the help icon, opens
[`FeedbackModal`](src/components/FeedbackModal.tsx) on every step. It describes
three kinds of message worth sending (general feedback, bug reports, and
"request a new output variant"), each with a note on what to include, then
funnels all of them to one shared address via a clickable mailto link and a
copy-to-clipboard button, so format requests (the thing the dropdown above
can't surface on its own, since it only lists what's already registered)
reach the maintainer with no backend.

## Adding a new output variant

A new output target is, in principle, one bundle file plus a registry
entry: the wizard, mapping UI, validation gate, and Preview/Export screens
are all driven generically by the `VariantBundle` interface
([`core/variants/types.ts`](src/core/variants/types.ts)).

1. **Create `src/core/variants/<id>/`** and declare a `VariantBundle`:
   - `id`, `label` - shown in the Import step's output-format dropdown
   - `hierarchy` - `'nested'` (`Group[] → Row[]`, the only kind built today)
     or `'flat'` (reserved for a future ungrouped format)
   - `fields: FieldDef[]` - the editable register/point schema: `key`,
     `label`, `required`, `'text' | 'choice'` (+ `choices`), `default`, `width`
   - `aliases: Record<string, string>` - `norm(columnName) → fieldKey`, used
     by `autoMap` on import (see `norm`/`fuzzy` in
     [`argos/mapping.ts`](src/core/variants/argos/mapping.ts) for the exact
     normalisation your alias keys need to match)
   - `metadata: MetadataFieldDef[]` - template-level fields (e.g. name,
     version) rendered as inputs on the Edit screen and passed through to
     `serialize` as `meta`
   - `spreadsheetColumns: ColumnDef[]` - the column layout used by the
     Preview step's spreadsheet view and `.xlsx` export
   - `bulkEditSchema?: BulkEditField[]` - optional fields offered in the Edit
     step's bulk-edit modal (multi-row "Select multiple" → Edit), each a
     `dropdown` (with `options`), `text`, or `number` input keyed to a field;
     omit unique-per-row fields like point name/address (see Argos's and
     Kepware's bundles for the convention)
   - `output: OutputFormat` - `{ label, extension, mimeType, syntax }`
     describing the generated text, so the Preview step can render
     (`syntax: 'xml' | 'plain'`), label, and export it without assuming XML
   - `sample?: string` - a short, representative snippet of this variant's
     output, offered as a download via the Import step's "Sample output"
     button (alongside a "Sample input" button that downloads a sample
     register-map spreadsheet, the same for every variant since the import
     pipeline is shared) so users know what they'll get before committing to it
   - `validateRow(row): Record<string, string>` - per-row validation;
     return `{ fieldKey: errorMessage }` for each invalid cell (an empty
     object means the row is valid)
   - `serialize(groups, meta): string` - turn the edited data into the final
     output text, whatever the target platform expects (XML, JSON, CSV, ...)
   - `parse?(text)` - optional inverse of `serialize`, returning
     `{ groups, meta }`. Declare it to let users drop an existing export
     straight onto the Edit step, skipping Import/Map entirely; omit it and
     the XML-drop panel reports that the format doesn't support importing
     templates.

2. **Register it** in
   [`core/variants/registry.ts`](src/core/variants/registry.ts): add it to
   the `VARIANTS` array (and reassign `DEFAULT_VARIANT` if it should be
   selected by default).

3. **Mind the import-path wrinkle**: `fileColsOf`, `prepareRows` (header-row
   detection and row extraction), and the ANPL-specific hex-address /
   coefficient transforms currently live under `core/variants/argos/` and
   are imported directly by `App.tsx` - they are *not yet* behind the
   `VariantBundle` interface, simply because Argos has been the only
   registered variant so far. If your format's spreadsheet conventions are
   close enough to ANPL's, you can reuse these as-is; if they diverge (a
   different transform set, a different header-detection heuristic), this
   is the piece that needs generalising onto the bundle (e.g. a
   `prepareRows`/`detectHeaderRow` entry) before a second
   spreadsheet-importing variant can really go its own way.

For a worked example of locking a new serializer to a reference
implementation, see the parity suite in
[`core/variants/argos/__tests__/`](src/core/variants/argos/__tests__/) - it
asserts the TS port matches the Python oracle byte-for-byte (more on this
below, under [Parity tests](#parity-tests)).

## Run in a dev container (recommended)

The repo ships [.devcontainer/devcontainer.json](.devcontainer/devcontainer.json)
(Node 24). In VS Code:

1. Open the **`web/`** folder.
2. **Dev Containers: Reopen in Container** (Command Palette).
3. The `postCreateCommand` runs `npm install` and installs **Claude Code**.
4. In the container terminal:
   ```bash
   npm run dev
   ```
   Vite serves on **http://localhost:5173** (port auto-forwarded).

`claude` is on the PATH inside the container, and its login persists across
rebuilds (a volume is mounted at `/root/.claude`).

## Run without a dev container

Needs Node ≥ 20.19.
```bash
cd web
npm install
npm run dev        # http://localhost:5173
```

## Test it

1. **Spreadsheet path:** import `public/sample_anpl_register_map.csv` → auto-map →
   edit (try the −1 / +1 address shift, delete a row, hide a column) → Preview →
   Export.
2. **XML path:** import `../sample_argos_template.xml` → lands straight in the
   editor → bump addresses → Preview → confirm `id`/`uid` are reset to `0`.

> Spreadsheet import follows the **ANPL** format and requires a `No.` column;
> this matches the desktop app (a CSV without `No.` yields an empty template).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server (HMR) |
| `npm run build` | Type-check + production build → `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Run the parity test suite (vitest) |

## Parity tests

`src/core/variants/argos/__tests__/parity.test.ts` and `src/io/__tests__/readSpreadsheet.test.ts`
assert the TS port matches a set of pre-generated fixtures
(`src/core/__tests__/fixtures/parity.json`) byte-for-byte, locking the port
to the original implementation's exact output.

Kepware has no Python oracle to match (it's a new format, not a port), so
its suite (`src/core/variants/kepware/__tests__/parity.test.ts`, fixture in
`__tests__/fixtures/kepware.json`) instead locks the *TS serializer to
itself*: a small representative input (mixed register types, a scaled value,
a write tag, an unscaled value) must always serialize to the same
byte-for-byte CSV string.
