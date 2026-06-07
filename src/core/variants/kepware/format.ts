// Small numeric/text helpers for the Kepware bundle. Unlike Argos (a port of
// an existing Python tool whose output a parity suite locks byte-for-byte),
// Kepware is a new format with no external oracle to match: these only need
// to be correct and deterministic, not replicate another runtime's quirks.

/** Strict signed-integer check: used for Reg. Address validation. */
export function parseStrictInt(s: string): { ok: boolean; value: number } {
  const t = s.trim();
  if (/^[+-]?\d+$/.test(t)) return { ok: true, value: parseInt(t, 10) };
  return { ok: false, value: NaN };
}

/** Strict decimal-number check: used for Scaling validation. */
export function parseStrictFloat(s: string): { ok: boolean; value: number } {
  const t = s.trim();
  if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return { ok: true, value: Number(t) };
  return { ok: false, value: NaN };
}

/** `32767 / scaling`, as a plain decimal string (e.g. scaling 10 -> "3276.7"). */
export function formatScaledHigh(scaling: number): string {
  return String(32767 / scaling);
}

/** RFC4180 field quoting: wrap in quotes (doubling embedded quotes) only when
 * the value contains a comma, quote, or line break. */
export function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
