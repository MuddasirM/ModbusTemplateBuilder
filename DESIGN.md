---
name: Modbus Template Builder
description: Four-step web tool for converting Modbus register maps to Argos XML templates.
theme: amber-terminal
colors:
  bg: "oklch(0.07 0.010 60)"
  surface: "oklch(0.11 0.010 60)"
  surface-raised: "oklch(0.15 0.010 60)"
  border: "oklch(0.22 0.012 60)"
  border-muted: "oklch(0.16 0.008 60)"
  ink: "oklch(0.92 0.012 75)"
  ink-muted: "oklch(0.70 0.010 70)"
  ink-dim: "oklch(0.60 0.008 65)"
  primary: "oklch(0.75 0.18 75)"
  primary-deep: "oklch(0.60 0.18 72)"
  primary-hover: "oklch(0.82 0.16 78)"
  primary-subtle: "oklch(0.12 0.06 68)"
  danger: "oklch(0.70 0.18 25)"
  danger-subtle: "oklch(0.12 0.06 25)"
  success: "oklch(0.70 0.15 145)"
  success-subtle: "oklch(0.12 0.06 145)"
  warning: "oklch(0.75 0.16 75)"
  warning-subtle: "oklch(0.12 0.06 68)"
  code-tag: "oklch(0.72 0.12 258)"
  code-attr: "oklch(0.68 0.14 242)"
  code-val: "oklch(0.75 0.18 75)"
  code-proc: "oklch(0.52 0.05 60)"
typography:
  body:
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  title:
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  mono:
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
rounded:
  sm: "0px"
  md: "0px"
  lg: "0px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    borderColor: "{colors.primary-deep}"
    rounded: "{rounded.md}"
    padding: "5px 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-subtle}"
    textColor: "{colors.primary-hover}"
    borderColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "5px 14px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dim}"
    borderColor: "transparent"
    rounded: "{rounded.md}"
    padding: "5px 14px"
  button-ghost-hover:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    borderColor: "{colors.border}"
    rounded: "{rounded.md}"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.border}"
    rounded: "{rounded.sm}"
    padding: "5px 8px"
  input-field-focus:
    borderColor: "{colors.primary}"
    boxShadow: "0 0 0 1px {colors.primary-deep}"
  badge-success:
    backgroundColor: "{colors.success-subtle}"
    textColor: "{colors.success}"
    borderColor: "color-mix(in oklch, {colors.success} 40%, transparent)"
    padding: "2px 6px"
  badge-warning:
    backgroundColor: "{colors.warning-subtle}"
    textColor: "{colors.warning}"
    borderColor: "color-mix(in oklch, {colors.warning} 50%, transparent)"
    padding: "2px 6px"
light-theme:
  bg: "oklch(0.97 0.006 78)"
  surface: "oklch(0.93 0.007 75)"
  surface-raised: "oklch(0.89 0.009 72)"
  border: "oklch(0.76 0.013 68)"
  border-muted: "oklch(0.87 0.008 70)"
  ink: "oklch(0.14 0.016 55)"
  ink-muted: "oklch(0.32 0.012 58)"
  ink-dim: "oklch(0.40 0.010 60)"
  primary: "oklch(0.46 0.22 65)"
  primary-deep: "oklch(0.38 0.24 62)"
  primary-hover: "oklch(0.42 0.23 64)"
  primary-subtle: "oklch(0.93 0.06 76)"
  danger: "oklch(0.50 0.22 25)"
  danger-subtle: "oklch(0.96 0.04 22)"
  success: "oklch(0.40 0.18 145)"
  success-subtle: "oklch(0.90 0.06 145)"
  warning: "oklch(0.40 0.22 65)"
  warning-subtle: "oklch(0.94 0.05 76)"
---

# Design System: Modbus Template Builder

## 1. Overview

**Creative North Star: "The Calibrated Instrument"**

A quality multimeter or oscilloscope has no excess: the case is dark so readings stand out, every label is exactly where the eye expects it, and nothing is decorative. This design system is built on that premise. The interface is the tool, and the tool should disappear. The engineer using this app at 7:45 am before a commissioning job does not need the software to impress them; they need it to be right, readable under fluorescent light, and fast to move through.

The system defaults to dark: near-black background with a warm amber tint (hue 60), paired with an amber accent. Amber Terminal, drawn from the warm-yellow-brown band of OKLCH, appears on all interactive elements: the active step, primary buttons, focus rings. A matching light theme (Amber Daylight) uses warm paper tones. Both themes are driven from the same token set.

