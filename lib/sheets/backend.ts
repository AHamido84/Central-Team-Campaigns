/**
 * Low level, sheet-shaped storage. Both the real Google backend and the local
 * memory backend implement this, so the repository logic is shared and the
 * memory backend behaves like a real spreadsheet (rows, headers, row numbers).
 *
 * Row numbers are 1-based like in Google Sheets; row 1 is the header row.
 */
export type Cell = string | number | boolean;

export interface TabData {
  headers: string[];
  /** Data rows only (sheet row 2 onwards). rows[i] is sheet row i + 2. */
  rows: Cell[][];
}

export interface RowUpdate {
  tab: string;
  rowNumber: number;
  values: Cell[];
}

export interface SheetBackend {
  readonly kind: "google" | "memory";
  listTabs(): Promise<string[]>;
  /** Creates the tab if missing, writes/extends the header row, styles it. */
  ensureTab(tab: string, headers: string[]): Promise<{ created: boolean; addedColumns: string[] }>;
  readTab(tab: string): Promise<TabData>;
  /** Reads only the first column (the id column) to locate rows cheaply. */
  readIds(tab: string): Promise<string[]>;
  appendRows(tab: string, rows: Cell[][]): Promise<void>;
  /** Writes many full rows across tabs in ONE request. */
  updateRows(updates: RowUpdate[]): Promise<void>;
}
