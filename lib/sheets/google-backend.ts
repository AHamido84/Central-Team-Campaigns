import { sheets as sheetsApi, type sheets_v4 } from "@googleapis/sheets";
import { JWT } from "google-auth-library";
import type { Cell, RowUpdate, SheetBackend, TabData } from "./backend";
import { withBackoff } from "./retry";

const APPEND_CHUNK = 2000;
const UPDATE_CHUNK = 400;

/** 0 -> A, 25 -> Z, 26 -> AA ... */
export function columnLetter(index: number): string {
  let s = "";
  let n = index + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const q = (tab: string) => `'${tab.replace(/'/g, "''")}'`;

// Header style: brand navy with white bold text.
const HEADER_BG = { red: 15 / 255, green: 27 / 255, blue: 45 / 255 };

export class GoogleSheetBackend implements SheetBackend {
  readonly kind = "google" as const;
  private api: sheets_v4.Sheets;
  private sheetIds = new Map<string, number>();

  constructor(private spreadsheetId: string, email: string, privateKey: string) {
    const auth = new JWT({
      email,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    this.api = sheetsApi({ version: "v4", auth });
  }

  private async meta() {
    const res = await withBackoff(() =>
      this.api.spreadsheets.get({ spreadsheetId: this.spreadsheetId, fields: "sheets(properties(sheetId,title,gridProperties))" }),
    );
    const list = res.data.sheets ?? [];
    for (const s of list) if (s.properties?.title) this.sheetIds.set(s.properties.title, s.properties.sheetId ?? 0);
    return list;
  }

  async listTabs() {
    return (await this.meta()).map((s) => s.properties?.title ?? "").filter(Boolean);
  }

  async ensureTab(tab: string, headers: string[]) {
    const sheets = await this.meta();
    let props = sheets.find((s) => s.properties?.title === tab)?.properties;
    let created = false;
    const requests: sheets_v4.Schema$Request[] = [];

    if (!props) {
      const res = await withBackoff(() =>
        this.api.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{ addSheet: { properties: { title: tab, gridProperties: { rowCount: 1000, columnCount: headers.length + 2, frozenRowCount: 1 } } } }],
          },
        }),
      );
      props = res.data.replies?.[0]?.addSheet?.properties ?? undefined;
      created = true;
    }
    const sheetId = props?.sheetId ?? 0;
    this.sheetIds.set(tab, sheetId);

    // Never reorder or delete existing columns: only add missing ones at the end.
    const current = created ? [] : await this.readHeader(tab);
    const addedColumns = headers.filter((h) => !current.includes(h));
    const finalHeaders = [...current, ...addedColumns];

    const colCount = props?.gridProperties?.columnCount ?? 26;
    if (finalHeaders.length > colCount) {
      requests.push({ appendDimension: { sheetId, dimension: "COLUMNS", length: finalHeaders.length - colCount } });
    }
    requests.push(
      { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } },
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: finalHeaders.length },
          cell: {
            userEnteredFormat: {
              backgroundColor: HEADER_BG,
              horizontalAlignment: "CENTER",
              textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
            },
          },
          fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
        },
      },
    );
    await withBackoff(() => this.api.spreadsheets.batchUpdate({ spreadsheetId: this.spreadsheetId, requestBody: { requests } }));

    if (addedColumns.length) {
      await withBackoff(() =>
        this.api.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${q(tab)}!A1:${columnLetter(finalHeaders.length - 1)}1`,
          valueInputOption: "RAW",
          requestBody: { values: [finalHeaders] },
        }),
      );
    }
    return { created, addedColumns };
  }

  private async readHeader(tab: string): Promise<string[]> {
    const res = await withBackoff(() => this.api.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `${q(tab)}!1:1` }));
    return (res.data.values?.[0] ?? []).map(String);
  }

  async readTab(tab: string): Promise<TabData> {
    const res = await withBackoff(() =>
      this.api.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: q(tab),
        valueRenderOption: "UNFORMATTED_VALUE",
        dateTimeRenderOption: "FORMATTED_STRING",
      }),
    );
    const values = (res.data.values ?? []) as Cell[][];
    const headers = (values[0] ?? []).map(String);
    const rows = values.slice(1).map((r) => {
      const row = r.slice(0, headers.length);
      while (row.length < headers.length) row.push("");
      return row;
    });
    return { headers, rows };
  }

  async readIds(tab: string): Promise<string[]> {
    const res = await withBackoff(() => this.api.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `${q(tab)}!A2:A` }));
    return (res.data.values ?? []).map((r) => String(r[0] ?? ""));
  }

  async appendRows(tab: string, rows: Cell[][]) {
    for (let i = 0; i < rows.length; i += APPEND_CHUNK) {
      const chunk = rows.slice(i, i + APPEND_CHUNK);
      await withBackoff(() =>
        this.api.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: `${q(tab)}!A1`,
          valueInputOption: "RAW",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values: chunk },
        }),
      );
    }
  }

  async updateRows(updates: RowUpdate[]) {
    for (let i = 0; i < updates.length; i += UPDATE_CHUNK) {
      const chunk = updates.slice(i, i + UPDATE_CHUNK);
      await withBackoff(() =>
        this.api.spreadsheets.values.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            valueInputOption: "RAW",
            data: chunk.map((u) => ({
              range: `${q(u.tab)}!A${u.rowNumber}:${columnLetter(u.values.length - 1)}${u.rowNumber}`,
              values: [u.values],
            })),
          },
        }),
      );
    }
  }
}
