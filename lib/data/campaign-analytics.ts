import "server-only";
import { addDays, diffDays, todayISO } from "@/lib/dates";
import { previousPeriod, type Filters } from "@/lib/filters";
import { groupMetrics, metricsOf, type Metrics } from "@/lib/metrics";
import { platformMetrics } from "@/lib/metrics/platforms";
import { getAll } from "@/lib/sheets";
import type { Campaign, DailyResult } from "@/types/entities";
import { dailySeries, kpisOf } from "./analytics";

export interface BreakdownRow {
  id: string;
  name: string;
  m: Metrics;
}

const inRange = (rows: DailyResult[], from: string, to: string) => rows.filter((r) => r.date >= from && r.date <= to);

/**
 * Budget pacing for one campaign.
 * Daily budget: expected spend = daily budget x days run so far (up to the end date).
 * Lifetime budget: spend so far vs the lifetime budget, projected to the end date at the current run rate.
 */
export function campaignPacing(c: Campaign, allRows: DailyResult[], today = todayISO()) {
  if (c.budget <= 0 || !c.start_date) return null;
  const spent = allRows.reduce((s, r) => s + r.spend, 0);
  const lastData = allRows.reduce((d, r) => (r.date > d ? r.date : d), "");
  const end = c.end_date && c.end_date < today ? c.end_date : addDays(today, -1);
  const daysRun = Math.max(1, diffDays(c.start_date, lastData && lastData > end ? lastData : end) + 1);
  const totalDays = c.end_date ? Math.max(1, diffDays(c.start_date, c.end_date) + 1) : null;
  if (c.budget_type === "daily") {
    const expected = c.budget * daysRun;
    return { type: "daily" as const, spent, budget: expected, dailyBudget: c.budget, avgDaily: spent / daysRun, daysRun, totalDays, projected: null };
  }
  const projected = totalDays ? (spent / daysRun) * totalDays : null;
  return { type: "lifetime" as const, spent, budget: c.budget, dailyBudget: null, avgDaily: spent / daysRun, daysRun, totalDays, projected };
}

export async function campaignAnalytics(campaign: Campaign, platformName: string, f: Filters) {
  const [results, adSets, logs] = await Promise.all([getAll("DailyResults"), getAll("AdSets"), getAll("ActivityLog")]);
  const rows = results.filter((r) => r.campaign_id === campaign.id);
  const prev = previousPeriod(f.from, f.to);
  const cur = inRange(rows, f.from, f.to);
  const config = platformMetrics(platformName);

  const adSetName = new Map(adSets.filter((a) => a.campaign_id === campaign.id).map((a) => [a.id, a.name]));
  const byAdSet: BreakdownRow[] = [...groupMetrics(cur, (r) => r.adset_id || "_none").entries()].map(([id, m]) => ({ id, name: adSetName.get(id) ?? "", m })).sort((a, b) => b.m.spend - a.m.spend);
  const adLabel = new Map<string, string>();
  for (const r of cur) adLabel.set(r.creative_id || r.ad_name || "_none", r.ad_name);
  const byAd: BreakdownRow[] = [...groupMetrics(cur, (r) => r.creative_id || r.ad_name || "_none").entries()].map(([id, m]) => ({ id, name: adLabel.get(id) ?? "", m })).sort((a, b) => b.m.spend - a.m.spend);

  const adSetIds = new Set(adSetName.keys());
  const activity = logs
    .filter((l) => (l.entity === "Campaign" && l.entity_id === campaign.id) || (l.entity === "AdSet" && adSetIds.has(l.entity_id)))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 15);

  return {
    hasData: cur.length > 0,
    labels: config.labels ?? {},
    kpis: kpisOf(metricsOf(cur), f.compare ? metricsOf(inRange(rows, prev.from, prev.to)) : null, config.kpis),
    breakdownMetrics: config.kpis.filter((k) => ["spend", "impressions", "link_ctr", "ctr", "cpc", "results", "cost_per_result", "cpl", "roas", "hook_rate", "hold_rate", "frequency"].includes(k)).slice(0, 7),
    daily: dailySeries(cur, f.from, f.to),
    byAdSet,
    byAd,
    pacing: campaignPacing(campaign, rows),
    activity,
    range: { from: f.from, to: f.to, prevFrom: prev.from, prevTo: prev.to },
  };
}
