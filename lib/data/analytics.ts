import "server-only";
import { scopeToUser, type AuthUser } from "@/lib/auth/permissions";
import { addDays, daysInMonth, diffDays, monthStart, todayISO } from "@/lib/dates";
import { previousPeriod, type Filters } from "@/lib/filters";
import { HIGHER_IS_BETTER, groupMetrics, metricsOf, pctChange, type MetricKey, type Metrics } from "@/lib/metrics";
import { DASHBOARD_KPIS } from "@/lib/metrics/platforms";
import { alertThresholds } from "@/lib/settings";
import { getAll } from "@/lib/sheets";
import type { Campaign, Company, DailyResult } from "@/types/entities";

export interface Kpi {
  key: MetricKey;
  value: number | null;
  prev: number | null;
  change: number | null;
  higherIsBetter: boolean | null;
}
export interface RankedCampaign {
  id: string;
  name: string;
  company: string;
  platform: string;
  spend: number;
  results: number;
  cpr: number | null;
}
export interface Alert {
  type: "overBudget" | "cplAboveTarget" | "highFrequency" | "lowCtr" | "zeroResults" | "noImport";
  severity: "critical" | "warning";
  companyId: string;
  company: string;
  campaignId?: string;
  campaign?: string;
  value: number;
  threshold: number;
  href: string;
}
export interface PacingRow {
  id: string;
  name: string;
  spent: number;
  budget: number;
  projected: number;
}

const val = (m: Metrics, k: MetricKey) => (m[k] as number | null) ?? null;

export function kpisOf(cur: Metrics, prev: Metrics | null, keys: MetricKey[]): Kpi[] {
  return keys.map((key) => ({
    key,
    value: val(cur, key),
    prev: prev ? val(prev, key) : null,
    change: prev ? pctChange(val(cur, key), val(prev, key)) : null,
    higherIsBetter: HIGHER_IS_BETTER[key],
  }));
}

export function dailySeries(rows: DailyResult[], from: string, to: string) {
  const byDate = groupMetrics(rows, (r) => r.date);
  const out: { date: string; spend: number; results: number; leads: number; ctr: number | null; frequency: number | null }[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const m = byDate.get(d);
    out.push({ date: d, spend: Math.round((m?.spend ?? 0) * 100) / 100, results: m?.results ?? 0, leads: m?.leads ?? 0, ctr: m?.link_ctr ?? m?.ctr ?? null, frequency: m?.frequency ?? null });
  }
  return out;
}

/** Everything the dashboards need, loaded once and scoped to the user. */
export async function loadAnalytics(user: AuthUser) {
  const [companies, platforms, campaigns, results, budgets, targets, batches] = await Promise.all([
    getAll("Companies"),
    getAll("Platforms", { includeDeleted: true }),
    getAll("Campaigns"),
    getAll("DailyResults"),
    getAll("Budgets"),
    getAll("Targets"),
    getAll("ImportBatches"),
  ]);
  const scopedCompanies = scopeToUser(user, companies.map((c) => ({ ...c, company_id: c.id }))).filter((c) => c.status !== "archived");
  const allowed = new Set(scopedCompanies.map((c) => c.id));
  return {
    companies: scopedCompanies as Company[],
    platforms,
    campaigns: campaigns.filter((c) => allowed.has(c.company_id)),
    results: results.filter((r) => allowed.has(r.company_id)),
    budgets: budgets.filter((b) => allowed.has(b.company_id)),
    targets: targets.filter((t) => allowed.has(t.company_id)),
    batches: batches.filter((b) => allowed.has(b.company_id)),
  };
}
type Ctx = Awaited<ReturnType<typeof loadAnalytics>>;

/** Applies company / platform / media buyer / status filters (not dates). */
function applyFilters(ctx: Ctx, f: Pick<Filters, "company" | "platform" | "buyer" | "status">) {
  const campaigns = ctx.campaigns.filter(
    (c) => (!f.company || c.company_id === f.company) && (!f.platform || c.platform_id === f.platform) && (!f.buyer || c.media_buyer === f.buyer) && (!f.status || c.status === f.status),
  );
  const ids = new Set(campaigns.map((c) => c.id));
  const narrowed = f.buyer || f.status;
  const results = ctx.results.filter((r) => (!f.company || r.company_id === f.company) && (!f.platform || r.platform_id === f.platform) && (!narrowed || ids.has(r.campaign_id)));
  return { campaigns, results };
}

