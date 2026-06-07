// Column auto-mapping + header detection, porting _norm, _fuzzy, auto_map,
// detect_header_row from argos_modbus_builder.py.

import { ARGOS_FIELDS, COL_ALIASES, COL_ADDR, COL_NAME } from './fields';
import { isNa, type CellValue } from '../../row';

export function norm(col: string): string {
  return col.toLowerCase().replaceAll(' ', '').replaceAll('_', '');
}

export function fuzzy(col: string, key: string, label: string): boolean {
  const c = norm(col);
  const k = key.toLowerCase().replaceAll('_', '');
  const l = norm(label);
  return c === k || c === l || c.includes(k) || c.includes(l);
}

/** Two-pass: alias lookup first, then fuzzy. Returns {fieldKey: fileColumn}. */
export function autoMap(
  fileCols: string[],
  fields: { key: string; label: string }[] = ARGOS_FIELDS,
  aliases: Record<string, string> = COL_ALIASES,
): Record<string, string> {
  const m: Record<string, string> = {};
  for (const col of fileCols) {
    const key = aliases[norm(col)];
    if (key && !(key in m)) m[key] = col;
  }
  for (const f of fields) {
    if (!(f.key in m)) {
      for (const col of fileCols) {
        if (fuzzy(col, f.key, f.label)) {
          m[f.key] = col;
          break;
        }
      }
    }
  }
  return m;
}

/**
 * Derive the file's column names the way _import_file does: take the detected
 * header row (or row 0), drop NaN cells, and strip whitespace.
 */
export function fileColsOf(grid: CellValue[][]): string[] {
  if (grid.length === 0) return [];
  const hdr = detectHeaderRow(grid);
  const src = hdr >= 0 ? grid[hdr] : grid[0];
  return src.filter((c) => !isNa(c)).map((c) => String(c).trim());
}

/** Scan the first 6 rows for a row containing both "Name" and "Address(0x)". */
export function detectHeaderRow(grid: CellValue[][]): number {
  const n = Math.min(6, grid.length);
  for (let i = 0; i < n; i++) {
    const vals = new Set<string>();
    for (const v of grid[i]) {
      if (!isNa(v)) vals.add(String(v).trim());
    }
    if (vals.has(COL_NAME) && vals.has(COL_ADDR)) return i;
  }
  return -1;
}
