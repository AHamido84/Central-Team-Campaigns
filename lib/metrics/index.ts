/**
 * All metric math lives here.
 *
 * RULE: derived metrics (CTR, CPC, CPM, CPL, CPR, ROAS, ...) are ALWAYS
 * computed from summed raw totals, never by averaging per-row ratios.
 * Example: CPL for a month = total spend / total leads.
 */

export const RAW_FIELDS = [
  "spend",
  "impressions",
  "reach",
  "clicks",
  "link_clicks",
  "results",
  "leads",
  "messages",
  "purchases",
  "purchase_value",
  "video_views",
  "video_3s_views",
  "thruplay",
  "engagement",
] as const;
export type RawField = (typeof RAW_FIELDS)[number];
export type Totals = Record<RawField, number> & { rows: number };

export const DERIVED_FIELDS = [
  "ctr",
  "link_ctr",
  "cpc",
  "cost_per_link_click",
  "cpm",
  "frequency",
  "cost_per_result",
  "cpl",
  "cost_per_message",
  "cost_per_purchase",
  "roas",
  "hook_rate",
  "hold_rate",
] as const;
export type DerivedField = (typeof DERIVED_FIELDS)[number];
/** null = not computable (division by zero). */
export type Derived = Record<DerivedField, number | null>;
export type Metrics = Totals & Derived;
export type MetricKey = RawField | DerivedField;

export function emptyTotals(): Totals {
  const t = { rows: 0 } as Totals;
  for (const f of RAW_FIELDS) t[f] = 0;
  return t;
}

type RowLike = Partial<Record<RawField, number | string | null | undefined>>;

export function sumTotals(rows: Iterable<RowLike>): Totals {
  const t = emptyTotals();
  for (const r of rows) {
    t.rows++;
    for (const f of RAW_FIELDS) {
      const v = Number(r[f] ?? 0);
      if (Number.isFinite(v)) t[f] += v;
    }
  }
  return t;
}

export const div = (a: number, b: number): number | null => (b > 0 && Number.isFinite(a) ? a / b : null);

export function derive(t: Totals): Derived {
  return {
    ctr: div(t.clicks, t.impressions),
    link_ctr: div(t.link_clicks, t.impressions),
    cpc: div(t.spend, t.clicks),
    cost_per_link_click: div(t.spend, t.link_clicks),
    cpm: t.impressions > 0 ? (t.spend / t.impressions) * 1000 : null,
    // Note: summed daily reach over-counts unique people, so this is an upper-bound approximation.
    frequency: div(t.impressions, t.reach),
    cost_per_result: div(t.spend, t.results),
    cpl: div(t.spend, t.leads),
    cost_per_message: div(t.spend, t.messages),
    cost_per_purchase: div(t.spend, t.purchases),
    roas: div(t.purchase_value, t.spend),
    hook_rate: div(t.video_3s_views, t.impressions),
    hold_rate: div(t.thruplay, t.video_3s_views),
  };
}

export function metricsOf(rows: Iterable<RowLike>): Metrics {
  const t = sumTotals(rows);
  return { ...t, ...derive(t) };
}

/** Groups rows by a key and computes metrics per group from totals. */
export function groupMetrics<R extends RowLike>(rows: R[], keyOf: (r: R) => string): Map<string, Metrics> {
  const groups = new Map<string, R[]>();
  for (const r of rows) {
    const k = keyOf(r);
    const list = groups.get(k);
    if (list) list.push(r);
    else groups.set(k, [r]);
  }
  const out = new Map<string, Metrics>();
  for (const [k, list] of groups) out.set(k, metricsOf(list));
  return out;
}

/** Whether a higher value is good news (drives the arrow color on KPI cards). */
export const HIGHER_IS_BETTER: Record<MetricKey, boolean | null> = {
  spend: null, // neutral
  impressions: true,
  reach: true,
  clicks: true,
  link_clicks: true,
  results: true,
  leads: true,
  messages: true,
  purchases: true,
  purchase_value: true,
  video_views: true,
  video_3s_views: true,
  thruplay: true,
  engagement: true,
  ctr: true,
  link_ctr: true,
  cpc: false,
  cost_per_link_click: false,
  cpm: false,
  frequency: false,
  cost_per_result: false,
  cpl: false,
  cost_per_message: false,
  cost_per_purchase: false,
  roas: true,
  hook_rate: true,
  hold_rate: true,
};

/** Relative change, e.g. 0.12 = +12%. null when the previous value is 0 or missing. */
export function pctChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}
