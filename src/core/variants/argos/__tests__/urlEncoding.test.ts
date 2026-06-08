// Tests for Argos's URL-encoding/decoding of <Point> name= and unit= at the
// XML file boundary: encodeField/decodeField, and their wiring into
// buildXml/parseArgosXml. CSV/Excel never go through these (vendor data is
// already human-readable), so the internal model and spreadsheet always carry
// decoded values; only the XML text itself carries the encoded form.

import { describe, it, expect } from 'vitest';
import { encodeField, decodeField } from '../urlEncoding';
import { buildXml } from '../buildXml';
import { parseArgosXml } from '../parseXml';
import { prepareRows } from '../prepareRows';
import type { CellValue, Group } from '../../../row';

function grid(header: string[], ...rows: (string | null)[][]): CellValue[][] {
  return [header, ...rows];
}

const BASE_MAPPING = {
  point_name: 'Name',
  register_index: 'Address',
  register_type: null,
  data_format: null,
  unit: null,
  scaling: null,
  decimals: null,
  group_name: 'Group',
  min_val: null,
  max_val: null,
};

const BASE_DEFAULTS = {
  point_name: '',
  register_index: '',
  register_type: 'Holding',
  data_format: 'U16',
  unit: '',
  scaling: '1',
  decimals: '2',
  group_name: 'Default Group',
  min_val: '',
  max_val: '',
};

function point(name: string, unit: string, group: string) {
  return {
    point_name: name,
    register_index: '100',
    group_name: group,
    register_type: 'Holding',
    data_format: 'U16',
    unit,
    scaling: '1',
    decimals: '2',
    min_val: '',
    max_val: '',
  };
}

// ── encodeField / decodeField ─────────────────────────────────────────────────

describe('encodeField', () => {
  it('encodes % first, then , / : #, so escapes are never double-encoded', () => {
    expect(encodeField('50%')).toBe('50%25');
    expect(encodeField('a,b')).toBe('a%2Cb');
    expect(encodeField('a/b')).toBe('a%2Fb');
    expect(encodeField('a:b')).toBe('a%3Ab');
    expect(encodeField('a#b')).toBe('a%23b');
    expect(encodeField('100%,2')).toBe('100%25%2C2');
  });

  it('leaves plain text unaffected', () => {
    expect(encodeField('Grid Frequency')).toBe('Grid Frequency');
    expect(encodeField('Hz')).toBe('Hz');
    expect(encodeField('')).toBe('');
  });
});

describe('decodeField', () => {
  it('decodes standard percent-encoded sequences', () => {
    expect(decodeField('Battery SOC%2C Cabinet 1')).toBe('Battery SOC, Cabinet 1');
    expect(decodeField('A%2FB%3AC%23D')).toBe('A/B:C#D');
    expect(decodeField('50%25')).toBe('50%');
  });

  it('falls back to the raw string when the value is not a valid escape sequence', () => {
    expect(decodeField('100% off')).toBe('100% off');
    expect(decodeField('%E0%A4%A')).toBe('%E0%A4%A');
  });

  it('leaves plain text unaffected', () => {
    expect(decodeField('Grid Frequency')).toBe('Grid Frequency');
    expect(decodeField('')).toBe('');
  });
});

// ── buildXml / parseArgosXml round-trip of encoded name/unit ─────────────────

describe('buildXml encodes Point name=/unit=', () => {
  it('encodes commas in point names', () => {
    const groups: Group[] = [{ name: 'G', points: [point('Battery SOC, Cabinet 1, Energy Storage System', '', 'G')] }];
    const xml = buildXml(groups, 'T', '1.0');
    expect(xml).toContain('name="Battery SOC%2C Cabinet 1%2C Energy Storage System"');
  });

  it('encodes % in units as %25 (existing behaviour, now via encodeField)', () => {
    const groups: Group[] = [{ name: 'G', points: [point('Ratio', '%', 'G')] }];
    const xml = buildXml(groups, 'T', '1.0');
    expect(xml).toContain('unit="%25"');
  });

  it('encodes / : # in names and units', () => {
    const groups: Group[] = [{ name: 'G', points: [point('A/B:C#D', 'm/s', 'G')] }];
    const xml = buildXml(groups, 'T', '1.0');
    expect(xml).toContain('name="A%2FB%3AC%23D"');
    expect(xml).toContain('unit="m%2Fs"');
  });

  it('does not encode Group name= or ControllerTemplate name= (Netbiter does not encode these)', () => {
    const groups: Group[] = [{ name: 'Power, Storage', points: [point('Voltage', '', 'Power, Storage')] }];
    const xml = buildXml(groups, 'Template, Name', '1.0');
    expect(xml).toContain('name="Power, Storage"');
    expect(xml).toContain('name="Template, Name"');
  });

  it('leaves plain names and units unaffected', () => {
    const groups: Group[] = [{ name: 'G', points: [point('Grid Frequency', 'Hz', 'G')] }];
    const xml = buildXml(groups, 'T', '1.0');
    expect(xml).toContain('name="Grid Frequency"');
    expect(xml).toContain('unit="Hz"');
  });
});

