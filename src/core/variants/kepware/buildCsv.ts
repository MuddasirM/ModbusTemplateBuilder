// Serializes prepared groups to a Kepware-format CSV: one header row, then
// one row per point, in group order then row order (the format is flat -
// Group is an editing/organisation concept only and is never written out).
// Empty groups are silently skipped, consistent with the XML export's
// omitted-groups behaviour.

import type { Group, Row } from '../../row';
import { csvField, formatScaledHigh, parseStrictFloat, parseStrictInt } from './format';

const HEADER = [
  'Tag Name', 'Address', 'Data Type', 'Respect Data Type', 'Client Access',
  'Scan Rate', 'Scaling', 'Raw Low', 'Raw High', 'Scaled Low', 'Scaled High',
  'Scaled Data Type', 'Clamp Low', 'Clamp High', 'Engineering Units', 'Description',
];

// 6-digit Modbus addressing: offset_base + address, zero-padded to 6 digits.
const REGISTER_OFFSET: Record<string, number> = {
  Holding: 400001,
  Input: 300001,
  Coil: 1,
  Discrete: 100001,
};

const DATA_TYPE_MAP: Record<string, string> = {
  U16: 'Word',
  S16: 'Short',
  U32: 'DWord',
  S32: 'Long',
  Float: 'Float',
  U64: 'QWord',
  Bool: 'Boolean',
};

const CLIENT_ACCESS_MAP: Record<string, string> = {
  ShowValue: 'RO',
  ShowEnum: 'RO',
  SetValue: 'RW',
  SetValueWO: 'WO',
  SetEnum: 'RW',
};

function kepwareAddress(registerType: string, address: number): string {
  const offset = REGISTER_OFFSET[registerType] ?? REGISTER_OFFSET.Holding;
  return String(offset + address).padStart(6, '0');
}

function buildRow(point: Row): string[] | null {
  const name = String(point.point_name ?? '').trim();
  if (!name) return null;

  const registerType = String(point.register_type ?? '').trim() || 'Holding';
  const addrParsed = parseStrictInt(String(point.register_index ?? '').trim());
  const address = kepwareAddress(registerType, addrParsed.ok ? addrParsed.value : 0);

  const dataFormat = String(point.data_format ?? '').trim() || 'U16';
  const dataType = DATA_TYPE_MAP[dataFormat] ?? DATA_TYPE_MAP.U16;

  const pointType = String(point.point_type ?? '').trim() || 'ShowValue';
  const clientAccess = CLIENT_ACCESS_MAP[pointType] ?? CLIENT_ACCESS_MAP.ShowValue;

  const scalingRaw = String(point.scaling ?? '').trim();
  const scalingParsed = parseStrictFloat(scalingRaw);
  const scaling = scalingParsed.ok ? scalingParsed.value : 1;
  const scaled = scaling !== 1;

  const unit = String(point.unit ?? '').trim();

  return [
    name,
    address,
    dataType,
    '1',
    clientAccess,
    '100',
    scaled ? 'Linear' : '',
    scaled ? '0' : '',
    scaled ? '32767' : '',
    scaled ? '0' : '',
    scaled ? formatScaledHigh(scaling) : '',
    scaled ? 'Float' : '',
    scaled ? '1' : '',
    scaled ? '1' : '',
    unit,
    '',
  ];
}

export function buildCsv(groups: Group[]): string {
  const lines = [HEADER.map(csvField).join(',')];
  for (const group of groups) {
    for (const point of group.points) {
      const row = buildRow(point);
      if (row) lines.push(row.map(csvField).join(','));
    }
  }
  return lines.join('\n') + '\n';
}