const inRange = (rows: DailyResult[], from: string, to: string) => rows.filter((r) => r.date >= from && r.date <= to);

/**
 * Cost per result only compares like with like: an awareness "result" (reach) costs far less than a lead.
 * Rankings therefore use conversion objectives only (leads, sales, messages).
 */
export const CONVERSION_OBJECTIVES = new Set(["Leads", "Sales", "Messages"]);

function rank(rows: DailyResult[], campaigns: Campaign[], names: { company: Map<string, string>; platform: Map<string, string> }) {
  const byCampaign = groupMetrics(rows, (r) => r.campaign_id);
  const list: RankedCampaign[] = [];
  for (const c of campaigns) {
    if (!CONVERSION_OBJECTIVES.has(c.objective)) continue;
    const m = byCampaign.get(c.id);
    if (!m || m.spend <= 0) continue;
    list.push({ id: c.id, name: c.name, company: names.company.get(c.company_id) ?? "", platform: names.platform.get(c.platform_id) ?? "", spend: m.spend, results: m.results, cpr: m.cost_per_result });
  }
  const top = list.filter((c) => c.cpr !== null).sort((a, b) => a.cpr! - b.cpr!).slice(0, 5);
  const topIds = new Set(top.map((c) => c.id));
  // Worst first: spending with zero results, then highest cost per result.
  const bottom = list
    .filter((c) => !topIds.has(c.id))
    .sort((a, b) => (a.cpr === null ? (b.cpr === null ? b.spend - a.spend : -1) : b.cpr === null ? 1 : b.cpr - a.cpr))
    .slice(0, 5);
  return { top, bottom };
}

function topAds(rows: DailyResult[], names: { company: Map<string, string> }) {
  const groups = groupMetrics(
    rows.filter((r) => r.ad_name || r.creative_id),
    (r) => `${r.company_id}|${r.creative_id || r.ad_name}`,
  );
  const firstRow = new Map<string, DailyResult>();
  for (const r of rows) {
    const k = `${r.company_id}|${r.creative_id || r.ad_name}`;
    if (!firstRow.has(k)) firstRow.set(k, r);
  }
  return [...groups.entries()]
    .filter(([, m]) => m.results > 0)
    .map(([k, m]) => {
      const r = firstRow.get(k)!;
      return { key: k, name: r.ad_name, creativeId: r.creative_id, company: names.company.get(r.company_id) ?? "", spend: m.spend, results: m.results, cpr: m.cost_per_result, ctr: m.link_ctr ?? m.ctr };
    })
    .sort((a, b) => a.cpr! - b.cpr!)
    .slice(0, 5);
}

export function companyName(c: Company, locale: string) {
  return locale === "en" && c.name_en ? c.name_en : c.name_ar;
}

/** Month-to-date spend vs planned budget per company, with a run-rate projection. */
export function pacing(ctx: Ctx, companyFilter: string, platformFilter: string, locale: string, today = todayISO()): PacingRow[] {
  const from = monthStart(today);
  const month = today.slice(0, 7);
  // Data usually arrives a day late: project from the last day that has data.
  const mtdRows = ctx.results.filter((r) => r.date >= from && r.date <= today && (!platformFilter || r.platform_id === platformFilter));
  const lastDay = mtdRows.reduce((d, r) => (r.date > d ? r.date : d), from);
  const elapsed = Math.max(1, diffDays(from, lastDay) + 1);
  return ctx.companies
    .filter((c) => !companyFilter || c.id === companyFilter)
    .map((c) => {
      const spent = mtdRows.filter((r) => r.company_id === c.id).reduce((s, r) => s + r.spend, 0);
      const planned = ctx.budgets.filter((b) => b.company_id === c.id && b.month === month && (!platformFilter || b.platform_id === platformFilter)).reduce((s, b) => s + b.planned_budget, 0);
      return { id: c.id, name: companyName(c, locale), spent, budget: planned > 0 ? planned : platformFilter ? 0 : c.monthly_budget, projected: (spent / elapsed) * daysInMonth(today) };
    })
    .sort((a, b) => b.spent - a.spent);
}

