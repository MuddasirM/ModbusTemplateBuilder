// Per-variant output bundle: each registered output target (Argos, and future
// targets like Ignition/WebSupervisor) declares its own row/point shape,
// hierarchy, template-metadata shape, and serializer. There is no universal
// canonical structure shared across variants — "canonical" means "the shape
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

  validateRow(row: Row): Record<string, string>;
  serialize(groups: Group[], meta: Record<string, CellValue>): string;
  /** Inverse of `serialize`, for variants that support importing their own
   * output back in (e.g. re-editing an exported Argos XML template). */
  parse?(text: string): { groups: Group[]; meta: Record<string, CellValue> };
}
