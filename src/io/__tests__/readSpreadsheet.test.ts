// Validates the SheetJS reader against pandas: reads the sample CSV via the
// actual readSpreadsheet() (using jsdom's File), then runs it through the ported
// pipeline and compares to the Python-generated golden.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
// jsdom's File lacks arrayBuffer(); Node's File (matching the browser API) has it.
import { File as NodeFile } from 'node:buffer';

import { readSpreadsheet } from '../readSpreadsheet';
import { autoMap, fileColsOf } from '../../core/variants/argos/mapping';
import { prepareRows } from '../../core/variants/argos/prepareRows';
import { buildXml } from '../../core/variants/argos/buildXml';
import { ARGOS_FIELDS } from '../../core/variants/argos/fields';

const here = dirname(fileURLToPath(import.meta.url));
// here = web/src/io/__tests__  →  up 3 = web/, then public/
const csvPath = join(here, '..', '..', '..', 'public', 'sample_anpl_register_map.csv');
const fx = JSON.parse(
  readFileSync(join(here, '..', '..', 'core', 'variants', 'argos', '__tests__', 'fixtures', 'parity.json'), 'utf-8'),
);

const defaults = Object.fromEntries(ARGOS_FIELDS.map((f) => [f.key, f.default]));

describe('readSpreadsheet (SheetJS) parity with pandas', () => {
  it('reads the sample CSV and produces identical rows + XML', async () => {
    const bytes = readFileSync(csvPath);
    const file = new NodeFile([bytes], 'sample_anpl_register_map.csv', {
      type: 'text/csv',
    }) as unknown as File;

    const grid = await readSpreadsheet(file);
    const cols = fileColsOf(grid);
    const mapping = autoMap(cols);
    const groups = prepareRows(grid, mapping, defaults);
    const rows = groups.flatMap((g) => g.points);

    expect(mapping).toEqual(fx.reader_anpl_csv.mapping);
    expect(rows).toEqual(fx.reader_anpl_csv.rows);
    expect(buildXml(groups, 'ANPL-AME Template', '1.0')).toBe(fx.reader_anpl_csv.xml);
  });
});
