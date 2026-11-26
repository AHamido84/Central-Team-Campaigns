/* Cleaning helpers shared by the browser (mapping screen) and the server. */

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toLatinDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (d) => String(ARABIC_DIGITS.includes(d) ? ARABIC_DIGITS.indexOf(d) : PERSIAN_DIGITS.indexOf(d)));
}

/** Lowercase, unify Arabic letter forms, drop a currency suffix like "(SAR)", collapse spaces. */
export function normalizeHeader(h: string): string {
  return toLatinDigits(String(h ?? ""))
    .replace(/^﻿/, "")
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "") // harakat + tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\(\s*(?:[a-z]{3}|ر\.?\s?س\.?|ريال)\s*\)/g, "") // (SAR) (USD) (ر.س)
    .replace(/[ـ:*"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalized name used to match campaign / ad set names across files. */
export const normalizeName = (s: string) => normalizeHeader(s).replace(/[\s\-_|]+/g, " ").trim();

/**
 * Turns "SAR 1,234.50", "١٬٢٣٤٫٥", "12.5%", "1.234,5" into numbers.
 * Returns null for empty cells and NaN for text that is not a number.
 */
export function cleanNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  let s = toLatinDigits(String(v)).trim();
  if (s === "" || s === "-" || s === "—" || s === "–") return null;
  s = s.replace(/٬/g, ",").replace(/٫/g, ".").replace(/[\s ‏‎]/g, "");
  // Drop dots that belong to words or symbols ("ر.س", "S.R") before stripping letters.
  s = s.replace(/(?<=[^\d.,\-])\.|\.(?=[^\d.,\-])/g, "");
  const negative = /^\(.*\)$/.test(s) || /^-/.test(s.replace(/[^\d\-.,]/g, ""));
  s = s.replace(/[^\d.,]/g, "");
  if (s === "") return NaN;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // The last separator is the decimal one: 1,234.5 or 1.234,5
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) {
    s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if ((s.match(/\./g) ?? []).length > 1) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return negative ? -n : n;
}

const pad = (n: number) => String(n).padStart(2, "0");
const valid = (y: number, m: number, d: number) => {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/**
 * Accepts 2026-11-05, 2026/11/05, 05/11/2026 (day first), 11/25/2026 (when the
 * first part can't be a month), Excel serial numbers and Date objects.
 * Returns YYYY-MM-DD or null.
 */
export function parseDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  if (typeof v === "number" || /^\d{5}(\.\d+)?$/.test(String(v).trim())) {
    const serial = Number(v);
    if (serial > 30000 && serial < 80000) {
      const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000);
      return d.toISOString().slice(0, 10);
    }
    return null;
  }
  const s = toLatinDigits(String(v)).trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) {
    const [y, mo, d] = [+m[1], +m[2], +m[3]];
    return valid(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) {
    const [a, b, y] = [+m[1], +m[2], +m[3]];
    // Day first (Saudi / Arabic exports) unless the second part can't be a month.
    const [d, mo] = b > 12 ? [b, a] : [a, b];
    return valid(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  return null;
}
