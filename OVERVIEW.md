# Modbus Template Builder: Technical Overview

A browser-based tool that converts Modbus register map spreadsheets into
device-platform template files. **Argos `ControllerTemplate` XML** was the
first supported output format; **Kepware tag-import CSV** is the second.
Both are built on an extensible per-variant architecture so additional
formats (Ignition, WebSupervisor, etc.) can be added without touching the
conversion pipeline. No backend, no install, no data leaves the browser.

---

## The problem it solves

When commissioning a Modbus device, you typically receive a vendor-supplied
register map: a spreadsheet with hundreds of rows describing addresses,
data types, scaling factors, and engineering units. Turning that into a
correctly formatted Argos XML template by hand is tedious and error-prone.
This tool automates that conversion in a four-step wizard.

It also handles the reverse path: load an existing template XML, edit it in
a spreadsheet-style table, and re-export; useful for maintaining a library
of templates across firmware versions or device variants.

---

## Workflow

```
Import → Map → Edit → Preview / Export
```

**Step 1: Import**
Pick an **output format** from the dropdown ("Argos" or "Kepware" today -
the picker exists so additional formats can be added later without changing
this flow). Beside the dropdown, **Sample input** and **Sample output**
download a small representative spreadsheet and a snippet of the selected
format's generated output, respectively, so you can see what you're getting
into on both ends before importing anything (sample output is only offered
for formats that declare one via `sample`). Then drop or
browse a `.csv` or `.xlsx` register map (or an existing `.xml` template to
skip straight to editing - only formats that declare a `parse` step support
this path; Kepware doesn't, since a flat CSV can't round-trip the same
template metadata an XML file carries).
Header row detection is automatic: the parser scans the first six rows for
a row containing both a name column and an address column, so metadata
rows above the header are handled without manual intervention.

**Step 2: Map**
Each field declared by the selected output format is matched to a column in
your spreadsheet (for Argos, the 10 canonical register fields).
Auto-mapping runs first: it normalises column names (lowercase, strip
spaces/underscores) and checks them against a table of 52 known aliases
before falling back to fuzzy substring matching. In most cases all
required fields are mapped before the user touches anything.

Unmapped fields accept a default value that applies to every row; useful
for setting a blanket register type or data format when the source
spreadsheet lacks that column.

**Step 3: Edit**
Extracted rows are displayed in an editable table. Every cell is live:
click to edit, with inline validation on blur. Invalid cells highlight
in red; hovering shows the specific error. Additional controls:

- Shift all register addresses by ±1 (useful when vendor maps are 0-indexed
  and the platform expects 1-indexed, or vice versa)
- Search rows by any cell value, across every field (including columns
  currently hidden from view)
- Toggle which optional columns are shown via the "Columns ▾" menu - a
  pure declutter control with no effect on the underlying data or the
  exported output
- Clear a column's data everywhere via the small "×" in its header - a
  destructive, confirmed action distinct from hiding it (mirrors the
  per-row delete, which is also unconditional)
- Delete individual rows
- **Select multiple** (toolbar button beside the address shift controls):
  switches into multi-select mode, where a banner explains that you select
  rows by clicking and dragging across their checkboxes specifically (not
  anywhere in the row, to avoid colliding with the existing row drag-reorder
  gesture). With one or more rows checked, **Edit** opens a bulk-edit dialog
  that overwrites a chosen field (from the format's `bulkEditSchema`, e.g.
  Register Type, Data Format, Scaling, Unit, Group) across every selected
  row at once, and **Delete** removes them all after a single confirmation.
  **OK** exits multi-select mode. (Point Name and Address never appear in
  the bulk-edit field list - they're unique per row, so a bulk overwrite
  would create duplicates.)
- Fill in the template-level metadata fields the selected format declares
  (for Argos: Template Name and Version, which end up as attributes on the
  exported `<ControllerTemplate>`; Kepware just takes a Template Name, used
  for the exported filename since its flat CSV has no template-level shape
  to carry one)

