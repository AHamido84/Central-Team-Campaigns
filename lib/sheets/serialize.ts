import type { Cell } from "./backend";

export function toCell(v: unknown): Cell {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "number") return Number.isFinite(v) ? v : "";
  if (typeof v === "boolean") return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Builds a sheet row in the sheet's own header order, keeping unknown columns as they are. */
export function toRow(headers: string[], obj: Record<string, unknown>, existing?: Cell[]): Cell[] {
  return headers.map((h, i) => (h in obj ? toCell(obj[h]) : (existing?.[i] ?? "")));
}

export function fromRow(headers: string[], row: Cell[]): Record<string, Cell> {
  const out: Record<string, Cell> = {};
  headers.forEach((h, i) => {
    if (h) out[h] = row[i] ?? "";
  });
  return out;
}