**Key Characteristics:**
- Amber Terminal dark palette: backgrounds in the `oklch(0.07–0.15)` range, hue 60, amber tint throughout
- Amber accent at `oklch(0.75 0.18 75)`: interactive elements only
- Single monospace typeface: IBM Plex Mono at 400/500/600 weight
- Zero border-radius: sharp corners everywhere, professional instrument aesthetic
- Tonal layering for depth: bg → surface → surface-raised, no decorative shadows at rest
- Two themes via `[data-theme]` attribute, auto-detected from `prefers-color-scheme`

## 2. Colors: Amber Terminal Palette

A warm near-black palette tinted consistently toward amber (hue 60–75). One accent color does all interactive work.

### Primary

- **Amber** (`oklch(0.75 0.18 75)`): The interactive accent. Active step indicators, primary button borders, focus rings, header brand dot. Not used on inactive surfaces.
- **Amber Deep** (`oklch(0.60 0.18 72)`): Primary button border at rest. Slightly darker variant of the accent.
- **Amber Hover** (`oklch(0.82 0.16 78)`): Hover variant, slightly lighter and desaturated.
- **Amber Subtle** (`oklch(0.12 0.06 68)`): Tinted background for drop-zone hover, badge fills, button active states.

### Neutral

- **Instrument Dark** (`oklch(0.07 0.010 60)`): Application background. Near-black with a trace of warm amber.
- **Panel Surface** (`oklch(0.11 0.010 60)`): Header bar, table sticky header, modal backgrounds.
- **Raised Surface** (`oklch(0.15 0.010 60)`): Group header rows, toolbar backgrounds, alternating-row tints.
- **Border** (`oklch(0.22 0.012 60)`): Standard dividers, input borders, table borders.
- **Border Muted** (`oklch(0.16 0.008 60)`): Intra-table row separators and quiet dividers.
- **Ink** (`oklch(0.92 0.012 75)`): Primary body text. Passes 7:1+ against bg.
- **Ink Muted** (`oklch(0.70 0.010 70)`): Secondary labels, column headers, help prose, button ghost text. Passes 4.5:1 against all surfaces.
- **Ink Dim** (`oklch(0.60 0.008 65)`): Tertiary text: version numbers, step labels, metadata. Passes 4.5:1 against all surfaces.

### Semantic

- **Danger** (`oklch(0.70 0.18 25)`): Validation errors, error alerts. Never decorative.
- **Danger Subtle** (`oklch(0.12 0.06 25)`): Error row background, error alert fill.
- **Success** (`oklch(0.70 0.15 145)`): Done step indicators, success badge text.
- **Success Subtle** (`oklch(0.12 0.06 145)`): Success badge background.
- **Warning** (`oklch(0.75 0.16 75)`): Warning alerts, required-field badge text. Aligns with amber accent in dark theme.
- **Warning Subtle** (`oklch(0.12 0.06 68)`): Warning badge background, warning alert fill.

### Code Palette (XML Preview)

- **Tag** (`oklch(0.72 0.12 258)`): XML tag names: a cool periwinkle, contrasting with the warm body.
- **Attribute** (`oklch(0.68 0.14 242)`): XML attribute names.
- **Value** (`oklch(0.75 0.18 75)`): Attribute values: uses the amber accent, reinforcing that values are the data.
- **Processing** (`oklch(0.52 0.05 60)`): XML declaration and processing instructions. Quietest color.

### Named Rules

**The One Amber Rule.** Amber (primary) appears on interactive and active states: primary button borders, the active step, focus rings, code values, and the brand dot. It does not appear on non-interactive surfaces. Its rarity is its meaning.

**The Tonal Family Rule.** Every neutral shares hue 60 at low chroma. The system reads as a coherent warm instrument face, not a gray Bootstrap default.

**The Contrast Floor Rule.** `--c-ink-dim` (tertiary text) passes 4.5:1 against all three surface levels. `--c-ink-muted` (secondary text) passes 4.5:1+ with margin. Placeholder text uses `--c-ink-dim`.

## 3. Typography: IBM Plex Mono

**Font:** IBM Plex Mono, Google Fonts, weights 400/500/600  
**Fallback stack:** 'Courier New', monospace  
**Loading:** `font-display: optional` (no FOUT; fallback used if font not cached)