/** Smart alerts. Always based on recent days, independent of the date filter. */
export async function computeAlerts(ctx: Ctx, f: Pick<Filters, "company" | "platform">, locale: string, today = todayISO()): Promise<Alert[]> {
  const th = await alertThresholds();
  const alerts: Alert[] = [];
  const companies = ctx.companies.filter((c) => !f.company || c.id === f.company);
  const cName = new Map(ctx.companies.map((c) => [c.id, companyName(c, locale)]));
  const results = ctx.results.filter((r) => !f.platform || r.platform_id === f.platform);
  const yesterday = addDays(today, -1);
  const last7 = inRange(results, addDays(today, -7), yesterday);

  // 1. Spend over budget (company month-to-date, campaign lifetime budget).
  for (const p of pacing(ctx, f.company, f.platform, locale, today)) {
    if (p.budget > 0 && p.spent > p.budget) {
      alerts.push({ type: "overBudget", severity: "critical", companyId: p.id, company: p.name, value: p.spent, threshold: p.budget, href: `/companies/${p.id}` });
    }
  }
  const lifetime = groupMetrics(results, (r) => r.campaign_id);
  for (const c of ctx.campaigns) {
    if (c.budget_type !== "lifetime" || c.budget <= 0 || (f.company && c.company_id !== f.company)) continue;
    const spent = lifetime.get(c.id)?.spend ?? 0;
    if (spent > c.budget) alerts.push({ type: "overBudget", severity: "critical", companyId: c.company_id, company: cName.get(c.company_id) ?? "", campaignId: c.id, campaign: c.name, value: spent, threshold: c.budget, href: `/campaigns/${c.id}` });
  }

  // 2. CPL at least X% above target (month to date).
  const month = today.slice(0, 7);
  const mtd = inRange(results, monthStart(today), today);
  for (const t of ctx.targets.filter((t) => t.month === month && t.target_cpl > 0 && (!f.company || t.company_id === f.company))) {
    const m = metricsOf(mtd.filter((r) => r.company_id === t.company_id && (!t.platform_id || r.platform_id === t.platform_id)));
    if (m.cpl !== null && m.cpl >= t.target_cpl * (1 + th.cplOverTargetPct)) {
      alerts.push({ type: "cplAboveTarget", severity: "warning", companyId: t.company_id, company: cName.get(t.company_id) ?? "", value: m.cpl, threshold: t.target_cpl, href: `/companies/${t.company_id}` });
    }
  }

  // 3-5. Per active campaign over the last days.
  const byCampaign7 = groupMetrics(last7, (r) => r.campaign_id);
  const zeroFrom = addDays(today, -th.zeroResultsDays);
  const byCampaignZero = groupMetrics(inRange(results, zeroFrom, yesterday), (r) => r.campaign_id);
  for (const c of ctx.campaigns) {
    if (c.status !== "active" || (f.company && c.company_id !== f.company) || (f.platform && c.platform_id !== f.platform)) continue;
    const base = { companyId: c.company_id, company: cName.get(c.company_id) ?? "", campaignId: c.id, campaign: c.name, href: `/campaigns/${c.id}` };
    const m = byCampaign7.get(c.id);
    if (m && m.frequency !== null && m.frequency > th.frequencyMax) alerts.push({ ...base, type: "highFrequency", severity: "warning", value: m.frequency, threshold: th.frequencyMax });
    const ctr = m ? (m.link_clicks > 0 ? m.link_ctr : m.ctr) : null;
    if (m && m.impressions >= 1000 && ctr !== null && Math.round(ctr * 10000) < Math.round(th.ctrMin * 10000)) alerts.push({ ...base, type: "lowCtr", severity: "warning", value: ctr, threshold: th.ctrMin });
    const z = byCampaignZero.get(c.id);
    if (z && z.spend > 0 && z.results === 0) alerts.push({ ...base, type: "zeroResults", severity: "critical", value: z.spend, threshold: th.zeroResultsDays });
  }

  // 6. No results imported for more than N days (companies with active campaigns).
  for (const c of companies) {
    if (!ctx.campaigns.some((x) => x.company_id === c.id && x.status === "active")) continue;
    const last = ctx.results.filter((r) => r.company_id === c.id).reduce((d, r) => (r.date > d ? r.date : d), "");
    const gap = last ? diffDays(last, today) : Infinity;
    if (gap > th.noImportDays) alerts.push({ type: "noImport", severity: "warning", companyId: c.id, company: cName.get(c.id) ?? "", value: Number.isFinite(gap) ? gap : -1, threshold: th.noImportDays, href: "/import" });
  }

  return alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1));
}

