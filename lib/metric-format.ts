import { CURRENCY_METRICS, PERCENT_METRICS, RATIO_METRICS } from "@/lib/metrics/platforms";
import type { MetricKey } from "@/lib/metrics";
import { formatCompact, formatCurrency, formatNumber, formatPercent } from "@/lib/format";

/** Formats one metric value for display. null shows a dash. */
export function fmtMetric(key: MetricKey, v: number | null | undefined, currency: string, locale: string, compact = false) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "–";
  if (CURRENCY_METRICS.has(key) && compact && Math.abs(v) >= 100000)
    return new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(v);
  if (CURRENCY_METRICS.has(key)) return formatCurrency(v, currency, locale, key === "spend" || key === "purchase_value" ? 0 : 2);
  if (PERCENT_METRICS.has(key)) return formatPercent(v, locale);
  if (RATIO_METRICS.has(key)) return formatNumber(v, locale, 2) + (key === "roas" ? "x" : "");
  return compact ? formatCompact(v, locale) : formatNumber(v, locale);
}
