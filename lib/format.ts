/**
 * Number formatting. Arabic UI keeps Latin digits (common in Saudi business
 * reporting and easier to compare); change NUMBER_LOCALE_AR to "ar-SA" for
 * Arabic-Indic digits.
 */
const NUMBER_LOCALE_AR = "ar-SA-u-nu-latn";
const loc = (locale: string) => (locale === "ar" ? NUMBER_LOCALE_AR : "en-US");

export function formatNumber(v: number, locale = "ar", digits = 0) {
  if (!Number.isFinite(v)) return "–";
  return new Intl.NumberFormat(loc(locale), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v);
}

export function formatCurrency(v: number, currency = "SAR", locale = "ar", digits = 2) {
  if (!Number.isFinite(v)) return "–";
  return new Intl.NumberFormat(loc(locale), { style: "currency", currency, maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v);
}

/** Input is a ratio (0.0123 -> 1.23%). Always 2 decimals. */
export function formatPercent(v: number, locale = "ar") {
  if (!Number.isFinite(v)) return "–";
  return new Intl.NumberFormat(loc(locale), { style: "percent", maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(v);
}

export function formatCompact(v: number, locale = "ar") {
  if (!Number.isFinite(v)) return "–";
  return new Intl.NumberFormat(loc(locale), { notation: "compact", maximumFractionDigits: 1 }).format(v);
}
