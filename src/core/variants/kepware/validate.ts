// Row validation for the Kepware bundle. Same shape as Argos's validateRow
// (iterate fields, return key -> message), scoped to the fields Kepware
// actually exposes.

import { KEPWARE_FIELDS, VALID_DTYPES, VALID_POINT_TYPES, VALID_REG_TYPES } from './fields';
import type { Row } from '../../row';
import { parseStrictFloat, parseStrictInt } from './format';

const DTYPES_MSG = [...VALID_DTYPES].sort().join(', ');
const REG_TYPES_MSG = [...VALID_REG_TYPES].sort().join(', ');
const POINT_TYPES_MSG = [...VALID_POINT_TYPES].sort().join(', ');

export function validateRow(rowDict: Row): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const f of KEPWARE_FIELDS) {
    const val = String(rowDict[f.key] ?? '').trim();

    if (f.required && !val) {
      errors[f.key] = `${f.label} is required.`;
      continue;
    }
    if (!val) continue;

    if (f.key === 'register_index') {
      const r = parseStrictInt(val);
      if (!r.ok) errors[f.key] = 'Must be an integer.';
      else if (r.value < 0) errors[f.key] = 'Must be a non-negative integer.';
    } else if (f.key === 'data_format' && !VALID_DTYPES.has(val)) {
      errors[f.key] = `Invalid - choose: ${DTYPES_MSG}`;
    } else if (f.key === 'register_type' && !VALID_REG_TYPES.has(val)) {
      errors[f.key] = `Invalid - choose: ${REG_TYPES_MSG}`;
    } else if (f.key === 'point_type' && !VALID_POINT_TYPES.has(val)) {
      errors[f.key] = `Invalid - choose: ${POINT_TYPES_MSG}`;
    } else if (f.key === 'scaling') {
      const r = parseStrictFloat(val);
      if (!r.ok) errors[f.key] = 'Must be a number.';
      // Scaled High is 32767 / scaling: zero would produce an unusable value.
      else if (r.value === 0) errors[f.key] = 'Cannot be zero.';
    }
  }

  return errors;
}