**Step 4: Preview / Export**
Output rendered through a format-aware preview (XML gets syntax
highlighting; Kepware's CSV renders as plain text) with a point and group
count summary. One-click copy to clipboard or download as a named file
(`.xml` for Argos, `.csv` for Kepware - the extension, MIME type, and label
all come from the variant's declared `output` shape); a Spreadsheet view and
`.xlsx` export are also available, using the columns the selected format
declares.

A small **`✉`** button sits in the header, beside the theme toggle and the
help icon, on every step. It opens a dialog describing three kinds of message worth
sending (general feedback, bug reports, and requests for a new output
variant), each with a short note on what context to include, plus a single
shared footer with a clickable `[feedback.mtb@bynet.dev]` mailto link and a
"Copy address" button, so the right context reaches the maintainer with no
backend involved.

---

## Column auto-mapping

The mapper normalises column names by lowercasing and stripping spaces and
underscores, then checks against a 52-entry alias table. If no exact alias
match is found, it falls back to case-insensitive substring matching against
both the field key and its human label.

Selected aliases per field:

| Field | Primary name | Recognised aliases (sample) |
|---|---|---|
| Point Name | Name | Point Name, Description, Tag Name, Signal Name |
| Register Address | Address(0x) | Address, Addr, Register, Register Index, Modbus Address, Modbus Register |
| Register Type | Attribute | Attr, Register Type, Reg. Type, Function Code |
| Data Format | Data Format | Data Type, Dtype, Format, Type, Word Format, Value Type |
| Scaling | Coefficient | Coeff, Scaling, Scaling Factor, Factor, Multiplier, Gain |
| Unit | Unit | Units, Engineering Unit, EU |
| Decimals | Decimals | Decimal, Decimal Places, Decimal Points, Precision |
| Group | Group | Group Name, Category, Section |
| Min | Min | Min Value, Minimum, Low Limit, Low Range |
| Max | Max | Max Value, Maximum, High Limit, High Range |

Matching is case-insensitive and ignores spaces, so `RegisterAddress`,
`register address`, and `REGISTER_ADDRESS` all resolve to the same field.

---

## Data transforms

When the source spreadsheet uses the ANPL register map convention, two
transforms are applied automatically:

**Hex address parsing:** Addresses are stored as hex strings (e.g. `0x006A`,
`006A~006B`). The parser strips the `0x` prefix, handles optional sign,
and takes only the first value from a range (`~`-delimited), converting
to a decimal integer.

**Coefficient to Scaling inversion:** ANPL stores a coefficient (inverse of
scaling), e.g. `0.1` meaning "divide the raw value by 10". The builder
inverts this to the scaling factor expected by Argos (`10`) and also
derives the appropriate decimal places from the magnitude of the
coefficient (e.g. `0.001` → scaling `1000`, decimals `3`).

Both transforms are detected automatically based on which column name was
matched; they apply only when the source column is the canonical ANPL name,
so generic spreadsheets with a plain `Scaling` column are not affected.

---

## Validation

Before generating output, every row is validated against the rules the
selected format declares (`variant.validateRow`). For Argos:

- Point Name and Register Address: required, non-empty
- Register Address: non-negative integer
- Data Format: must be one of `U16 S16 U32 S32 U64 Float Bool`
- Register Type: must be one of `Holding Input Coil Discrete`
- Point Type: must be one of `ShowValue ShowEnum SetValue SetValueWO SetEnum`
- Scaling: must be a valid number
- Decimals: integer in range 0–9
- Min / Max: must be valid numbers if present

Kepware shares the Point Name / Register Address / Data Format / Register
Type / Point Type / Scaling rules above (it has no Decimals, Min, or Max
fields to validate), plus one rule of its own: **Scaling cannot be zero**,
since the CSV's Scaled High column is `32767 / scaling`.

Validation errors are shown per-cell with a tooltip explaining the specific
problem. The transition to Preview is blocked until all errors are resolved.

---

## Argos XML output format

```xml
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<ControllerTemplate encoding="UTF-8" name="My Template" uid="0" version="1.0">
   <Group id="0" name="Default Group" uid="0">
      <Point id="0" name="Voltage L1" unit="V">
         <Type>ShowValue</Type>
         <Address format="U16" type="Holding" index="100"/>
         <Calculate decimals="2" scaling="10"/>
         <Enum/>
      </Point>
   </Group>
</ControllerTemplate>
```

Points are grouped by the Group field value. Group and point ordering
follows the row order from the source spreadsheet. `id` and `uid` attributes
are always reset to `0` on export (the platform assigns real IDs at import
time). The output is byte-for-byte identical to what the reference Python
desktop tool produces for the same input.

---

## Kepware CSV output format

Kepware tag-import CSVs are flat: one header row, then one row per point, in
group order then row order. The Group field organises the Edit screen but is
never written out, and empty groups are silently skipped (consistent with
Argos's omitted-group handling).

```csv
Tag Name,Address,Data Type,Respect Data Type,Client Access,Scan Rate,Scaling,Raw Low,Raw High,Scaled Low,Scaled High,Scaled Data Type,Clamp Low,Clamp High,Engineering Units,Description
Voltage L1,400101,Word,1,RO,100,Linear,0,32767,0,3276.7,Float,1,1,V,
Current L1,400111,Short,1,RO,100,,,,,,,,,,
Power,400131,DWord,1,RO,100,,,,,,,,,,
```

A few columns are derived rather than copied straight from the edited row:

- **Address** - the register address is converted to Kepware's 6-digit
  Modbus form: `offset_base + address`, zero-padded to 6 digits, where the
  offset base is `Holding 400001`, `Input 300001`, `Coil 000001`, or
  `Discrete 100001` (e.g. address `100` on a Holding register → `400101`).
- **Data Type** - the edited Data Format maps to a Kepware type name:
  `U16→Word, S16→Short, U32→DWord, S32→Long, Float→Float, U64→QWord, Bool→Boolean`.
- **Client Access** - the edited Point Type maps to a Kepware access mode:
  `ShowValue/ShowEnum→RO, SetValue/SetEnum→RW, SetValueWO→WO`.
- **Respect Data Type** and **Scan Rate** are constant (`1` and `100`).
- **Scaling and the Raw/Scaled/Clamp columns** are populated only when the
  edited Scaling is not `1`: `Scaling=Linear`, `Raw Low/High=0/32767`,
  `Scaled Low=0`, `Scaled High=32767 / scaling`, `Scaled Data Type=Float`,
  `Clamp Low/High=1`. Unscaled points leave all of these blank.
- **Engineering Units** carries the edited Unit (blank if empty);
  **Description** is always blank (the format has no source for it).

Unlike Argos, Kepware is a new format with no Python reference to match -
its own test suite (see "Parity tests" in [README.md](README.md)) locks
the *serializer to itself*, asserting it's byte-for-byte stable across runs
rather than matching an external oracle. It also has no template-level XML
root, so its `metadata` is just a Template Name used for the exported
filename, and it declares no `parse` (a flat CSV can't carry the same
template shape back in).

---

## Output format ("variant") architecture

Each supported output format is a **self-contained bundle** declared in
`src/core/variants/`: it specifies its own row/point field schema and types,
validation rules, template-level metadata shape (label + input type per
field - string, number, or date), spreadsheet column layout, and a
serializer that turns the edited data into the final file. The Import-step
dropdown selects one of these bundles before any data is loaded, so every
later step (column mapping, validation, the Edit screen's metadata inputs,
the generated output) is driven generically by the chosen bundle rather than
hardcoded to one format.

Argos and Kepware are the two registered bundles. Argos's XML schema, field
list, validation, and serialization are exactly what this tool already
produced, just wrapped behind the bundle interface (zero behavior change,
verified byte-for-byte against the parity suite). Kepware was added after it,
following the same structure - reusing Argos's canonical field keys (so the
shared import pipeline populates it correctly), declaring its own CSV
serializer, validation, bulk-edit schema, and output shape, and shipping its
own self-locking test suite. Adding support for another platform means
writing one new bundle file and registering it; the wizard, mapping UI,
validation gate, and preview/export screens require no changes.

---

## Technical stack

| Concern | Technology |
|---|---|
| Framework | React 19 |
| Build | Vite 7 + TypeScript |
| Spreadsheet parsing | PapaParse (`.csv`) + ExcelJS (`.xlsx`) |
| Column mapping UI | react-select |
| Styling | Custom CSS (no framework) |
| Runtime | Browser only (zero backend) |

The entire conversion pipeline (header detection, column mapping, row
extraction, data transforms, validation, XML serialisation) runs in the
browser. No data is transmitted anywhere.

The TypeScript implementation is a direct port of an earlier Python reference
tool. A parity test suite asserts that the TS output matches a set of
representative fixtures byte-for-byte, including edge cases in the
coefficient inversion and hex address
parsing logic.

---

## Running locally

Requires Node ≥ 20.19.

```bash
npm install
npm run dev        # Vite dev server → http://localhost:5173
npm run build      # Production build → dist/
npm test           # Parity test suite (vitest)
```

---

## Deployment

The build output (`dist/`) is a fully static SPA: `index.html` plus
versioned JS/CSS assets. It can be served from any static host:

- **DigitalOcean App Platform Static Site:** free tier, auto-deploy on push
- **Netlify / Vercel / GitHub Pages:** zero-config, connect the repo and
  point the build command at `npm run build` with output directory `dist`
- **nginx / any web server:** copy `dist/` to the server root; configure
  a catch-all to serve `index.html` for client-side routing

No environment variables, no server-side configuration, no database.

---

## Target users

**Field / commissioning technicians:** importing a vendor-supplied register
map on-site as part of a device setup job. The goal is to go from CSV to
deployable XML in under two minutes with no ambiguity about the output.

**Back-office / integration engineers:** maintaining a library of Modbus
templates, doing bulk edits, managing versions across device firmware
updates.

Both roles are technically literate and familiar with Modbus concepts. The
tool is designed to disappear into the task: no onboarding, no account, no
upload to a third-party server.
