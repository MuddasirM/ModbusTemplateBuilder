// XML builder, porting build_xml from argos_modbus_builder.py. Instead of going
// through a DOM + minidom pretty-printer, we emit the exact string directly
// (3-space indent, fixed attribute order, self-closed empties, reset id/uid),
// which guarantees byte-for-byte parity with the Python output.

import { xmlEscape } from './format';
import type { Group } from '../../row';

const I = '   '; // 3-space indent, matching minidom toprettyxml(indent="   ")

type Attr = [string, string];

function attrs(pairs: Attr[]): string {
  return pairs.map(([k, v]) => ` ${k}="${xmlEscape(v)}"`).join('');
}

const g = (r: Record<string, string>, k: string): string => (r[k] ?? '') as string;

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

      const pointAttrs: Attr[] = [['id', '0'], ['name', pname]];
      const unit = g(r, 'unit').trim().replaceAll('%', '%25');
      if (unit) pointAttrs.push(['unit', unit]);

      const addrAttrs: Attr[] = [
        ['format', g(r, 'data_format') || 'U16'],
        ['type', g(r, 'register_type') || 'Holding'],
      ];
      const idx = g(r, 'register_index').trim();
      if (idx) addrAttrs.push(['index', idx]);

      const calcAttrs: Attr[] = [['decimals', g(r, 'decimals') || '2']];
      const s = g(r, 'scaling') || '1';
      if (s !== '1') calcAttrs.push(['scaling', s]);
      const mn = g(r, 'min_val').trim();
      const mx = g(r, 'max_val').trim();
      if (mn) calcAttrs.push(['min', mn]);
      if (mx) calcAttrs.push(['max', mx]);

      lines.push(`${I}${I}<Point${attrs(pointAttrs)}>`);
      lines.push(`${I}${I}${I}<Type>ShowValue</Type>`);
      lines.push(`${I}${I}${I}<Address${attrs(addrAttrs)}/>`);
      lines.push(`${I}${I}${I}<Calculate${attrs(calcAttrs)}/>`);
      lines.push(`${I}${I}${I}<Enum/>`);
      lines.push(`${I}${I}</Point>`);
    }
    lines.push(`${I}</Group>`);
  }

  lines.push('</ControllerTemplate>');
  return lines.join('\n') + '\n';
}
