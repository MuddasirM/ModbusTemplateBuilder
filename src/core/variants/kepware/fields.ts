// Kepware's editable point schema. Reuses the same field keys as Argos
// (point_name, point_type, register_index, group_name, register_type,
// data_format, unit, scaling) because `prepareRows` builds the canonical Row
// shape from ARGOS_FIELDS regardless of the selected variant - any field this
// bundle wants populated by the shared import pipeline must use one of those
// keys. Decimals/Min/Max are intentionally absent: the Kepware CSV has no
// columns for them.

import type { FieldDef } from '../types';

export const KEPWARE_FIELDS: FieldDef[] = [
  { key: 'point_name',     label: 'Point Name',  required: true,  type: 'text',   choices: null,                                                          default: '',              width: 28 },
  { key: 'point_type',     label: 'Point Type',  required: false, type: 'choice', choices: ['ShowValue', 'ShowEnum', 'SetValue', 'SetValueWO', 'SetEnum'], default: 'ShowValue',     width: 12 },
  { key: 'register_index', label: 'Reg. Address', required: true, type: 'text',   choices: null,                                                          default: '',              width: 10 },
  { key: 'group_name',     label: 'Group',       required: false, type: 'text',   choices: null,                                                          default: 'Default Group', width: 16 },
  { key: 'register_type',  label: 'Reg. Type',   required: false, type: 'choice', choices: ['Holding', 'Input', 'Coil', 'Discrete'],                      default: 'Holding',       width: 12 },
  { key: 'data_format',    label: 'Data Format', required: false, type: 'choice', choices: ['U16', 'S16', 'U32', 'S32', 'U64', 'Float', 'Bool'],          default: 'U16',           width: 10 },
  { key: 'unit',           label: 'Unit',        required: false, type: 'text',   choices: null,                                                          default: '',              width: 7 },
  { key: 'scaling',        label: 'Scaling',     required: false, type: 'text',   choices: null,                                                          default: '1',             width: 8 },
];

export const FIELD_BY_KEY: Record<string, FieldDef> = Object.fromEntries(
  KEPWARE_FIELDS.map((f) => [f.key, f]),
);

export const VALID_DTYPES = new Set(['U16', 'S16', 'U32', 'S32', 'U64', 'Float', 'Bool']);
export const VALID_REG_TYPES = new Set(['Holding', 'Input', 'Coil', 'Discrete']);
export const VALID_POINT_TYPES = new Set(['ShowValue', 'ShowEnum', 'SetValue', 'SetValueWO', 'SetEnum']);

// Pre-normalised column alias -> Kepware field key, for auto-mapping on
// import. Mirrors Argos's alias set, minus the keys for fields this variant
// doesn't expose (decimals/min/max).
export const COL_ALIASES: Record<string, string> = {
  name: 'point_name',
  pointname: 'point_name',
  description: 'point_name',
  tagname: 'point_name',
  signalname: 'point_name',
  'address(0x)': 'register_index',
  address: 'register_index',
  addr: 'register_index',
  registerindex: 'register_index',
  regindex: 'register_index',
  registeraddress: 'register_index',
  regaddress: 'register_index',
  modbusaddress: 'register_index',
  modbusregister: 'register_index',
  register: 'register_index',
  attribute: 'register_type',
  attr: 'register_type',
  registertype: 'register_type',
  regtype: 'register_type',
  functioncode: 'register_type',
  datatype: 'data_format',
  dataformat: 'data_format',
  dtype: 'data_format',
  format: 'data_format',
  type: 'data_format',
  wordformat: 'data_format',
  valuetype: 'data_format',
  pointtype: 'point_type',
  tagtype: 'point_type',
  unit: 'unit',
  units: 'unit',
  engineeringunit: 'unit',
  engineeringunits: 'unit',
  eu: 'unit',
  coefficient: 'scaling',
  coeff: 'scaling',
  scalingfactor: 'scaling',
  scaling: 'scaling',
  factor: 'scaling',
  multiplier: 'scaling',
  gain: 'scaling',
  group: 'group_name',
  groupname: 'group_name',
  category: 'group_name',
  section: 'group_name',
};
