// XML import, porting parse_argos_xml from the original implementation using the
// browser DOMParser. Namespace-tolerant via Element.localName. id/uid are
// ignored (reset on re-export).

import { decodeField } from './urlEncoding';
import type { Group, Row } from '../../row';

export interface ParsedXml {
  groups: Group[];
  name: string;
  version: string;
}

function findChild(el: Element, name: string): Element | null {
  for (const c of Array.from(el.children)) {
    if (c.localName === name) return c;
  }
  return null;
}

export function parseArgosXml(xmlText: string): ParsedXml {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) throw new Error('Invalid XML file.');

  const root = doc.documentElement;
  const name = root.getAttribute('name') || 'Imported Template';
  const version = root.getAttribute('version') || '1.0';

  const groups: Group[] = [];

  // Walk Group elements in document order.
  const all = doc.getElementsByTagName('*');
  for (const el of Array.from(all)) {
    if (el.localName !== 'Group') continue;

    const groupName = el.getAttribute('name') || 'Default Group';
    const points: Row[] = [];

    for (const child of Array.from(el.children)) {
      if (child.localName !== 'Point') continue;

      const addr = findChild(child, 'Address');
      const calc = findChild(child, 'Calculate');
      const typeEl = findChild(child, 'Type');
      const enumEl = findChild(child, 'Enum');
      const unit = decodeField(child.getAttribute('unit') || '');

      let enumeration = '';
      if (enumEl) {
        const parts: string[] = [];
        for (const item of Array.from(enumEl.children)) {
          if (item.localName !== 'Item') continue;
          const id = item.getAttribute('id') || '';
          const label = item.getAttribute('label') || '';
          parts.push(`${id}=${label}`);
        }
        enumeration = parts.join(';');
      }

      points.push({
        point_name:     decodeField(child.getAttribute('name') || ''),
        point_type:     (typeEl?.textContent || '').trim() || 'ShowValue',
        register_index: addr ? addr.getAttribute('index') || '' : '',
        group_name:     groupName,
        register_type:  (addr ? addr.getAttribute('type') || '' : '') || 'Holding',
        data_format:    (addr ? addr.getAttribute('format') || '' : '') || 'U16',
        unit,
        scaling:        (calc ? calc.getAttribute('scaling') || '' : '') || '1',
        decimals:       (calc ? calc.getAttribute('decimals') || '' : '') || '2',
        min_val:        calc ? calc.getAttribute('min') || '' : '',
        max_val:        calc ? calc.getAttribute('max') || '' : '',
        enumeration,
        reg_count:      addr ? addr.getAttribute('length') || '' : '',
        bitmask:        addr ? addr.getAttribute('bitmask') || '' : '',
        notes:          '',
      });
    }

    groups.push({ name: groupName, points });
  }

  return { groups, name, version };
}
