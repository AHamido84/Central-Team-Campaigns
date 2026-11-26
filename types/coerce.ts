import { z } from "zod";

/**
 * Google Sheets returns every cell as a string or number (and "" for empty).
 * These helpers turn sheet cells into clean typed values, and are also used
 * to validate form input on the client and the server.
 */
export const zStr = z.preprocess((v) => (v === null || v === undefined ? "" : String(v).trim()), z.string());

export const zNum = z.preprocess((v) => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const cleaned = String(v).replace(/[,\s٬]/g, "").replace(/[^\d.\-eE]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}, z.number());

export const zBool = z.preprocess((v) => {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}, z.boolean());

/** Comma separated list stored in one cell, e.g. company_ids or tags. */
export const zList = z.preprocess((v) => {
  if (Array.isArray(v)) return v.map(String);
  return String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}, z.array(z.string()));

export const zEnum = <T extends [string, ...string[]]>(values: T, fallback: T[number]) =>
  z.preprocess((v) => {
    const s = String(v ?? "").trim();
    return (values as readonly string[]).includes(s) ? s : fallback;
  }, z.enum(values));

/** ISO date string YYYY-MM-DD (or ""). */
export const zDate = z.preprocess((v) => (v === null || v === undefined ? "" : String(v).trim()), z.string());
