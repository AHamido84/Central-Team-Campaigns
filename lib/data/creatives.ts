import "server-only";
import { scopeToUser, type AuthUser } from "@/lib/auth/permissions";
import { addDays, todayISO } from "@/lib/dates";
import { fatigueOf, type FatigueLevel } from "@/lib/metrics/fatigue";
import { groupMetrics, metricsOf, type Metrics } from "@/lib/metrics";
import { getAll, getById } from "@/lib/sheets";
import type { Creative, DailyResult } from "@/types/entities";
import { companyName, CONVERSION_OBJECTIVES } from "./analytics";

export interface CreativeFilters {
  company: string;
  campaign: string;
  status: string;
  type: string;
  designer: string;
  q: string;
}

export interface CreativePerf {
  spend: number;
  impressions: number;
  results: number;
  cpr: number | null;
  ctr: number | null;
  hook: number | null;
  hold: number | null;
  roas: number | null;
}
export interface CreativeRow extends Creative {
  company_name: string;
  campaign_name: string;
  currency: string;
  perf: CreativePerf | null;
  fatigue: FatigueLevel;
}

export const perfOf = (m: Metrics): CreativePerf => ({
  spend: m.spend,
  impressions: m.impressions,
  results: m.results,
  cpr: m.cost_per_result,
  ctr: m.link_clicks ? m.link_ctr : m.ctr,
  hook: m.hook_rate,
  hold: m.hold_rate,
  roas: m.purchase_value > 0 ? m.roas : null,
});

async function scoped(user: AuthUser) {
  const [creatives, companies, campaigns, results] = await Promise.all([getAll("Creatives"), getAll("Companies"), getAll("Campaigns"), getAll("DailyResults")]);
  const allowedCompanies = scopeToUser(user, companies.map((c) => ({ ...c, company_id: c.id })));
  const allowed = new Set(allowedCompanies.map((c) => c.id));
  return {
    creatives: creatives.filter((c) => allowed.has(c.company_id)),
    companies: allowedCompanies,
    campaigns: campaigns.filter((c) => allowed.has(c.company_id)),
    results: results.filter((r) => allowed.has(r.company_id)),
  };
}

function lastDate(rows: DailyResult[]) {
  return rows.reduce((d, r) => (r.date > d ? r.date : d), "");
}

