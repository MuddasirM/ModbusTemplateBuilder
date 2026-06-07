// The Argos variant bundle: wires the existing (parity-locked) Argos schema,
// builder, parser, and validation behind the generic VariantBundle interface.
// Nothing here changes behavior — it's the existing modules, referenced.

import { ARGOS_FIELDS, COL_ALIASES } from './fields';
import { buildXml } from './buildXml';
import { parseArgosXml } from './parseXml';
import { validateRow } from './validate';
import type { ColumnDef, MetadataFieldDef, VariantBundle } from '../types';

const ARGOS_METADATA: MetadataFieldDef[] = [
  { key: 'name', label: 'Template Name', inputType: 'string', default: 'Modbus Template' },
  { key: 'version', label: 'Version', inputType: 'string', default: '1.0' },
];

// Canonical column headers for Excel export, chosen so re-import auto-maps
// correctly without triggering hex-address or coefficient transforms.
const ARGOS_EXCEL_COLS: ColumnDef[] = [
  { key: 'point_name',     header: 'Name' },
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

export const argosVariant: VariantBundle = {
  id: 'argos',
  label: 'Argos',
  hierarchy: 'nested',
  fields: ARGOS_FIELDS,
  aliases: COL_ALIASES,
  metadata: ARGOS_METADATA,
  spreadsheetColumns: ARGOS_EXCEL_COLS,
  validateRow,
  serialize: (groups, meta) =>
    buildXml(groups, String(meta.name ?? ''), String(meta.version ?? '')),
  parse: (text) => {
    const parsed = parseArgosXml(text);
    return { groups: parsed.groups, meta: { name: parsed.name, version: parsed.version } };
  },
};
