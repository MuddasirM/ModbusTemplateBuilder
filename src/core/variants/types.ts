// Per-variant output bundle: each registered output target (Argos, and future
// targets like Ignition/WebSupervisor) declares its own row/point shape,
// hierarchy, template-metadata shape, and serializer. There is no universal
// canonical structure shared across variants - "canonical" means "the shape
// this variant needs."

import type { CellValue, Group, Row } from '../row';

/** A single editable register/point field: shape, default, and choices. */
export interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  type: 'text' | 'choice';
  choices: string[] | null;
  default: string;
  width: number;
}

/** A template-level metadata field (e.g. template name/version), rendered
 * on the Edit screen as one input per entry, widget chosen by `inputType`. */
export interface MetadataFieldDef {
  key: string;
  label: string;
  inputType: 'string' | 'number' | 'date';
  default: string;
}

/** A spreadsheet/Excel column: internal field key + display header. */
export interface ColumnDef {
  key: string;
  header: string;
}

/** Describes the shape of a variant's generated output, so the Preview step
 * can render, label, and export it without assuming XML. `syntax` picks the
 * preview's highlighting: 'xml' for tagged markup, 'plain' for everything else
 * (CSV, delimited text, ...). */
export interface OutputFormat {
  label: string;
  extension: string;
  mimeType: string;
  syntax: 'xml' | 'plain';
}

/** A field offered in the Edit step's bulk-edit modal: which key it writes,
 * how it's labelled, and what kind of input it gets. Point Name and Register
 * Address must never appear here (unique per row, bulk overwrite makes no
 * sense / would create duplicates). */
export type BulkEditField =
  | {
      key: string;
      label: string;
      type: 'dropdown';
      options: { value: string; label: string }[];
    }
  | {
      key: string;
      label: string;
      type: 'text' | 'number';
      min?: number;
      max?: number;
    };

export interface VariantBundle {
  id: string;
  label: string;

  /** How points are organised. Only 'nested' (Group[] -> Row[]) is built
   * today; 'flat' is reserved for a future variant that has no grouping. */
  hierarchy: 'nested' | 'flat';

  fields: FieldDef[];
  /** Normalised column-name -> field key, for auto-mapping on import. */
  aliases: Record<string, string>;
  metadata: MetadataFieldDef[];
  spreadsheetColumns: ColumnDef[];
  /** Fields offered in the Edit step's bulk-edit modal, in display order.
   * Optional: a variant with nothing meaningful to bulk-edit can omit it. */
  bulkEditSchema?: BulkEditField[];

  /** Shape of this variant's serialized output, so Preview/Export can render
   * and label it without assuming XML. */
  output: OutputFormat;
  /** A short, representative snippet of this variant's output, shown on the
   * Import step when the variant is selected so the user knows what they'll
   * get before they commit to it. Optional: variants can omit it. */
  sample?: string;

  validateRow(row: Row): Record<string, string>;
  serialize(groups: Group[], meta: Record<string, CellValue>): string;
  /** Inverse of `serialize`, for variants that support importing their own
   * output back in (e.g. re-editing an exported Argos XML template). */
  parse?(text: string): { groups: Group[]; meta: Record<string, CellValue> };
}
