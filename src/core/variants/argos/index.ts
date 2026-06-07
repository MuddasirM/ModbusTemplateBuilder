// The Argos variant bundle: wires the existing (parity-locked) Argos schema,
// builder, parser, and validation behind the generic VariantBundle interface.
// Nothing here changes behavior - it's the existing modules, referenced.

import { ARGOS_FIELDS, COL_ALIASES, FIELD_BY_KEY } from './fields';
import { buildXml } from './buildXml';
import { parseArgosXml } from './parseXml';
import { validateRow } from './validate';
import type { BulkEditField, ColumnDef, MetadataFieldDef, OutputFormat, VariantBundle } from '../types';

const ARGOS_OUTPUT: OutputFormat = {
  label: 'XML',
  extension: 'xml',
  mimeType: 'application/xml',
  syntax: 'xml',
};

const ARGOS_SAMPLE = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
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
`;

const ARGOS_METADATA: MetadataFieldDef[] = [
  { key: 'name', label: 'Template Name', inputType: 'string', default: 'Modbus Template' },
  { key: 'version', label: 'Version', inputType: 'string', default: '1.0' },
];

// Canonical column headers for Excel export, chosen so re-import auto-maps
// correctly without triggering hex-address or coefficient transforms.
const ARGOS_EXCEL_COLS: ColumnDef[] = [
  { key: 'point_name',     header: 'Name' },
  { key: 'point_type',     header: 'Point Type' },
  { key: 'register_index', header: 'Address' },
  { key: 'register_type',  header: 'Register Type' },
  { key: 'data_format',    header: 'Data Format' },
  { key: 'scaling',        header: 'Scaling' },
  { key: 'decimals',       header: 'Decimals' },
  { key: 'unit',           header: 'Unit' },
  { key: 'group_name',     header: 'Group' },
  { key: 'min_val',        header: 'Min' },
  { key: 'max_val',        header: 'Max' },
];

// Choice-field dropdown options for the bulk-edit modal, drawn from the same
// valid-value lists ARGOS_FIELDS already declares (so they can't drift apart).
function choiceOptions(key: string): { value: string; label: string }[] {
  return (FIELD_BY_KEY[key].choices ?? []).map((c) => ({ value: c, label: c }));
}

// Point Name and Register Address are deliberately absent: unique per row,
// so a bulk overwrite either makes no sense or would create duplicates.
// Group's options are populated at render time from the live group list
// (it has no fixed valid-value set), hence the empty array here.
const ARGOS_BULK_EDIT_SCHEMA: BulkEditField[] = [
  { key: 'register_type', label: 'Register Type', type: 'dropdown', options: choiceOptions('register_type') },
  { key: 'data_format',   label: 'Data Format',   type: 'dropdown', options: choiceOptions('data_format') },
  { key: 'point_type',    label: 'Point Type',    type: 'dropdown', options: choiceOptions('point_type') },
  { key: 'scaling',       label: 'Scaling',       type: 'number' },
  { key: 'decimals',      label: 'Decimals',      type: 'number', min: 0, max: 9 },
  { key: 'unit',          label: 'Unit',          type: 'text' },
  { key: 'min_val',       label: 'Min',           type: 'number' },
  { key: 'max_val',       label: 'Max',           type: 'number' },
  { key: 'group_name',    label: 'Group',         type: 'dropdown', options: [] },
];

export const argosVariant: VariantBundle = {
  id: 'argos',
  label: 'Argos',
  hierarchy: 'nested',
  fields: ARGOS_FIELDS,
  aliases: COL_ALIASES,
  metadata: ARGOS_METADATA,
  spreadsheetColumns: ARGOS_EXCEL_COLS,
  bulkEditSchema: ARGOS_BULK_EDIT_SCHEMA,
  output: ARGOS_OUTPUT,
  sample: ARGOS_SAMPLE,
  validateRow,
  serialize: (groups, meta) =>
    buildXml(groups, String(meta.name ?? ''), String(meta.version ?? '')),
  parse: (text) => {
    const parsed = parseArgosXml(text);
    return { groups: parsed.groups, meta: { name: parsed.name, version: parsed.version } };
  },
};
