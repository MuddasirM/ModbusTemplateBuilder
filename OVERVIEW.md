# Modbus Template Builder: Technical Overview

A browser-based tool that converts Modbus register map spreadsheets into
device-platform template files. **Argos `ControllerTemplate` XML is the
first supported output format**, built on an extensible per-variant
architecture so additional formats (Ignition, WebSupervisor, etc.) can be
added without touching the conversion pipeline. No backend, no install, no
data leaves the browser.

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
Pick an **output format** from the dropdown (today, "Argos" is the only
registered option - the picker exists so additional formats can be added
later without changing this flow). Then drop or browse a `.csv` or `.xlsx`
register map (or an existing `.xml` template to skip straight to editing -
only formats that declare a `parse` step support this path).
Header row detection is automatic: the parser scans the first six rows for
a row containing both a name column and an address column, so metadata
rows above the header are handled without manual intervention.

**Step 2: Map**
Each field declared by the selected output format is matched to a column in
your spreadsheet (for Argos, the 15 canonical register fields).
Auto-mapping runs first: it normalises column names (lowercase, strip
spaces/underscores) and checks them against a table of 139 known aliases
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
- Fill in the template-level metadata fields the selected format declares
  (for Argos: Template Name and Version - both end up as attributes on the
  exported `<ControllerTemplate>` element)

**Step 4: Preview / Export**
Syntax-highlighted output with a point and group count summary. One-click
copy to clipboard or download as a named file (for Argos, `.xml`); a
Spreadsheet view and `.xlsx` export are also available, using the columns
the selected format declares.

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
underscores, then checks against a 139-entry alias table. If no exact alias
match is found, it falls back to case-insensitive substring matching against
both the field key and its human label.

Selected aliases per field:

| Field | Primary name | Recognised aliases (sample) |
|---|---|---|
| Point Name | Name | Point Name, Description, Tag Name, Signal Name |
| Point Type | Presentation | Point Type, Tag Type |
| Register Address | Address(0x) | Address, Addr, Register, Register Index, Modbus Address, Modbus Register |
| Register Type | Attribute | Attr, Register Type, Reg. Type, Function Code |
| Data Format | Data Format | Data Type, Dtype, Format, Type, Word Format, Value Type |
| Scaling | Coefficient | Coeff, Scaling, Scaling Factor, Factor, Multiplier, Gain |
| Unit | Unit | Units, Engineering Unit, EU |
| Decimals | Decimals | Decimal, Decimal Places, Decimal Points, Precision |
| Group | Group | Group Name, Category, Section |
| Min | Min | Min Value, Minimum, Low Limit, Low Range |
| Max | Max | Max Value, Maximum, High Limit, High Range |
| Enumeration | Enumeration | Enum, Enum Values, Enum List, State Map, Value Map, States |
| Reg. Count | Reg. Count | Reg Count, Register Length, String Length, Num Registers, Length, Word Count |
| Bitmask | Bitmask | Mask, Bit Field, Bitmask Value, Bitmask Filter |
| Notes | Notes | Note, Comment, Comments, Remark, Remarks (display only, not in XML) |

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

Before generating XML, every row is validated:

- Point Name and Register Address: required, non-empty
- Register Address: non-negative integer
- Point Type: must be one of `ShowValue ShowEnum SetValue SetValueWO SetEnum` if set
- Data Format: must be one of `U16 S16 U32 S32 U64 Float Bool String` if set
- Register Type: must be one of `Holding Input Coil Discrete` if set
- Scaling: must be a valid number
- Decimals: integer in range 0-9
- Min / Max: must be valid numbers if present
- Enumeration: each item must follow `key=label` format with a non-negative integer key (warning, not a hard error)
- Reg. Count: positive integer if set; a warning is also raised when Data Format is `String` and Reg. Count is empty
- Bitmask: hex literal (e.g. `0x0001`) or plain integer if set; a warning is also raised when set alongside a non-enum Point Type

Validation errors (red) block export. Warnings (amber) are shown inline but do not block export.

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

Argos is the first and currently only registered bundle - its XML schema,
field list, validation, and serialization are exactly what this tool already
produced, just wrapped behind the bundle interface (zero behavior change,
verified byte-for-byte against the parity suite). Adding support for another
platform means writing one new bundle file and registering it; the wizard,
mapping UI, validation gate, and preview/export screens require no changes.

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
