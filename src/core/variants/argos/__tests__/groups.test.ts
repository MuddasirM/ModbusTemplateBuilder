// Tests for the group-tree model: construction, ordering, round-trip, empty-group handling.

import { describe, it, expect } from 'vitest';
import { prepareRows } from '../prepareRows';
import { buildXml } from '../buildXml';
import { parseArgosXml } from '../parseXml';
import type { CellValue } from '../../../row';

// Minimal grid helper: first row = header, rest = data rows.
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

// ── Group construction ────────────────────────────────────────────────────────

describe('prepareRows → Group[]', () => {
  it('builds one group when all rows share the same group name', () => {
    const g = grid(
      ['No.', 'Name', 'Address', 'Group'],
      ['1', 'Voltage', '100', 'Sensors'],
      ['2', 'Current', '101', 'Sensors'],
    );
    const groups = prepareRows(g, BASE_MAPPING, BASE_DEFAULTS);
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe('Sensors');
    expect(groups[0].points).toHaveLength(2);
    expect(groups[0].points[0].point_name).toBe('Voltage');
    expect(groups[0].points[1].point_name).toBe('Current');
  });

  it('preserves order of first appearance for groups', () => {
    const g = grid(
      ['No.', 'Name', 'Address', 'Group'],
      ['1', 'A', '1', 'Beta'],
      ['2', 'B', '2', 'Alpha'],
      ['3', 'C', '3', 'Beta'],   // Beta again; must NOT create a second Beta group
      ['4', 'D', '4', 'Gamma'],
    );
    const groups = prepareRows(g, BASE_MAPPING, BASE_DEFAULTS);
    expect(groups.map((gr) => gr.name)).toEqual(['Beta', 'Alpha', 'Gamma']);
    // C goes into the existing Beta group, not a new one
    expect(groups[0].points.map((p) => p.point_name)).toEqual(['A', 'C']);
    expect(groups[1].points.map((p) => p.point_name)).toEqual(['B']);
    expect(groups[2].points.map((p) => p.point_name)).toEqual(['D']);
  });

  it('assigns blank/missing group values to "Default Group"', () => {
    const g = grid(
      ['No.', 'Name', 'Address', 'Group'],
      ['1', 'A', '1', ''],
      ['2', 'B', '2', null],
    );
    const groups = prepareRows(g, BASE_MAPPING, BASE_DEFAULTS);
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe('Default Group');
    expect(groups[0].points).toHaveLength(2);
  });

  it('uses default group name when group column is not mapped', () => {
    const mapping = { ...BASE_MAPPING, group_name: null };
    const g = grid(
      ['No.', 'Name', 'Address'],
      ['1', 'A', '1'],
      ['2', 'B', '2'],
    );
    const groups = prepareRows(g, mapping, BASE_DEFAULTS);
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe('Default Group');
  });

  it('returns empty array when no valid rows', () => {
    const g = grid(['No.', 'Name', 'Address']);
    const groups = prepareRows(g, BASE_MAPPING, BASE_DEFAULTS);
    expect(groups).toHaveLength(0);
  });

  it('imports all named rows when No. column is absent', () => {
    const g = grid(
      ['Name', 'Address'],
      ['Voltage', '100'],
      ['Current', '101'],
    );
    const mapping = { ...BASE_MAPPING, register_index: 'Address' };
    const groups = prepareRows(g, mapping, BASE_DEFAULTS);
    expect(groups[0].points).toHaveLength(2);
    expect(groups[0].points[0].point_name).toBe('Voltage');
    expect(groups[0].points[1].point_name).toBe('Current');
  });
});

// ── XML output unchanged ──────────────────────────────────────────────────────

describe('buildXml with Group[]', () => {
  it('produces identical XML regardless of how groups were built (tree vs sorted)', () => {
    // Two groups in source order: A, B
    const groups = [
      {
        name: 'A',
        points: [
          { point_name: 'P1', register_index: '100', group_name: 'A', register_type: 'Holding', data_format: 'U16', unit: '', scaling: '1', decimals: '2', min_val: '', max_val: '' },
        ],
      },
      {
        name: 'B',
        points: [
          { point_name: 'P2', register_index: '200', group_name: 'B', register_type: 'Holding', data_format: 'U16', unit: '', scaling: '1', decimals: '2', min_val: '', max_val: '' },
        ],
      },
    ];
    const xml = buildXml(groups, 'T', '1.0');
    // Group A appears before Group B
    const posA = xml.indexOf('name="A"');
    const posB = xml.indexOf('name="B"');
    expect(posA).toBeGreaterThan(-1);
    expect(posB).toBeGreaterThan(-1);
    expect(posA).toBeLessThan(posB);
    // Points appear under their groups
    expect(xml.indexOf('"P1"')).toBeLessThan(xml.indexOf('"P2"'));
  });

  it('omits empty groups from XML output', () => {
    const groups = [
      { name: 'Full', points: [{ point_name: 'P', register_index: '1', group_name: 'Full', register_type: 'Holding', data_format: 'U16', unit: '', scaling: '1', decimals: '2', min_val: '', max_val: '' }] },
      { name: 'Empty', points: [] },
    ];
    const xml = buildXml(groups, 'T', '1.0');
    expect(xml).toContain('name="Full"');
    expect(xml).not.toContain('name="Empty"');
  });

  it('produces self-closed root when all groups are empty', () => {
    const xml = buildXml([{ name: 'E', points: [] }], 'T', '1.0');
    expect(xml).toContain('<ControllerTemplate');
    expect(xml).toContain('/>');
    expect(xml).not.toContain('<Group');
  });
});

