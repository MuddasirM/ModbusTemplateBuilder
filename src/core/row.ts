// Generic shapes shared by every variant: the wizard moves data through this
// "prepared row/group" form regardless of which output target is selected.

// A spreadsheet cell. null/undefined model pandas NaN (empty cell).
export type CellValue = string | null | undefined;

/** Mirrors pandas pd.isna for our string/null cell model. */
export function isNa(v: CellValue): boolean {
  return v === null || v === undefined;
}

/** A register row: every field key mapped to a string value. */
export type Row = Record<string, string>;

/** One group in the template tree: an ordered collection of points. */
export interface Group {
  name: string;
  points: Row[];
}
