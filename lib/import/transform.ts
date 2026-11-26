import type { PlatformAdapter } from "./adapters/types";
import { DATE_FIELDS, REQUIRED_FIELDS, TARGET_FIELDS, TEXT_FIELDS, type ColumnMapping, type TargetField } from "./fields";
import { cleanNumber, normalizeHeader, parseDate } from "./normalize";

export type Cell = string | number | null | undefined;

/** One cleaned file row, before it is linked to campaigns. */
export interface ImportRow {
  line: number; // 1-based line in the file (header = 1)
  date: string;
  campaign_name: string;
  campaign_external_id: string;
  adset_name: string;
  adset_external_id: string;
  ad_name: string;
  ad_external_id: string;
  result_type: string;
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  link_clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  results: number;
  cost_per_result: number;
  leads: number;
  messages: number;
  purchases: number;
  purchase_value: number;
  roas: number;
  video_views: number;
  video_3s_views: number;
  thruplay: number;
  engagement: number;
  issues: string[];
}

/**
 * Suggests a target field for each column: a saved mapping wins, then the
 * adapter's dictionary. Each target is used once (first column wins).
 */
export function detectMapping(headers: string[], adapter: PlatformAdapter, saved: { source_column: string; target_field: string }[] = []): ColumnMapping {
  const savedMap = new Map(saved.map((s) => [normalizeHeader(s.source_column), s.target_field]));
  const dict = new Map<string, TargetField>();
  for (const f of TARGET_FIELDS) for (const name of adapter.columns[f] ?? []) {
    const k = normalizeHeader(name);
    if (!dict.has(k)) dict.set(k, f);
  }
  const used = new Set<string>();
  const out: ColumnMapping = {};
  for (const h of headers) {
    const k = normalizeHeader(h);
    let target = (savedMap.get(k) ?? dict.get(k) ?? "") as TargetField | "";
    if (target && used.has(target)) target = "";
    if (target) used.add(target);
    out[h] = target;
  }
  return out;
}

export function missingRequired(mapping: ColumnMapping): TargetField[] {
  const mapped = new Set(Object.values(mapping));
  return REQUIRED_FIELDS.filter((f) => !mapped.has(f));
}

const TOTAL_ROW = /^(total|totals|grand total|الاجمالي|الإجمالي|المجموع)/i;

/**
 * Applies the mapping, cleans numbers and dates and flags problems.
 * Rows that are completely empty or Meta "total" summary rows are dropped and
 * counted in `ignored`.
 */
export function transformRows(headers: string[], rows: Cell[][], mapping: ColumnMapping, adapter: PlatformAdapter): { rows: ImportRow[]; ignored: number } {
  const idx: Partial<Record<TargetField, number>> = {};
  headers.forEach((h, i) => {
    const f = mapping[h];
    if (f) idx[f] = i;
  });
  const out: ImportRow[] = [];
  let ignored = 0;

  rows.forEach((raw, r) => {
    if (!raw || raw.every((c) => c === null || c === undefined || String(c).trim() === "")) {
      ignored++;
      return;
    }
    const get = (f: TargetField) => (idx[f] === undefined ? undefined : raw[idx[f]!]);
    const issues: string[] = [];
    const row = { line: r + 2, issues } as ImportRow;

    for (const f of TARGET_FIELDS) {
      if (f === "date_end") continue;
      const v = get(f);
      if (TEXT_FIELDS.has(f)) {
        (row as unknown as Record<string, string>)[f] = v === null || v === undefined ? "" : String(v).trim();
      } else if (DATE_FIELDS.has(f)) {
        const d = parseDate(v);
        row.date = d ?? "";
        if (v !== undefined && v !== null && String(v).trim() !== "" && !d) issues.push("invalidDate");
      } else {
        const n = cleanNumber(v);
        if (n !== null && Number.isNaN(n)) issues.push(`invalidNumber:${f}`);
        (row as unknown as Record<string, number>)[f] = n === null || Number.isNaN(n) ? 0 : n;
      }
    }
    // Meta exports a summary line without a campaign name (or named "Total").
    if (!row.campaign_name && !row.date && TOTAL_ROW.test(String(raw.find((c) => String(c ?? "").trim()) ?? ""))) {
      ignored++;
      return;
    }
    if (!row.campaign_name && !row.campaign_external_id && row.date === "" && !issues.includes("invalidDate")) {
      ignored++; // summary row without date or campaign
      return;
    }
    if (!row.date && !issues.includes("invalidDate")) issues.push("missingDate");
    if (!row.campaign_name && !row.campaign_external_id) issues.push("missingCampaign");
    if (row.spend < 0) issues.push("negativeSpend");

    // Date range rows (Reporting starts != ends) are not daily data.
    const end = parseDate(get("date_end"));
    if (end && row.date && end !== row.date) issues.push("notDaily");

    out.push(adapter.postProcess ? adapter.postProcess(row) : row);
  });
  return { rows: out, ignored };
}

/** Per-row ratios recomputed from the row's raw numbers (file values only as fallback). */
export function rowDerived(r: ImportRow) {
  const d = (a: number, b: number) => (b > 0 ? a / b : 0);
  return {
    ctr: r.impressions > 0 ? d(r.link_clicks || r.clicks, r.impressions) : r.ctr / 100,
    cpc: (r.link_clicks || r.clicks) > 0 ? d(r.spend, r.link_clicks || r.clicks) : r.cpc,
    cpm: r.impressions > 0 ? (r.spend / r.impressions) * 1000 : r.cpm,
    frequency: r.reach > 0 ? d(r.impressions, r.reach) : r.frequency,
    cost_per_result: r.results > 0 ? d(r.spend, r.results) : r.cost_per_result,
    roas: r.spend > 0 && r.purchase_value > 0 ? d(r.purchase_value, r.spend) : r.roas,
  };
}

/** Rows that will be written. */
export const isValid = (r: ImportRow) => r.issues.every((i) => i.startsWith("invalidNumber"));

/** "campaign" | "adset" | "ad" depending on which name columns are mapped. */
export function detectLevel(mapping: ColumnMapping): "campaign" | "adset" | "ad" {
  const v = new Set(Object.values(mapping));
  if (v.has("ad_name") || v.has("ad_external_id")) return "ad";
  if (v.has("adset_name") || v.has("adset_external_id")) return "adset";
  return "campaign";
}