export async function listCreatives(user: AuthUser, f: Partial<CreativeFilters>, locale: string): Promise<CreativeRow[]> {
  const ctx = await scoped(user);
  const cName = new Map(ctx.companies.map((c) => [c.id, companyName(c, locale)]));
  const cCur = new Map(ctx.companies.map((c) => [c.id, c.currency || "SAR"]));
  const campName = new Map(ctx.campaigns.map((c) => [c.id, c.name]));
  const byCreative = new Map<string, DailyResult[]>();
  for (const r of ctx.results) if (r.creative_id) (byCreative.get(r.creative_id) ?? byCreative.set(r.creative_id, []).get(r.creative_id)!).push(r);
  const q = (f.q ?? "").trim().toLowerCase();
  return ctx.creatives
    .filter(
      (c) =>
        (!f.company || c.company_id === f.company) &&
        (!f.campaign || c.campaign_id === f.campaign) &&
        (!f.status ? c.status !== "archived" : c.status === f.status) &&
        (!f.type || c.type === f.type) &&
        (!f.designer || c.designer === f.designer) &&
        (!q || [c.title, c.headline, c.primary_text, ...c.tags].some((s) => s.toLowerCase().includes(q))),
    )
    .map((c) => {
      const rows = byCreative.get(c.id) ?? [];
      return {
        ...c,
        company_name: cName.get(c.company_id) ?? "",
        campaign_name: campName.get(c.campaign_id) ?? "",
        currency: cCur.get(c.company_id) ?? "SAR",
        perf: rows.length ? perfOf(metricsOf(rows)) : null,
        fatigue: rows.length ? fatigueOf(rows, lastDate(rows)).level : "unknown",
      };
    })
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function creativeFilterOptions(user: AuthUser, locale: string) {
  const ctx = await scoped(user);
  const users = await getAll("Users");
  const designers = [...new Set([...users.filter((u) => u.role === "Designer").map((u) => u.name || u.email), ...ctx.creatives.map((c) => c.designer)].filter(Boolean))];
  return {
    companies: ctx.companies.filter((c) => c.status !== "archived").map((c) => ({ id: c.id, name: companyName(c, locale) })),
    campaigns: ctx.campaigns.map((c) => ({ id: c.id, name: c.name, company_id: c.company_id })),
    designers,
    // Leaderboards mix companies; use the shared currency when they all use one, else the default.
    currency: new Set(ctx.companies.map((c) => c.currency || "SAR")).size === 1 ? ctx.companies[0]?.currency || "SAR" : "SAR",
  };
}
export type CreativeOptions = Awaited<ReturnType<typeof creativeFilterOptions>>;

export async function getCreativeDetail(user: AuthUser, id: string, locale: string) {
  const c = await getById("Creatives", id);
  if (!c) return null;
  const ctx = await scoped(user);
  if (!ctx.companies.some((x) => x.id === c.company_id)) return null;
  const versions = (await getAll("CreativeVersions")).filter((v) => v.creative_id === id).sort((a, b) => b.version - a.version);
  const rows = ctx.results.filter((r) => r.creative_id === id);
  const end = lastDate(rows) || addDays(todayISO(), -1);
  const from = addDays(end, -29);
  const daily = [...groupMetrics(rows.filter((r) => r.date >= from), (r) => r.date).entries()].sort(([a], [b]) => a.localeCompare(b));
  const byAd = [...groupMetrics(rows, (r) => `${r.campaign_id}|${r.ad_name}`).entries()].map(([k, m]) => {
    const [campaignId, adName] = k.split("|");
    return { campaignId, campaign: ctx.campaigns.find((x) => x.id === campaignId)?.name ?? "", adName, perf: perfOf(m) };
  });
  const company = ctx.companies.find((x) => x.id === c.company_id)!;
  return {
    creative: c,
    company: { id: company.id, name: companyName(company, locale), currency: company.currency || "SAR" },
    campaign: ctx.campaigns.find((x) => x.id === c.campaign_id) ?? null,
    versions,
    perf: rows.length ? perfOf(metricsOf(rows)) : null,
    fatigue: fatigueOf(rows, end),
    daily: daily.map(([date, m]) => ({ date, ctr: m.link_clicks ? m.link_ctr : m.ctr, frequency: m.frequency, hook: m.hook_rate, spend: m.spend })),
    byAd,
    lastDate: end,
  };
}

/** Ad names in the results that are not linked to any creative yet, per company. */
export async function unlinkedAds(user: AuthUser, companyId: string) {
  const ctx = await scoped(user);
  const rows = ctx.results.filter((r) => r.company_id === companyId && !r.creative_id && r.ad_name);
  return [...groupMetrics(rows, (r) => r.ad_name).entries()].map(([name, m]) => ({ name, spend: m.spend })).sort((a, b) => b.spend - a.spend);
}

export const LEADERBOARD_METRICS = ["cpr", "ctr", "hook", "hold", "roas"] as const;
export type LeaderboardMetric = (typeof LEADERBOARD_METRICS)[number];

/** Ranks creatives in a period. Minimum 1,000 impressions so tiny samples don't top the list. */
export async function leaderboard(user: AuthUser, opts: { from: string; to: string; company: string; metric: LeaderboardMetric }, locale: string) {
  const ctx = await scoped(user);
  // Cost per result and ROAS only compare lead, sales and message campaigns (an awareness "result" is far cheaper).
  const conversion = new Set(ctx.campaigns.filter((c) => CONVERSION_OBJECTIVES.has(c.objective)).map((c) => c.id));
  const onlyConversion = opts.metric === "cpr" || opts.metric === "roas";
  const rows = ctx.results.filter((r) => r.creative_id && r.date >= opts.from && r.date <= opts.to && (!opts.company || r.company_id === opts.company) && (!onlyConversion || conversion.has(r.campaign_id)));
  const cName = new Map(ctx.companies.map((c) => [c.id, companyName(c, locale)]));
  const creatives = new Map(ctx.creatives.map((c) => [c.id, c]));
  const list = [...groupMetrics(rows, (r) => r.creative_id).entries()]
    .filter(([id, m]) => creatives.has(id) && m.impressions >= 1000)
    .map(([id, m]) => {
      const c = creatives.get(id)!;
      return { id, title: c.title, type: c.type, aspect_ratio: c.aspect_ratio, thumbnail_url: c.thumbnail_url, file_url: c.file_url, designer: c.designer, company: cName.get(c.company_id) ?? "", perf: perfOf(m) };
    })
    .filter((x) => x.perf[opts.metric] !== null);
  const asc = opts.metric === "cpr";
  return list.sort((a, b) => (asc ? a.perf[opts.metric]! - b.perf[opts.metric]! : b.perf[opts.metric]! - a.perf[opts.metric]!)).slice(0, 20);
}
