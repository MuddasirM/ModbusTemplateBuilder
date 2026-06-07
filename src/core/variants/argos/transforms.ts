// Spreadsheet-specific transforms, porting normalize_dtype, parse_hex_addr,
// and coeff_to_scaling from the original implementation.

import { DTYPE_MAP } from './fields';
import { isNa, type CellValue } from '../../row';
import { formatG, pyFloat, pyRound } from './format';

export function normalizeDtype(raw: CellValue): string | null {
  if (isNa(raw) || String(raw).trim() === '') return null;
  return DTYPE_MAP[String(raw).trim().toUpperCase()] ?? null;
}

/** Parse a hex address; supports "~" ranges (take first) and optional 0x/sign. */
export function parseHexAddr(raw: CellValue): number | null {
  if (isNa(raw)) return null;
  const s = String(raw).trim();
  if (!s) return null;
  let first = s.split('~')[0].trim();

  // Mirror Python int(first, 16): optional sign, optional 0x prefix, hex digits.
  let sign = 1;
  if (first[0] === '+' || first[0] === '-') {
    if (first[0] === '-') sign = -1;
    first = first.slice(1);
  }
  if (/^0[xX]/.test(first)) first = first.slice(2);
  if (first === '' || !/^[0-9a-fA-F]+$/.test(first)) return null;
  return sign * parseInt(first, 16);
}

/**
 * Convert a divisor-style coefficient (inverse of scaling) to [scalingStr, decimalsStr].
 * Returns [null, null] on NaN/blank/zero/non-numeric.
 */
export function coeffToScaling(coeffRaw: CellValue): [string | null, string | null] {
  if (isNa(coeffRaw)) return [null, null];
  const parsed = pyFloat(String(coeffRaw).trim());
  if (!parsed.ok) return [null, null];
  const c = parsed.value;
  if (c === 0) return [null, null];

  const scaling = 1.0 / c;
  const decimals = c > 0 && c < 1 ? Math.max(0, pyRound(-Math.log10(c))) : 0;

  if (Math.abs(scaling - pyRound(scaling)) < 1e-9) {
    return [String(pyRound(scaling)), String(decimals)];
  }
  return [formatG(scaling, 6), String(decimals)];
}
