// Non-blocking, per-row warnings: visually distinct (amber, not red) from
// validateRow's hard errors, and never block the export button.

import type { Row } from '../../row';

export const COMMA_WARNING_MESSAGE =
  'Commas in point names are URL-encoded on export (%2C) and may cause issues with logging profiles in Argos. Consider removing them.';

export const ENUM_FORMAT_WARNING =
  'Expected format: 0=Label;1=Label;... Keys must be non-negative integers.';

export const STRING_REG_COUNT_WARNING =
  'String data type requires a Reg. Count — the number of Modbus registers the string spans (1 register = 2 characters).';

export const BITMASK_POINT_TYPE_WARNING =
  'Bitmask is typically used with ShowEnum or SetEnum point types.';

export function warnRow(row: Row): Record<string, string> {
  const warnings: Record<string, string> = {};

  if (String(row.point_name ?? '').includes(',')) {
    warnings.point_name = COMMA_WARNING_MESSAGE;
  }

  const enumStr = String(row.enumeration ?? '').trim();
  if (enumStr) {
    const items = enumStr.split(';').filter((s) => s.trim().length > 0);
    const invalid = items.some((item) => {
      const eq = item.indexOf('=');
      if (eq === -1) return true;
      const key = item.slice(0, eq).trim();
      return !/^\d+$/.test(key);
    });
    if (invalid) warnings.enumeration = ENUM_FORMAT_WARNING;
  }

  if (String(row.data_format ?? '').trim() === 'String' && !String(row.reg_count ?? '').trim()) {
    warnings.reg_count = STRING_REG_COUNT_WARNING;
  }

  const bm = String(row.bitmask ?? '').trim();
  const pt = String(row.point_type ?? '').trim();
  if (bm && pt && pt !== 'ShowEnum' && pt !== 'SetEnum') {
    warnings.bitmask = BITMASK_POINT_TYPE_WARNING;
  }

  return warnings;
}
