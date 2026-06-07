// Row validation, porting validate_row from the original implementation.
// Error messages are byte-identical (note en-dash "–" and em-dash "—").

import { ARGOS_FIELDS, VALID_DTYPES, VALID_REG_TYPES } from './fields';
import type { Row } from '../../row';
import { pyFloat, pyInt } from './format';

const DTYPES_MSG = [...VALID_DTYPES].sort().join(', ');
const REG_TYPES_MSG = [...VALID_REG_TYPES].sort().join(', ');

export function validateRow(
  rowDict: Row,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const f of ARGOS_FIELDS) {
    const val = String(rowDict[f.key] ?? '').trim();

    if (f.required && !val) {
      errors[f.key] = `${f.label} is required.`;
      continue;
    }
    if (!val) continue;

    if (f.key === 'register_index') {
      const r = pyInt(val);
      if (!r.ok) errors[f.key] = 'Must be an integer.';
      else if (r.value < 0) errors[f.key] = 'Must be a non-negative integer.';
    } else if (f.key === 'data_format' && !VALID_DTYPES.has(val)) {
      errors[f.key] = `Invalid — choose: ${DTYPES_MSG}`;
    } else if (f.key === 'register_type' && !VALID_REG_TYPES.has(val)) {
      errors[f.key] = `Invalid — choose: ${REG_TYPES_MSG}`;
    } else if (f.key === 'scaling') {
      if (!pyFloat(val).ok) errors[f.key] = 'Must be a number.';
    } else if (f.key === 'decimals') {
      const r = pyInt(val);
      if (!r.ok) errors[f.key] = 'Must be an integer 0–9.';
      else if (!(r.value >= 0 && r.value <= 9)) errors[f.key] = 'Must be 0–9.';
    } else if (f.key === 'min_val' || f.key === 'max_val') {
      if (!pyFloat(val).ok) errors[f.key] = 'Must be a number.';
    }
  }

  return errors;
}