export async function dashboardData(user: AuthUser, f: Filters, locale: string) {
  const ctx = await loadAnalytics(user);
  const { campaigns, results } = applyFilters(ctx, f);
  const prev = previousPeriod(f.from, f.to);
  const cur = inRange(results, f.from, f.to);
  const curM = metricsOf(cur);
  const prevM = f.compare ? metricsOf(inRange(results, prev.from, prev.to)) : null;

  const names = {
    company: new Map(ctx.companies.map((c) => [c.id, companyName(c, locale)])),
    platform: new Map(ctx.platforms.map((p) => [p.id, p.name])),
  };
  // Stable color slot per platform / company (color follows the entity, not its rank).
  const platformOrder = [...ctx.platforms].sort((a, b) => a.name.localeCompare(b.name)).map((p) => p.id);
  const companyOrder = [...ctx.companies].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((c) => c.id);

  const byPlatform = [...groupMetrics(cur, (r) => r.platform_id).entries()]
    .map(([id, m]) => ({ id, name: names.platform.get(id) ?? "—", spend: Math.round(m.spend * 100) / 100, slot: (platformOrder.indexOf(id) % 8) + 1 }))
    .sort((a, b) => b.spend - a.spend);
  const byCompany = [...groupMetrics(cur, (r) => r.company_id).entries()]
    .map(([id, m]) => ({ id, name: names.company.get(id) ?? "—", spend: Math.round(m.spend * 100) / 100, results: m.results, cpr: m.cost_per_result, slot: (companyOrder.indexOf(id) % 8) + 1 }))
    .sort((a, b) => b.spend - a.spend);

  const single = f.company ? ctx.companies.find((c) => c.id === f.company) : undefined;
  const { top, bottom } = rank(cur, campaigns, names);
  const conversionIds = new Set(ctx.campaigns.filter((c) => CONVERSION_OBJECTIVES.has(c.objective)).map((c) => c.id));
  return {
    currency: single?.currency || (await alertThresholds()).currency || "SAR",
    range: { from: f.from, to: f.to, prevFrom: prev.from, prevTo: prev.to },
    hasData: cur.length > 0,
    kpis: kpisOf(curM, prevM, DASHBOARD_KPIS),
    daily: dailySeries(cur, f.from, f.to),
    byPlatform,
    byCompany,
    pacing: pacing(ctx, f.company, f.platform, locale),
    topCampaigns: top,
    bottomCampaigns: bottom,
    topAds: topAds(
      cur.filter((r) => conversionIds.has(r.campaign_id)),
      names,
    ),
    alerts: await computeAlerts(ctx, f, locale),
  };
}
export type DashboardData = Awaited<ReturnType<typeof dashboardData>>;

/** Filter options for the dashboard bar. */
export async function filterOptions(user: AuthUser, locale: string) {
  const ctx = await loadAnalytics(user);
  const users = await getAll("Users");
  const buyers = [...new Set(ctx.campaigns.map((c) => c.media_buyer).filter(Boolean))];
  return {
    companies: ctx.companies.map((c) => ({ id: c.id, name: companyName(c, locale) })),
    platforms: ctx.platforms.filter((p) => p.is_active && !p.is_deleted).map((p) => ({ id: p.id, name: p.name })),
    buyers: buyers.map((e) => ({ id: e, name: users.find((u) => u.email === e)?.name || e })),
  };
}