// ── XML parse → buildXml round-trip ──────────────────────────────────────────

describe('parseArgosXml round-trip with groups', () => {
  const INPUT = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<ControllerTemplate encoding="UTF-8" name="Test" uid="0" version="2.0">
   <Group id="0" name="Sensors" uid="0">
      <Point id="0" name="Temp" unit="C">
         <Type>ShowValue</Type>
         <Address format="U16" type="Holding" index="10"/>
         <Calculate decimals="1" scaling="10"/>
         <Enum/>
      </Point>
   </Group>
   <Group id="0" name="Controls" uid="0">
      <Point id="0" name="Setpoint">
         <Type>ShowValue</Type>
         <Address format="S16" type="Holding" index="20"/>
         <Calculate decimals="0"/>
         <Enum/>
      </Point>
   </Group>
</ControllerTemplate>
`;

  it('preserves group order and point membership', () => {
    const parsed = parseArgosXml(INPUT);
    expect(parsed.groups).toHaveLength(2);
    expect(parsed.groups[0].name).toBe('Sensors');
    expect(parsed.groups[0].points[0].point_name).toBe('Temp');
    expect(parsed.groups[1].name).toBe('Controls');
    expect(parsed.groups[1].points[0].point_name).toBe('Setpoint');
  });

  it('rebuilds byte-identical XML', () => {
    const parsed = parseArgosXml(INPUT);
    const out = buildXml(parsed.groups, parsed.name, parsed.version);
    expect(out).toBe(INPUT);
  });
});

// ── Excel round-trip: import → export canonical headers → re-import ───────────

describe('Excel round-trip: canonical headers skip transforms', () => {
  // Simulate an Excel export: uses 'Address' (not 'Address(0x)') and 'Scaling' (not 'Coefficient').
  // Re-importing must NOT re-trigger hex parsing or coefficient inversion.
  it('re-import of canonical headers produces identical rows', () => {
    const original = prepareRows(
      grid(
        ['No.', 'Name', 'Address', 'Scaling', 'Group'],
        ['1', 'Freq', '1000', '100', 'G1'],
      ),
      { ...BASE_MAPPING, scaling: 'Scaling' },
      BASE_DEFAULTS,
    );
    const originalRow = original[0].points[0];

    // Simulate re-import: same data, same canonical headers
    const reImport = prepareRows(
      grid(
        ['No.', 'Name', 'Address', 'Scaling', 'Group'],
        ['1', 'Freq', originalRow.register_index, originalRow.scaling, 'G1'],
      ),
      { ...BASE_MAPPING, scaling: 'Scaling' },
      BASE_DEFAULTS,
    );
    expect(reImport[0].points[0].register_index).toBe(originalRow.register_index);
    expect(reImport[0].points[0].scaling).toBe(originalRow.scaling);
  });

  it('hex transform does NOT fire when source column is "Address" (not "Address(0x)")', () => {
    // '0x64' would be parsed as 100 if hex transform fired; should stay as-is
    const groups = prepareRows(
      grid(
        ['No.', 'Name', 'Address'],
        ['1', 'P', '100'],
      ),
      { ...BASE_MAPPING, group_name: null },
      BASE_DEFAULTS,
    );
    // register_index must be '100' (not re-parsed)
    expect(groups[0].points[0].register_index).toBe('100');
  });

  it('coefficient transform does NOT fire when source column is "Scaling"', () => {
    const groups = prepareRows(
      grid(
        ['No.', 'Name', 'Address', 'Scaling'],
        ['1', 'P', '1', '10'],
      ),
      { ...BASE_MAPPING, scaling: 'Scaling', group_name: null },
      BASE_DEFAULTS,
    );
    // scaling must stay '10', not be inverted to 0.1
    expect(groups[0].points[0].scaling).toBe('10');
  });
});