The entire UI is monospace. IBM Plex Mono at varying sizes and weights creates all necessary hierarchy without a second typeface. This choice is intentional: tabular data, register addresses, XML output, and field labels all benefit from fixed-width layout and uniform character metrics.

### Hierarchy

- **Header / Section** (600 weight, 0.875rem): Tool name in header, help modal title. Rarely used.
- **Body / Button** (400–500 weight, 0.8125rem, line-height 1.5): Default text size. Table cell content, button labels, alert text, all prose.
- **Label / Badge** (500–600 weight, 0.6875rem, line-height 1.4): Field labels, column headers, step labels, badge text, metadata counts. The secondary scale.
- **Micro** (400 weight, 0.625rem): Column aliases in help modal. Used sparingly.

### Named Rules

**The Fixed Scale Rule.** No fluid typography. This is a dense data tool at a fixed desk viewport. The 14px body and ~10px label sizes are chosen for density, not for marketing legibility.

**The No-Display Rule.** There are no hero headings. Hierarchy comes from weight contrast (400 → 600) and the 14→10px size step, not from large display sizes.

## 4. Elevation

Flat by default. Depth comes from the tonal chain (bg → surface → surface-raised), not shadows.

One exception: the drag overlay during row reordering uses `box-shadow: 0 8px 24px oklch(0 0 0 / 0.60)` to float the ghost row above the table. This is a functional signal, not decoration.

### Named Rules

**The Flat-By-Default Rule.** Shadows appear only as functional signals: the drag overlay, the table scroll container border, the focus ring. Everything else is flat.

## 5. Light Theme (Amber Daylight)

The light theme uses warm paper tones. The same token names map to inverted-polarity values:

| Token | Dark value | Light value |
|---|---|---|
| `--c-bg` | `oklch(0.07 0.010 60)` | `oklch(0.97 0.006 78)` |
| `--c-ink` | `oklch(0.92 0.012 75)` | `oklch(0.14 0.016 55)` |
| `--c-ink-muted` | `oklch(0.70 0.010 70)` | `oklch(0.32 0.012 58)` |
| `--c-ink-dim` | `oklch(0.60 0.008 65)` | `oklch(0.40 0.010 60)` |
| `--c-accent` | `oklch(0.75 0.18 75)` | `oklch(0.46 0.22 65)` |
| `--c-warning` | `oklch(0.75 0.16 75)` | `oklch(0.40 0.22 65)` |

The select arrow SVG recolors via `--select-arrow`: dark warm gray on dark, dark brown on light.

## 6. Components

### Buttons

Sharp-cornered (0px radius). Three variants.

- **Primary:** Transparent fill, amber border `var(--c-accent-deep)`, amber text `var(--c-accent)`. Hover adds amber-subtle fill. Used for the one forward action per step.
- **Ghost:** Transparent fill and border. Ink-dim text. Hover reveals border and shifts to ink-muted. Back-navigation and secondary actions.
- **Danger:** Transparent fill. Danger-colored text only. Hover adds danger border and danger-subtle fill. Delete actions.
- **Focus ring:** `outline: 2px solid var(--c-accent); outline-offset: 2px` on `:focus-visible` for all button variants.

### Inputs and Form Controls

- **Style:** 1px border, surface fill, 0px radius. Padding 5px 8px.
- **Focus:** Border shifts to amber accent + `box-shadow: 0 0 0 1px var(--c-accent-deep)`.
- **Placeholder:** `color: var(--c-ink-dim)`, passes 4.5:1 contrast floor.
- **Select:** Theme-adaptive arrow via `--select-arrow` CSS custom property.
- **Table cell inputs:** Transparent border at rest, only border on hover/focus. Dense (3px 5px padding).

### Register Table

The core component. Dense, sticky-header, resizable columns, drag-to-reorder.

- **Header:** `position: sticky; top: 0`, surface background, ink-muted labels. Each optional column carries a `.col-clear-btn` (×, fades in on header hover, turns `--c-danger` on hover) - **destructive**: clears that field's data across every row (with a confirm dialog), not a visibility toggle.
- **Body rows:** Border-bottom separator. Row hover gets surface background. Cell inputs are ghost at rest.
- **Row numbers:** Ink-dim color, reflect true position in the unfiltered group (stable under search).
- **Group sections:** `<tbody>` elements with `group-header-row` (raised surface background). Empty groups show bg color with italic empty badge; a search with zero matches in a non-empty group shows "No rows match your search."
- **Drag handle:** Braille-pattern icon (⠿). Appears in leftmost cell of each row and group header.
- **Column resize:** 5px invisible handle at right edge of each header cell, cursor: col-resize.

