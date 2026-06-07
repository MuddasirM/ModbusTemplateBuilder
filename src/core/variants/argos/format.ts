// Small helpers that replicate Python numeric/formatting semantics exactly, so
// the ported logic matches argos_modbus_builder.py byte-for-byte.

/** Python 3 round(): round-half-to-even, returning an integer. */
export function pyRound(x: number): number {
  if (!Number.isFinite(x)) return x;
  const floor = Math.floor(x);
  const diff = x - floor;
  if (diff < 0.5) return floor;
  if (diff > 0.5) return floor + 1;
  // exactly .5 → round to even
  return floor % 2 === 0 ? floor : floor + 1;
}

/**
 * Replicates Python's `format(x, '.{p}g')` (default p=6). Used for scaling
 * factors. Chooses fixed vs exponential the same way %g does and strips
 * trailing zeros.
 */
export function formatG(x: number, precision = 6): string {
  if (Number.isNaN(x)) return 'nan';
  if (x === Infinity) return 'inf';
  if (x === -Infinity) return '-inf';
  if (x === 0) return '0';

  const neg = x < 0;
  const ax = Math.abs(x);

  // toExponential(precision-1) gives correctly-rounded mantissa + exponent.
  const e = ax.toExponential(precision - 1); // e.g. "1.42857e-1"
  const [mantStr, expStr] = e.split('e');
  const exp = parseInt(expStr, 10);

  if (exp < -4 || exp >= precision) {
    let mant = mantStr;
    if (mant.includes('.')) mant = mant.replace(/0+$/, '').replace(/\.$/, '');
    const sign = exp < 0 ? '-' : '+';
    const ea = Math.abs(exp).toString().padStart(2, '0');
    return (neg ? '-' : '') + mant + 'e' + sign + ea;
  }

  const decimals = precision - 1 - exp;
  let s = ax.toFixed(Math.max(0, decimals));
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return (neg ? '-' : '') + s;
}

/** Replicates Python int(str): strict signed integer, else not-ok. */
export function pyInt(s: string): { ok: boolean; value: number } {
  const t = s.trim();
  if (/^[+-]?\d+$/.test(t)) return { ok: true, value: parseInt(t, 10) };
  return { ok: false, value: NaN };
}

/** Replicates Python float(str): accepts inf/infinity/nan and standard floats. */
export function pyFloat(s: string): { ok: boolean; value: number } {
  const t = s.trim();
  if (t === '') return { ok: false, value: NaN };
  const low = t.toLowerCase();
  if (/^[+-]?(inf|infinity)$/.test(low)) {
    return { ok: true, value: low.startsWith('-') ? -Infinity : Infinity };
  }
  if (/^[+-]?nan$/.test(low)) return { ok: true, value: NaN };
  if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) {
    return { ok: true, value: Number(t) };
  }
  return { ok: false, value: NaN };
}

/** Matches Python xml.dom.minidom attribute/text escaping order: & < " >. */
export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/>/g, '&gt;');
}
