// The Kepware variant bundle: a flat CSV output target wired behind the same
// VariantBundle interface as Argos. Kepware has no template-level XML root, so
// metadata is limited to a name used for the exported filename, and there is
// no `parse` (Kepware doesn't support re-importing its own CSV as a template).

import { KEPWARE_FIELDS, COL_ALIASES, FIELD_BY_KEY } from './fields';
import { buildCsv } from './buildCsv';
import { validateRow } from './validate';
import type { BulkEditField, ColumnDef, MetadataFieldDef, OutputFormat, VariantBundle } from '../types';

const KEPWARE_METADATA: MetadataFieldDef[] = [
  { key: 'name', label: 'Template Name', inputType: 'string', default: 'Kepware Tags' },
];

// Kepware-flavoured column names/ordering for the spreadsheet preview and
// Excel export (deliberately not Argos's canonical headers).
const KEPWARE_EXCEL_COLS: ColumnDef[] = [
  { key: 'point_name',     header: 'Tag Name' },
  { key: 'point_type',     header: 'Point Type' },
  { key: 'register_index', header: 'Address' },
  { key: 'register_type',  header: 'Register Type' },
  { key: 'data_format',    header: 'Data Type' },
  { key: 'scaling',        header: 'Scaling' },
  { key: 'unit',           header: 'Engineering Units' },
  { key: 'group_name',     header: 'Group' },
];

function choiceOptions(key: string): { value: string; label: string }[] {
  return (FIELD_BY_KEY[key].choices ?? []).map((c) => ({ value: c, label: c }));
}

// Point Name and Reg. Address are deliberately absent (unique per row, see
// Argos's bulk-edit schema for the same reasoning). Decimals/Min/Max are
// absent too: the Kepware CSV has no columns for them.
const KEPWARE_BULK_EDIT_SCHEMA: BulkEditField[] = [
  { key: 'register_type', label: 'Register Type', type: 'dropdown', options: choiceOptions('register_type') },
  { key: 'data_format',   label: 'Data Format',   type: 'dropdown', options: choiceOptions('data_format') },
  { key: 'point_type',    label: 'Point Type',    type: 'dropdown', options: choiceOptions('point_type') },
  { key: 'scaling',       label: 'Scaling',       type: 'number' },
  { key: 'unit',          label: 'Unit',          type: 'text' },
  { key: 'group_name',    label: 'Group',         type: 'dropdown', options: [] },
];

const KEPWARE_OUTPUT: OutputFormat = {
  label: 'CSV',
  extension: 'csv',
  mimeType: 'text/csv',
  syntax: 'plain',
};

const KEPWARE_SAMPLE = `Tag Name,Address,Data Type,Respect Data Type,Client Access,Scan Rate,Scaling,Raw Low,Raw High,Scaled Low,Scaled High,Scaled Data Type,Clamp Low,Clamp High,Engineering Units,Description
Voltage L1,400101,Word,1,RO,100,Linear,0,32767,0,3276.7,Float,1,1,V,
Current L1,400111,Short,1,RO,100,,,,,,,,,,
Power,400131,DWord,1,RO,100,,,,,,,,,,
`;

export const kepwareVariant: VariantBundle = {
  id: 'kepware',
  label: 'Kepware',
  hierarchy: 'nested',
  fields: KEPWARE_FIELDS,
  aliases: COL_ALIASES,
  metadata: KEPWARE_METADATA,
  spreadsheetColumns: KEPWARE_EXCEL_COLS,
  bulkEditSchema: KEPWARE_BULK_EDIT_SCHEMA,
  output: KEPWARE_OUTPUT,
  sample: KEPWARE_SAMPLE,
  validateRow,
  serialize: (groups) => buildCsv(groups),
};