### Table toolbar

- **Search input** (`.search-input`): a widened `.field-input[type=search]`, placeholder "Search rows…". Case-insensitive substring match against every field's value - including currently-hidden columns - filtering rows for both display and drag-and-drop scope.
- **Columns ▾ menu** (`.col-menu`/`.col-menu-panel`/`.col-menu-item`): a small click-to-open popover (closes on outside click) listing every *optional* field as a checkbox; toggling shows/hides that column in the table with **no effect on data or export**. Required fields are excluded and always shown. Panel uses `--c-surface` background, `--c-border` border, sharp corners, and a box-shadow matching `.confirm-dialog`.

### Step Indicator

Three states: todo, done, active.

- **Todo dot:** Transparent fill, border-colored ring, ink-dim text.
- **Done dot:** Amber-deep border, amber-deep text.
- **Active dot:** Amber border, amber text, amber-subtle fill.
- **Connector:** 16px line. Done: amber-deep. Pending: border-muted.
- **Labels:** 11px. Active: ink-muted, 500 weight. Done: amber-deep. Todo: ink-dim.

### Drop Zones

- **Default:** 1px dashed border, transparent fill, 3rem 4rem padding.
- **Hover/drag:** Amber-deep border, amber-subtle fill. 120ms transition.
- Two zones side-by-side on import step (spreadsheet / XML). Stack to column below 560px.

### Badges

- **Success** (points count): success-subtle fill, success text, success/40% border.
- **Info** (groups count): accent-subtle fill, accent text, accent/35% border.
- **Required**: warning-subtle fill, warning text, warning/50% border.
- **Optional**: transparent fill, ink-dim text, border-muted border.

### Feedback button + dialog

- **Trigger** (`.feedback-btn`): an icon button (`✉`) in `.header-actions`, sitting between the theme toggle and the help button, sized and styled identically to both (`btn btn-ghost btn-sm`, shared hover/focus rules): quiet, present on every step, never competing with the step's primary action.
- **Dialog** (`.feedback-dialog`): same `<dialog>` shell as the help dialog (sticky `// feedback` title, `[×]` close, surface background, sharp corners, amber accent title), wider (`min(920px, ...)`) to host a 3-up grid.
- **Paths** (`.feedback-path`): three informational cards (`01 / Give Feedback`, `02 / Report a Bug`, `03 / Request a Variant`), each with a small inline-SVG illustration in the same line-art language as `CpuIcon`/`circuit-logo.svg` (schematic shapes, `currentColor` stroke, `strokeWidth: 4.5`, square caps, miter joins, never icon-library generic), body copy, and a muted "what to include" hint line. Purely descriptive, with no per-card CTA (three identical buttons would be redundant chrome). Grid collapses to one column below 760px.
- **Footer** (`.feedback-footer`): one shared line below the cards, "Send your feedback with the relevant details to" plus a bracket-wrapped `[feedback.mtb@bynet.dev]` `mailto:` link styled like an inline `<code>` token (`.feedback-email-link`: accent color on `--c-accent-subtle`, mono font), and a `btn btn-ghost btn-sm` "Copy address" button using the same `navigator.clipboard.writeText` / `Copied!` pattern as `PreviewStep`'s copy-to-clipboard.

## 7. Do's and Don'ts

### Do:
- Use amber exclusively for interactive and active state. Header dot, active step, primary button border, focus ring, code values.
- Keep every neutral in the hue-60 amber tonal family. A pure gray looks mismatched.
- Use `color-mix(in oklch, var(--c-xxx) N%, transparent)` for semi-transparent borders instead of hard-coded OKLCH values with `/` opacity.
- Use `var(--c-ink-dim)` for tertiary text (version numbers, step labels, metadata); it now passes 4.5:1 contrast.

### Don't:
- Don't put rounded corners on anything. The 0px radius is intentional and part of the instrument aesthetic.
- Don't use warm-tinted neutral backgrounds other than those in the tonal chain; no beige, cream, or sand as fills.
- Don't add more than one filled primary button per screen. Each wizard step has one forward action.
- Don't use `border-left` as a colored accent stripe on alerts or callouts.
- Don't use gradient text.
- Don't use `font-display: swap`; the `optional` strategy prevents FOUT entirely.
