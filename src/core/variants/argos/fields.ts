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
  hint?: string;
}

// (key, label, required, type, choices, default, entry_width_chars)
export const ARGOS_FIELDS: ArgosField[] = [
  { key: 'point_name',     label: 'Point Name',  required: true,  type: 'text',   choices: null,                                       default: '',              width: 28 },
  { key: 'point_type',     label: 'Point Type',  required: false, type: 'choice', choices: ['ShowValue', 'ShowEnum', 'SetValue', 'SetValueWO', 'SetEnum'], default: 'ShowValue', width: 12 },
  { key: 'register_index', label: 'Reg. Address', required: true, type: 'text',   choices: null,                                       default: '',              width: 10 },
  { key: 'group_name',     label: 'Group',       required: false, type: 'text',   choices: null,                                       default: 'Default Group', width: 16 },
  { key: 'register_type',  label: 'Reg. Type',   required: false, type: 'choice', choices: ['Holding', 'Input', 'Coil', 'Discrete'],   default: 'Holding',       width: 12 },
  { key: 'data_format',    label: 'Data Format', required: false, type: 'choice', choices: ['U16', 'S16', 'U32', 'S32', 'U64', 'Float', 'Bool', 'String'], default: 'U16',   width: 10 },
  { key: 'unit',           label: 'Unit',        required: false, type: 'text',   choices: null,                                       default: '',              width: 7 },
  { key: 'scaling',        label: 'Scaling',     required: false, type: 'text',   choices: null,                                       default: '1',             width: 8 },
  { key: 'decimals',       label: 'Decimals',    required: false, type: 'text',   choices: null,                                       default: '2',             width: 6 },
  { key: 'min_val',        label: 'Min',         required: false, type: 'text',   choices: null,                                       default: '',              width: 8 },
  { key: 'max_val',        label: 'Max',         required: false, type: 'text',   choices: null,                                       default: '',              width: 8 },
  { key: 'enumeration',    label: 'Enumeration', required: false, type: 'text',   choices: null,                                       default: '',              width: 24 },
  { key: 'reg_count',      label: 'Reg. Count',  required: false, type: 'text',   choices: null,                                       default: '',              width: 8 },
  { key: 'bitmask',        label: 'Bitmask',     required: false, type: 'text',   choices: null,                                       default: '',              width: 10 },
  { key: 'notes',          label: 'Notes',       required: false, type: 'text',   choices: null,                                       default: '',              width: 20, hint: 'Display only. Not included in the exported XML.' },
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
  STRING: 'String',
};
export const VALID_DTYPES = new Set(['U16', 'S16', 'U32', 'S32', 'U64', 'Float', 'Bool', 'String']);
export const VALID_REG_TYPES = new Set(['Holding', 'Input', 'Coil', 'Discrete']);
export const VALID_POINT_TYPES = new Set(['ShowValue', 'ShowEnum', 'SetValue', 'SetValueWO', 'SetEnum']);

// Pre-normalised column alias → Argos field key.
export const COL_ALIASES: Record<string, string> = {
  // point_name
  name: 'point_name',
  pointname: 'point_name',
  description: 'point_name',
  tagname: 'point_name',
  signalname: 'point_name',
  tag: 'point_name',
  label: 'point_name',
  signal: 'point_name',
  parameter: 'point_name',
  parametername: 'point_name',

  // register_index
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
  reg: 'register_index',
  offset: 'register_index',
  startaddress: 'register_index',
  startregister: 'register_index',

  // register_type
  attribute: 'register_type',
  attr: 'register_type',
  registertype: 'register_type',
  regtype: 'register_type',
  functioncode: 'register_type',
  modbusfunction: 'register_type',
  accesstype: 'register_type',

  // data_format
  datatype: 'data_format',
  dataformat: 'data_format',
  dtype: 'data_format',
  format: 'data_format',
  type: 'data_format',          // bare "type" claimed by data_format (ANPL convention)
  wordformat: 'data_format',
  valuetype: 'data_format',
  valueformat: 'data_format',
  registerformat: 'data_format',
  datasize: 'data_format',

  // point_type — only unambiguous names since "type" is taken above
  pointtype: 'point_type',
  tagtype: 'point_type',
  presentation: 'point_type',
  displaytype: 'point_type',

  // unit
  unit: 'unit',
  units: 'unit',
  engineeringunit: 'unit',
  eu: 'unit',
  uom: 'unit',
  unitofmeasure: 'unit',
  measurementunit: 'unit',
  physicalunit: 'unit',

  // scaling
  coefficient: 'scaling',
  coeff: 'scaling',
  scalingfactor: 'scaling',
  scaling: 'scaling',
  scale: 'scaling',
  scalefactor: 'scaling',
  factor: 'scaling',
  multiplier: 'scaling',
  gain: 'scaling',

  // decimals
  decimals: 'decimals',
  decimal: 'decimals',
  decimalplaces: 'decimals',
  decimalpoints: 'decimals',
  precision: 'decimals',
  dp: 'decimals',
  decimaldigits: 'decimals',

  // group_name
  group: 'group_name',
  groupname: 'group_name',
  category: 'group_name',
  section: 'group_name',
  device: 'group_name',
  subsystem: 'group_name',
  devicegroup: 'group_name',

  // min_val
  min: 'min_val',
  minvalue: 'min_val',
  minimum: 'min_val',
  minval: 'min_val',
  lowlimit: 'min_val',
  lowrange: 'min_val',
  lowerrange: 'min_val',
  lowbound: 'min_val',
  lowerbound: 'min_val',
  rangemin: 'min_val',

  // max_val
  max: 'max_val',
  maxvalue: 'max_val',
  maximum: 'max_val',
  maxval: 'max_val',
  highlimit: 'max_val',
  highrange: 'max_val',
  upperrange: 'max_val',
  highbound: 'max_val',
  upperbound: 'max_val',
  rangemax: 'max_val',

  // enumeration
  enumeration: 'enumeration',
  enum: 'enumeration',
  enumerations: 'enumeration',
  enumvalues: 'enumeration',
  enumlist: 'enumeration',
  enummap: 'enumeration',
  statemap: 'enumeration',
  statelist: 'enumeration',
  statedefinition: 'enumeration',
  valuemap: 'enumeration',
  states: 'enumeration',
  enumdefinition: 'enumeration',
  choices: 'enumeration',

  // reg_count
  regcount: 'reg_count',
  registercount: 'reg_count',
  registerlength: 'reg_count',
  stringlength: 'reg_count',
  stringsize: 'reg_count',
  stringregs: 'reg_count',
  numregisters: 'reg_count',
  numwords: 'reg_count',
  reglength: 'reg_count',
  wordcount: 'reg_count',
  wordlength: 'reg_count',
  registers: 'reg_count',
  length: 'reg_count',

  // bitmask
  bitmask: 'bitmask',
  mask: 'bitmask',
  bitmaskvalue: 'bitmask',
  bitmaskval: 'bitmask',
  bitfield: 'bitmask',
  bitmaskfilter: 'bitmask',
  bitmaskpattern: 'bitmask',

  // notes
  notes: 'notes',
  note: 'notes',
  comment: 'notes',
  comments: 'notes',
  remark: 'notes',
  remarks: 'notes',
  memo: 'notes',
  info: 'notes',
  annotation: 'notes',
  annotations: 'notes',
};
