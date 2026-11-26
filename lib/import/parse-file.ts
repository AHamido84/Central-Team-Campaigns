"use client";
import Papa from "papaparse";
import type { Cell } from "./transform";

export interface ParsedFile {
  headers: string[];
  rows: Cell[][];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Reads a CSV or Excel file in the browser. Nothing is uploaded until the user confirms. */
export async function parseFile(file: File): Promise<ParsedFile> {
  const name = file.name.toLowerCase();
  let table: Cell[][];
  if (name.endsWith(".csv") || name.endsWith(".txt") || file.type === "text/csv") {
    const text = await file.text();
    const res = Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: "greedy" });
    table = res.data;
  } else if (/\.(xlsx|xls)$/.test(name)) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "", blankrows: false });
    table = raw.map((r) =>
      r.map((c) => (c instanceof Date ? `${c.getFullYear()}-${pad(c.getMonth() + 1)}-${pad(c.getDate())}` : (c as Cell))),
    );
  } else {
    throw new Error("unsupportedFile");
  }
  // Header = first row with at least 2 non-empty cells (Meta sometimes adds a title line).
  const headerIdx = table.findIndex((r) => r.filter((c) => String(c ?? "").trim() !== "").length >= 2);
  if (headerIdx === -1) throw new Error("emptyFile");
  const headers = table[headerIdx].map((h, i) => String(h ?? "").trim() || `Column ${i + 1}`);
  // Make duplicate header names unique so mapping stays one-to-one.
  const seen = new Map<string, number>();
  const unique = headers.map((h) => {
    const n = (seen.get(h) ?? 0) + 1;
    seen.set(h, n);
    return n > 1 ? `${h} (${n})` : h;
  });
  return { headers: unique, rows: table.slice(headerIdx + 1) };
}
