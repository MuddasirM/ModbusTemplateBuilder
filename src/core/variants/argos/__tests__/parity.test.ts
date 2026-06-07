// Parity tests: every expectation here was produced by the REAL Python
// implementation (web/scripts/gen_fixtures.py). If the TS port drifts from
// argos_modbus_builder.py, these fail.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { coeffToScaling, parseHexAddr, normalizeDtype } from '../transforms';
import { autoMap } from '../mapping';
import { prepareRows, type Mapping } from '../prepareRows';
import { buildXml } from '../buildXml';
import { parseArgosXml } from '../parseXml';
import { validateRow } from '../validate';
import { type CellValue } from '../../../row';
import { xmlEscape, formatG } from '../format';

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, 'fixtures/parity.json'), 'utf-8'));

describe('coeffToScaling', () => {
  for (const c of fx.coeff) {
    it(`coeff ${JSON.stringify(c.in)} -> [${c.scaling}, ${c.decimals}]`, () => {
      expect(coeffToScaling(c.in)).toEqual([c.scaling, c.decimals]);
    });
  }
});

describe('parseHexAddr', () => {
  for (const h of fx.hex) {
    it(`hex ${JSON.stringify(h.in)} -> ${h.out}`, () => {
      expect(parseHexAddr(h.in)).toBe(h.out);
    });
  }
});

describe('normalizeDtype', () => {
  for (const d of fx.dtype) {
    it(`dtype ${JSON.stringify(d.in)} -> ${d.out}`, () => {
      expect(normalizeDtype(d.in)).toBe(d.out);
    });
  }
});

describe('autoMap', () => {
  it('maps the sample CSV header', () => {
    expect(autoMap(fx.automap_sample.cols)).toEqual(fx.automap_sample.mapping);
  });
});

describe('prepareRows + buildXml', () => {
  for (const name of ['prepare_sample_csv', 'prepare_anpl']) {
    const c = fx[name];
    it(`${name}: rows match`, () => {
      const groups = prepareRows(c.grid as CellValue[][], c.mapping as Mapping, c.defaults);
      const rows = groups.flatMap((g) => g.points);
      expect(rows).toEqual(c.rows);
    });
    it(`${name}: XML matches byte-for-byte`, () => {
      const groups = prepareRows(c.grid as CellValue[][], c.mapping as Mapping, c.defaults);
      expect(buildXml(groups, 'ANPL-AME Template', '1.0')).toBe(c.xml);
    });
  }
});

describe('parseArgosXml round-trip', () => {
  it('parses groups + metadata and rebuilds identical XML', () => {
    const parsed = parseArgosXml(fx.roundtrip_xml.input);
    expect(parsed.name).toBe(fx.roundtrip_xml.name);
    expect(parsed.version).toBe(fx.roundtrip_xml.version);
    const rows = parsed.groups.flatMap((g) => g.points);
    expect(rows).toEqual(fx.roundtrip_xml.rows);
    expect(buildXml(parsed.groups, parsed.name, parsed.version)).toBe(
      fx.roundtrip_xml.xml_out,
    );
  });
});

describe('validateRow', () => {
  fx.validate.forEach(
    (c: { row: Record<string, string>; errors: Record<string, string> }, i: number) => {
      it(`validate case ${i}`, () => {
        expect(validateRow(c.row)).toEqual(c.errors);
      });
    },
  );
});

describe('xmlEscape (minidom order)', () => {
  it('escapes & < " > and leaves apostrophes', () => {
    expect(xmlEscape('a&b<c>"d"\'e')).toBe('a&amp;b&lt;c&gt;&quot;d&quot;\'e');
  });
});

describe('formatG spot checks', () => {
  it('matches Python %.6g formatting', () => {
    expect(formatG(0.5)).toBe('0.5');
    expect(formatG(1 / 3)).toBe('0.333333');
    expect(formatG(10000)).toBe('10000');
    expect(formatG(0.000081)).toBe('8.1e-05');
  });
});