describe('parseArgosXml decodes Point name=/unit=', () => {
  it('decodes %2C back to a literal comma in the internal model', () => {
    const xml = buildXml([{ name: 'G', points: [point('Battery SOC, Cabinet 1, Energy Storage System', '', 'G')] }], 'T', '1.0');
    expect(xml).toContain('name="Battery SOC%2C Cabinet 1%2C Energy Storage System"');

    const parsed = parseArgosXml(xml);
    expect(parsed.groups[0].points[0].point_name).toBe('Battery SOC, Cabinet 1, Energy Storage System');
  });

  it('decodes %25 back to a literal % in the internal model', () => {
    const xml = buildXml([{ name: 'G', points: [point('Ratio', '%', 'G')] }], 'T', '1.0');
    expect(xml).toContain('unit="%25"');

    const parsed = parseArgosXml(xml);
    expect(parsed.groups[0].points[0].unit).toBe('%');
  });
});

describe('encode/decode round-trips through buildXml -> parseArgosXml -> buildXml', () => {
  it('round-trips a comma-bearing name with no double-encoding on re-export', () => {
    const groups: Group[] = [{ name: 'G', points: [point('Battery SOC, Cabinet 1', 'V', 'G')] }];
    const xml1 = buildXml(groups, 'T', '1.0');
    const parsed = parseArgosXml(xml1);
    expect(parsed.groups[0].points[0].point_name).toBe('Battery SOC, Cabinet 1');

    const xml2 = buildXml(parsed.groups, parsed.name, parsed.version);
    expect(xml2).toBe(xml1);
    expect(xml2).toContain('name="Battery SOC%2C Cabinet 1"');
  });

  it('round-trips a "%" unit with no double-encoding on re-export (%2525)', () => {
    const groups: Group[] = [{ name: 'G', points: [point('SOC', '%', 'G')] }];
    const xml1 = buildXml(groups, 'T', '1.0');
    expect(xml1).toContain('unit="%25"');
    expect(xml1).not.toContain('%2525');

    const parsed = parseArgosXml(xml1);
    expect(parsed.groups[0].points[0].unit).toBe('%');

    const xml2 = buildXml(parsed.groups, parsed.name, parsed.version);
    expect(xml2).toBe(xml1);
    expect(xml2).toContain('unit="%25"');
    expect(xml2).not.toContain('%2525');
  });

  it('round-trips plain names and units byte-for-byte', () => {
    const groups: Group[] = [{ name: 'G', points: [point('Grid Frequency', 'Hz', 'G')] }];
    const xml1 = buildXml(groups, 'T', '1.0');
    const parsed = parseArgosXml(xml1);
    const xml2 = buildXml(parsed.groups, parsed.name, parsed.version);
    expect(xml2).toBe(xml1);
  });
});

// ── CSV import: never decodes ─────────────────────────────────────────────────

describe('CSV import does not decode point names or units', () => {
  it('stores a literal "%2C" in a point name as-is, not as a decoded comma', () => {
    const g = grid(
      ['No.', 'Name', 'Address', 'Group'],
      ['1', 'Battery SOC%2C Cabinet 1', '100', 'Sensors'],
    );
    const groups = prepareRows(g, BASE_MAPPING, BASE_DEFAULTS);
    expect(groups[0].points[0].point_name).toBe('Battery SOC%2C Cabinet 1');
  });

  it('stores a literal comma in a point name unchanged (vendor CSVs use real characters)', () => {
    const g = grid(
      ['No.', 'Name', 'Address', 'Group'],
      ['1', 'Battery SOC, Cabinet 1', '100', 'Sensors'],
    );
    const groups = prepareRows(g, BASE_MAPPING, BASE_DEFAULTS);
    expect(groups[0].points[0].point_name).toBe('Battery SOC, Cabinet 1');
  });
});

// ── Internal model / spreadsheet always carries decoded values ───────────────

describe('the internal model exposes decoded, human-readable values (what Excel export reads)', () => {
  it('point_name and unit are decoded after an XML import, ready for spreadsheet/Excel display', () => {
    const xml = buildXml([{ name: 'G', points: [point('Battery SOC, Cabinet 1', '%', 'G')] }], 'T', '1.0');
    const parsed = parseArgosXml(xml);
    const p = parsed.groups[0].points[0];
    expect(p.point_name).toBe('Battery SOC, Cabinet 1');
    expect(p.unit).toBe('%');
  });
});
