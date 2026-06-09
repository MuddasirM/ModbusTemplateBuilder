// XML builder, porting build_xml from the original implementation. Instead of going
// through a DOM + minidom pretty-printer, we emit the exact string directly
// (3-space indent, fixed attribute order, self-closed empties, reset id/uid),
// which guarantees byte-for-byte parity with the Python output.

import { xmlEscape } from './format';
import { encodeField } from './urlEncoding';
import type { Group } from '../../row';

const I = '   '; // 3-space indent, matching minidom toprettyxml(indent="   ")

type Attr = [string, string];

function attrs(pairs: Attr[]): string {
  return pairs.map(([k, v]) => ` ${k}="${xmlEscape(v)}"`).join('');
}

const g = (r: Record<string, string>, k: string): string => (r[k] ?? '') as string;

function buildEnumBlock(enumStr: string): string[] {
  const lines: string[] = [];
  const parts = enumStr.split(';');
  const items: string[] = [];
  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const id = part.slice(0, eqIdx).trim();
    if (!id) continue;
    let label = part.slice(eqIdx + 1).trim();
    if (label.startsWith('"') && label.endsWith('"') && label.length >= 2) {
      label = label.slice(1, -1);
    }
    items.push(`${I}${I}${I}${I}<Item${attrs([['id', id], ['label', label]])}/>`);
  }
  if (items.length === 0) {
    lines.push(`${I}${I}${I}<Enum/>`);
  } else {
    lines.push(`${I}${I}${I}<Enum>`);
    for (const item of items) lines.push(item);
    lines.push(`${I}${I}${I}</Enum>`);
  }
  return lines;
}

export function buildXml(
  groups: Group[],
  templateName: string,
  templateVersion: string,
): string {
  const rootAttrs = attrs([
    ['encoding', 'UTF-8'],
    ['name', templateName],
    ['uid', '0'],
    ['version', templateVersion],
  ]);

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8" standalone="no"?>');

  // Walk only non-empty groups; empty ones are omitted.
  const nonEmpty = groups.filter((grp) => grp.points.length > 0);

  if (nonEmpty.length === 0) {
    lines.push(`<ControllerTemplate${rootAttrs}/>`);
    return lines.join('\n') + '\n';
  }

  lines.push(`<ControllerTemplate${rootAttrs}>`);

  for (const grp of nonEmpty) {
    lines.push(`${I}<Group${attrs([['id', '0'], ['name', grp.name], ['uid', '0']])}>`);
    for (const r of grp.points) {
      const pname = g(r, 'point_name').trim();
      if (!pname) continue;

      const pointAttrs: Attr[] = [['id', '0'], ['name', encodeField(pname)]];
      const unit = encodeField(g(r, 'unit').trim());
      if (unit) pointAttrs.push(['unit', unit]);

      const addrAttrs: Attr[] = [
        ['format', g(r, 'data_format') || 'U16'],
        ['type', g(r, 'register_type') || 'Holding'],
      ];
      const idx = g(r, 'register_index').trim();
      if (idx) addrAttrs.push(['index', idx]);
      const rc = g(r, 'reg_count').trim();
      if (rc) addrAttrs.push(['length', rc]);
      const bm = g(r, 'bitmask').trim();
      if (bm) addrAttrs.push(['bitmask', bm]);

      const calcAttrs: Attr[] = [['decimals', g(r, 'decimals') || '2']];
      const s = g(r, 'scaling') || '1';
      if (s !== '1') calcAttrs.push(['scaling', s]);
      const mn = g(r, 'min_val').trim();
      const mx = g(r, 'max_val').trim();
      if (mn) calcAttrs.push(['min', mn]);
      if (mx) calcAttrs.push(['max', mx]);

      const ptype = g(r, 'point_type').trim() || 'ShowValue';

      lines.push(`${I}${I}<Point${attrs(pointAttrs)}>`);
      lines.push(`${I}${I}${I}<Type>${ptype}</Type>`);
      lines.push(`${I}${I}${I}<Address${attrs(addrAttrs)}/>`);
      lines.push(`${I}${I}${I}<Calculate${attrs(calcAttrs)}/>`);
      const enumStr = g(r, 'enumeration').trim();
      for (const line of buildEnumBlock(enumStr)) lines.push(line);
      lines.push(`${I}${I}</Point>`);
    }
    lines.push(`${I}</Group>`);
  }

  lines.push('</ControllerTemplate>');
  return lines.join('\n') + '\n';
}
