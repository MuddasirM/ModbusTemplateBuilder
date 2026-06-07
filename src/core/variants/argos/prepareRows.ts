// Core CSV/Excel extraction, porting prepare_rows from argos_modbus_builder.py.
// Input `grid` mirrors pandas read_*(header=None, dtype=str): rows of raw string
// cells, with null for empty cells (pandas NaN).

import { ARGOS_FIELDS, COL_ADDR, COL_ATTR, COL_COEFF } from './fields';
import { isNa, type CellValue, type Group, type Row } from '../../row';
import { detectHeaderRow } from './mapping';
import { coeffToScaling, normalizeDtype, parseHexAddr } from './transforms';

export type Mapping = Record<string, string | null | undefined>;

export function prepareRows(
  grid: CellValue[][],
  mapping: Mapping,
  defaults: Record<string, string> = {},
): Group[] {
  const hdr = detectHeaderRow(grid);
  const start = hdr >= 0 ? hdr : 0;
  const sliced = grid.slice(start);
  if (sliced.length === 0) return [];

  // First row after the slice becomes the column names (str(c).strip()).
  const columns = sliced[0].map((c) => (isNa(c) ? 'nan' : String(c).trim()));
  const colIndex = new Map<string, number>();
  columns.forEach((c, i) => colIndex.set(c, i)); // last-wins, like pandas dup cols

  const dataRows = sliced.slice(1);

  const isHexAddressCol = mapping['register_index'] === COL_ADDR;
  const isCoefficientCol = mapping['scaling'] === COL_COEFF;
  const isAttributeCol = mapping['register_type'] === COL_ATTR;

  const cellOf = (rowArr: CellValue[], col: string): CellValue => {
    if (!colIndex.has(col)) return null;
    return rowArr[colIndex.get(col)!] ?? null;
  };

  // Build the group tree in order of first appearance.
  const groupOrder: string[] = [];
  const groupPoints = new Map<string, Row[]>();

  const getGroupPoints = (name: string): Row[] => {
    const k = (name || 'Default Group').trim();
    if (!groupPoints.has(k)) {
      groupPoints.set(k, []);
      groupOrder.push(k);
    }
    return groupPoints.get(k)!;
  };

  for (const rowArr of dataRows) {
    const nameCol = mapping['point_name'];
    const nameRaw =
      nameCol && colIndex.has(nameCol) ? cellOf(rowArr, nameCol) : null;

    if (isNa(nameRaw) || String(nameRaw).trim() === '') continue;
    const name = String(nameRaw).trim();
    if (name.toLowerCase() === 'reserved') continue;

    const r: Row = {};
    let decBuf: string | null = null;

    for (const f of ARGOS_FIELDS) {
      const key = f.key;
      const effectiveDefault = (defaults[key] || '') || f.default || '';

      const col = mapping[key];
      if (!col || !colIndex.has(col)) {
        r[key] = effectiveDefault;
        continue;
      }

      const raw = cellOf(rowArr, col);
      if (isNa(raw) || String(raw).trim() === '') {
        r[key] = effectiveDefault;
        continue;
      }

      if (key === 'register_index' && isHexAddressCol) {
        const addr = parseHexAddr(raw);
        r[key] = addr !== null ? String(addr) : effectiveDefault;
      } else if (key === 'data_format') {
        const n = normalizeDtype(raw);
        r[key] = n ? n : String(raw).trim();
      } else if (key === 'scaling' && isCoefficientCol) {
        const [s, d] = coeffToScaling(raw);
        r[key] = s ? s : (effectiveDefault || '1');
        decBuf = d ? d : '0';
      } else if (key === 'unit') {
        const val = String(raw).trim();
        r[key] = val === '/' ? '' : val;
      } else if (key === 'register_type' && isAttributeCol) {
        r[key] = 'Holding';
      } else {
        r[key] = String(raw).trim();
      }
    }

    if (decBuf !== null && !mapping['decimals']) {
      r['decimals'] = decBuf;
    }

    r['point_name'] = name;

    // Read the group from the mapped column (or use the default).
    const groupCol = mapping['group_name'];
    const groupRaw = groupCol && colIndex.has(groupCol) ? cellOf(rowArr, groupCol) : null;
    const groupName = (!isNa(groupRaw) && String(groupRaw).trim())
      ? String(groupRaw).trim()
      : (defaults['group_name'] || 'Default Group');
    r['group_name'] = groupName;

    getGroupPoints(groupName).push(r);
  }

  return groupOrder.map((name) => ({ name, points: groupPoints.get(name)! }));
}
