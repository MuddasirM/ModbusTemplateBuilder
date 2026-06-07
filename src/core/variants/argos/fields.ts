// 1:1 port of the field definitions, column constants, and alias map from
// the original implementation. Keep these byte-identical to preserve behavior.

export interface ArgosField {
  key: string;
  label: string;
  required: boolean;
  type: 'text' | 'choice';
  choices: string[] | null;
  default: string;
  width: number;
}

// (key, label, required, type, choices, default, entry_width_chars)
export const ARGOS_FIELDS: ArgosField[] = [
  { key: 'point_name',     label: 'Point Name',  required: true,  type: 'text',   choices: null,                                       default: '',              width: 28 },
  { key: 'point_type',     label: 'Point Type',  required: false, type: 'choice', choices: ['ShowValue', 'ShowEnum', 'SetValue', 'SetValueWO', 'SetEnum'], default: 'ShowValue', width: 12 },
  { key: 'register_index', label: 'Reg. Address', required: true, type: 'text',   choices: null,                                       default: '',              width: 10 },
  { key: 'group_name',     label: 'Group',       required: false, type: 'text',   choices: null,                                       default: 'Default Group', width: 16 },
  { key: 'register_type',  label: 'Reg. Type',   required: false, type: 'choice', choices: ['Holding', 'Input', 'Coil', 'Discrete'],   default: 'Holding',       width: 12 },
  { key: 'data_format',    label: 'Data Format', required: false, type: 'choice', choices: ['U16', 'S16', 'U32', 'S32', 'U64', 'Float', 'Bool'], default: 'U16',   width: 10 },
  { key: 'unit',           label: 'Unit',        required: false, type: 'text',   choices: null,                                       default: '',              width: 7 },
  { key: 'scaling',        label: 'Scaling',     required: false, type: 'text',   choices: null,                                       default: '1',             width: 8 },
  { key: 'decimals',       label: 'Decimals',    required: false, type: 'text',   choices: null,                                       default: '2',             width: 6 },
  { key: 'min_val',        label: 'Min',         required: false, type: 'text',   choices: null,                                       default: '',              width: 8 },
  { key: 'max_val',        label: 'Max',         required: false, type: 'text',   choices: null,                                       default: '',              width: 8 },
];

export const FIELD_BY_KEY: Record<string, ArgosField> = Object.fromEntries(
  ARGOS_FIELDS.map((f) => [f.key, f]),
);

// Canonical column names used for auto-detection of source-specific transforms
export const COL_NO = 'No.';
export const COL_NAME = 'Name';
export const COL_ADDR = 'Address(0x)';
export const COL_ATTR = 'Attribute';
export const COL_COEFF = 'Coefficient';

// Data type normalisation
export const DTYPE_MAP: Record<string, string> = {
  I16: 'S16', U16: 'U16', S16: 'S16',
  U32: 'U32', S32: 'S32', U64: 'U64',
  FLOAT: 'Float', INT16: 'S16', UINT16: 'U16', UINT32: 'U32',
};
export const VALID_DTYPES = new Set(['U16', 'S16', 'U32', 'S32', 'U64', 'Float', 'Bool']);
export const VALID_REG_TYPES = new Set(['Holding', 'Input', 'Coil', 'Discrete']);
export const VALID_POINT_TYPES = new Set(['ShowValue', 'ShowEnum', 'SetValue', 'SetValueWO', 'SetEnum']);

// Pre-normalised column alias → Argos field key (52 entries, copied verbatim).
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
  // Bare "type" is already claimed by data_format above (ANPL convention),
  // so point_type only takes the unambiguous, more specific column names.
  pointtype: 'point_type',
  tagtype: 'point_type',
  unit: 'unit',
  units: 'unit',
  engineeringunit: 'unit',
  eu: 'unit',
  coefficient: 'scaling',
  coeff: 'scaling',
  scalingfactor: 'scaling',
  scaling: 'scaling',
  factor: 'scaling',
  multiplier: 'scaling',
  gain: 'scaling',
  decimals: 'decimals',
  decimal: 'decimals',
  decimalplaces: 'decimals',
  decimalpoints: 'decimals',
  precision: 'decimals',
  group: 'group_name',
  groupname: 'group_name',
  category: 'group_name',
  section: 'group_name',
  min: 'min_val',
  minvalue: 'min_val',
  minimum: 'min_val',
  minval: 'min_val',
  lowlimit: 'min_val',
  lowrange: 'min_val',
  max: 'max_val',
  maxvalue: 'max_val',
  maximum: 'max_val',
  maxval: 'max_val',
  highlimit: 'max_val',
  highrange: 'max_val',
};
