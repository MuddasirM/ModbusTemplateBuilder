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
  /** Optional tooltip shown in the column header (e.g. for display-only fields). */
  hint?: string;
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

/** A field offered as a Find & Replace target in the Edit step's multi-select
 * toolbar: which key it targets, and whether matches are exact-numeric (vs.
 * substring). */
export interface FindReplaceFieldDef {
  key: string;
  numeric: boolean;
}

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
  /** Fields offered as Find & Replace targets in the Edit step's multi-select
   * toolbar, in display order. Optional: a variant can omit it (no button
   * shown if the resulting list is empty). */
  findReplaceFields?: FindReplaceFieldDef[];

  validateRow(row: Row): Record<string, string>;
  /** Non-blocking, per-field warnings (e.g. "this will cause export issues"),
   * shown distinctly from validateRow's hard errors. Optional: a variant with
   * nothing to warn about can omit it. Same shape as validateRow's return. */
  warnRow?(row: Row): Record<string, string>;
  serialize(groups: Group[], meta: Record<string, CellValue>): string;
  /** Inverse of `serialize`, for variants that support importing their own
   * output back in (e.g. re-editing an exported Argos XML template). */
  parse?(text: string): { groups: Group[]; meta: Record<string, CellValue> };
}
