import "server-only";
import { ForbiddenError, can, hasPermission, scopeToUser, type AuthUser } from "@/lib/auth/permissions";
import { groupMetrics, metricsOf, type Metrics } from "@/lib/metrics";
import type { ReportParams } from "@/lib/reports/params";
import { getAll } from "@/lib/sheets";
import { budgetOverview } from "./budgets";
import { companyName, CONVERSION_OBJECTIVES, dashboardData } from "./analytics";
import { leaderboard } from "./creatives";

/** Who may run which report. Media buyers only get their own buyer report. */
export function assertCanRunReport(user: AuthUser, p: ReportParams) {
  if (!hasPermission(user, "report:view")) throw new ForbiddenError();
  if (p.type === "company" && (!p.company || !can(user, "report:view", p.company))) throw new ForbiddenError();
  // Media buyers only see their own buyer report.
  if (user.role === "MediaBuyer" && (p.type !== "buyer" || p.buyer !== user.email)) throw new ForbiddenError();
}

export interface CampaignLine {
  id: string;
  name: string;
  company: string;
  platform: string;
  objective: string;
  m: Metrics;
}

export async function buildReport(user: AuthUser, p: ReportParams, locale: string) {
  assertCanRunReport(user, p);
  const filters = { preset: p.preset, from: p.from, to: p.to, compare: p.compare, company: p.company, platform: "", buyer: p.buyer, status: "" };
  const [dash, companies, platforms, campaigns, results, users] = await Promise.all([
    dashboardData(user, filters, locale),
    getAll("Companies"),
    getAll("Platforms", { includeDeleted: true }),
    getAll("Campaigns"),
    getAll("DailyResults"),
    getAll("Users"),
  ]);
  const allowed = new Set(scopeToUser(user, companies.map((c) => ({ ...c, company_id: c.id }))).map((c) => c.id));
  const cName = new Map(companies.map((c) => [c.id, companyName(c, locale)]));
  const pName = new Map(platforms.map((x) => [x.id, x.name]));
  const camps = campaigns.filter((c) => allowed.has(c.company_id) && (!p.company || c.company_id === p.company) && (!p.buyer || c.media_buyer === p.buyer));
  const ids = new Set(camps.map((c) => c.id));
  const rows = results.filter((r) => r.date >= p.from && r.date <= p.to && ids.has(r.campaign_id));

  const byCampaign = groupMetrics(rows, (r) => r.campaign_id);
  const campaignLines: CampaignLine[] = camps
    .filter((c) => byCampaign.has(c.id))
    .map((c) => ({ id: c.id, name: c.name, company: cName.get(c.company_id) ?? "", platform: pName.get(c.platform_id) ?? "", objective: c.objective, m: byCampaign.get(c.id)! }))
    .sort((a, b) => b.m.spend - a.m.spend);
  const platformLines = [...groupMetrics(rows, (r) => r.platform_id).entries()].map(([id, m]) => ({ id, name: pName.get(id) ?? "—", m })).sort((a, b) => b.m.spend - a.m.spend);
  const companyLines = p.type === "company" ? [] : [...groupMetrics(rows, (r) => r.company_id).entries()].map(([id, m]) => ({ id, name: cName.get(id) ?? "—", m })).sort((a, b) => b.m.spend - a.m.spend);
  const conversionRows = rows.filter((r) => CONVERSION_OBJECTIVES.has(camps.find((c) => c.id === r.campaign_id)?.objective ?? ""));

  const company = p.company ? companies.find((c) => c.id === p.company) : undefined;
  const buyerName = p.buyer ? users.find((u) => u.email === p.buyer)?.name || p.buyer : "";
  const month = p.to.slice(0, 7);
  const [creatives, budget] = await Promise.all([
    p.sections.includes("creatives") && p.type !== "buyer" ? leaderboard(user, { from: p.from, to: p.to, company: p.company, metric: "cpr" }, locale) : Promise.resolve([]),
    p.sections.includes("budget") && p.type !== "buyer" ? budgetOverview(user, month, locale, p.company) : Promise.resolve(null),
  ]);
  return {
    params: p,
    title: p.type === "company" ? (company ? companyName(company, locale) : "") : p.type === "buyer" ? buyerName : "",
    currency: company?.currency || dash.currency,
    logo: company?.logo_url ?? "",
    dash,
    totals: metricsOf(rows),
    conversion: metricsOf(conversionRows),
    campaignLines,
    platformLines,
    companyLines,
    creatives: creatives.slice(0, 8),
    budget,
    generatedAt: new Date().toISOString(),
  };
}
export type ReportData = Awaited<ReturnType<typeof buildReport>>;
