// Non-blocking, per-row warnings: visually distinct (amber, not red) from
// validateRow's hard errors, and never block the export button.

import type { Row } from '../../row';

export const COMMA_WARNING_MESSAGE =
  'Commas in point names are URL-encoded on export (%2C) and may cause issues with logging profiles in Argos. Consider removing them.';

export function warnRow(row: Row): Record<string, string> {
  const warnings: Record<string, string> = {};
  if (String(row.point_name ?? '').includes(',')) {
    warnings.point_name = COMMA_WARNING_MESSAGE;
  }
  return warnings;
}
