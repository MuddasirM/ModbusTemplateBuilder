// Parity test for the Kepware bundle. Unlike Argos's suite (which checks the
// TS port against a Python oracle's captured output), Kepware has no external
// reference: this fixture is a small representative input authored alongside
// the serializer, and the assertion is that `buildCsv` is byte-for-byte
// stable across runs - the same input always serializes to the same string.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { buildCsv } from '../buildCsv';
import { validateRow } from '../validate';
import type { Group } from '../../../row';

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, 'fixtures/kepware.json'), 'utf-8'));
const groups = fx.groups as Group[];

describe('buildCsv', () => {
  it('serializes mixed register types, a scaled value, a write tag, and an unscaled value byte-for-byte', () => {
    expect(buildCsv(groups)).toBe(fx.csv);
  });

  it('is stable across repeated runs on the same input', () => {
    const first = buildCsv(groups);
    const second = buildCsv(groups);
    expect(second).toBe(first);
  });

  it('converts addresses for every register type to 6-digit Modbus form', () => {
    const lines = buildCsv(groups).trim().split('\n');
    const [, voltage, status, pump, alarm] = lines;
    expect(voltage.startsWith('Voltage L1,400101,')).toBe(true);  // Holding: 400001 + 100
    expect(status.startsWith('Status Word,300026,')).toBe(true);  // Input:   300001 + 25
    expect(pump.startsWith('Pump Run Cmd,000006,')).toBe(true);   // Coil:    000001 + 5
    expect(alarm.startsWith('Alarm Bit,100013,')).toBe(true);     // Discrete:100001 + 12
  });

  it('emits scaling-derived columns only for scaled points', () => {
    const lines = buildCsv(groups).trim().split('\n');
    expect(lines[1]).toBe('Voltage L1,400101,Word,1,RO,100,Linear,0,32767,0,3276.7,Float,1,1,V,');
    expect(lines[2]).toBe('Status Word,300026,Word,1,RO,100,,,,,,,,,,');
  });

  it('maps write-capable point types to RW/WO client access', () => {
    const lines = buildCsv(groups).trim().split('\n');
    expect(lines[3]).toContain(',RW,');
  });

  it('silently skips empty groups without emitting rows for them', () => {
    const csv = buildCsv(groups);
    expect(csv).not.toContain('Spare');
    expect(csv.trim().split('\n')).toHaveLength(5); // header + 4 points
  });
});

describe('validateRow', () => {
  it('accepts a fully-populated valid row', () => {
    expect(validateRow(groups[0].points[0])).toEqual({});
  });

  it('requires Point Name and Reg. Address', () => {
    const errs = validateRow({ point_name: '', register_index: '' });
    expect(errs.point_name).toBe('Point Name is required.');
    expect(errs.register_index).toBe('Reg. Address is required.');
  });

  it('rejects a zero scaling factor (would divide by zero for Scaled High)', () => {
    const errs = validateRow({ point_name: 'X', register_index: '1', scaling: '0' });
    expect(errs.scaling).toBe('Cannot be zero.');
  });
});
