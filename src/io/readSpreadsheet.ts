// Browser replacement for pandas.read_csv/read_excel(header=None, dtype=str).
// Returns a rectangular-ish grid of raw string cells with null for empties
// (pandas NaN), which feeds detectHeaderRow / prepareRows unchanged.
//
// CSV  → Papa Parse (handles encoding, quoting, empty lines)
// XLSX → ExcelJS   (cell.text gives the formatted display string)

import Papa from 'papaparse';
import type { CellValue } from '../core/row';

export async function readSpreadsheet(file: File): Promise<CellValue[][]> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ext === 'csv' ? readCsv(file) : readXlsx(file);
}

async function readCsv(file: File): Promise<CellValue[][]> {
  const buf = await file.arrayBuffer();
  const text = new TextDecoder().decode(buf);
  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: true,
  });
  return result.data.map((row) =>
    row.map((cell) => (cell === '' ? null : cell)),
  );
}

async function readXlsx(file: File): Promise<CellValue[][]> {
  const { Workbook } = await import('exceljs');
  const buf = await file.arrayBuffer();
  const wb = new Workbook();
  await wb.xlsx.load(buf);

  const ws = wb.worksheets[0];
  if (!ws) return [];

  const rows: CellValue[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    // row.values is 1-indexed; index 0 is always undefined
    const vals = row.values as (unknown)[];
    const cells: CellValue[] = [];
    for (let i = 1; i < vals.length; i++) {
      const text = row.getCell(i).text;
      cells.push(text === '' ? null : text);
    }
    rows.push(cells);
  });

  return rows;
}
