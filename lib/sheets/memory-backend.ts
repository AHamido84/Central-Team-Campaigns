import fs from "node:fs";
import path from "node:path";
import type { Cell, RowUpdate, SheetBackend, TabData } from "./backend";

type Db = { tabs: Record<string, TabData> };

/**
 * Local stand-in for Google Sheets, stored in a JSON file. It keeps the same
 * shape as a spreadsheet (header row + data rows), so everything built on top
 * behaves the same when you switch DATA_BACKEND to "google".
 * The file is re-read on every call so scripts and the dev server stay in sync.
 */
export class MemorySheetBackend implements SheetBackend {
  readonly kind = "memory" as const;
  constructor(private file: string = path.join(process.cwd(), ".data", "db.json")) {}

  private load(): Db {
    try {
      return JSON.parse(fs.readFileSync(this.file, "utf8")) as Db;
    } catch {
      return { tabs: {} };
    }
  }

  private save(db: Db) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, this.file);
  }

  async listTabs() {
    return Object.keys(this.load().tabs);
  }

  async ensureTab(tab: string, headers: string[]) {
    const db = this.load();
    const existing = db.tabs[tab];
    if (!existing) {
      db.tabs[tab] = { headers: [...headers], rows: [] };
      this.save(db);
      return { created: true, addedColumns: [] };
    }
    const addedColumns = headers.filter((h) => !existing.headers.includes(h));
    if (addedColumns.length) {
      existing.headers.push(...addedColumns);
      for (const r of existing.rows) while (r.length < existing.headers.length) r.push("");
      this.save(db);
    }
    return { created: false, addedColumns };
  }

  async readTab(tab: string): Promise<TabData> {
    const t = this.load().tabs[tab];
    if (!t) throw new Error(`Tab "${tab}" does not exist. Run: npm run init-sheets`);
    return { headers: [...t.headers], rows: t.rows.map((r) => [...r]) };
  }

  async readIds(tab: string) {
    return (await this.readTab(tab)).rows.map((r) => String(r[0] ?? ""));
  }

  async appendRows(tab: string, rows: Cell[][]) {
    const db = this.load();
    const t = db.tabs[tab];
    if (!t) throw new Error(`Tab "${tab}" does not exist. Run: npm run init-sheets`);
    t.rows.push(...rows.map((r) => [...r]));
    this.save(db);
  }

  async updateRows(updates: RowUpdate[]) {
    const db = this.load();
    for (const u of updates) {
      const t = db.tabs[u.tab];
      if (!t) throw new Error(`Tab "${u.tab}" does not exist`);
      const idx = u.rowNumber - 2;
      if (idx < 0 || idx >= t.rows.length) throw new Error(`Row ${u.rowNumber} out of range in ${u.tab}`);
      t.rows[idx] = [...u.values];
    }
    this.save(db);
  }
}
