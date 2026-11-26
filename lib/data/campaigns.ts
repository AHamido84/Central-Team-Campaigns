import "server-only";
import { canAccessCompany, scopeToUser, type AuthUser } from "@/lib/auth/permissions";
import { groupMetrics, metricsOf, type Metrics } from "@/lib/metrics";
import { getAll, getById } from "@/lib/sheets";
import type { Campaign } from "@/types/entities";

export interface CampaignRow extends Campaign {
  company_name: string;
  company_currency: string;
  platform_name: string;
  media_buyer_name: string;
  spend: number;
  results: number;
  cost_per_result: number | null;
  leads: number;
  cpl: number | null;
}

/** All campaigns the user may see, joined with names and lifetime totals. */
export async function listCampaignRows(user: AuthUser, filter: { companyId?: string } = {}): Promise<CampaignRow[]> {
  const [campaigns, companies, platforms, users, results] = await Promise.all([
    getAll("Campaigns"),
    getAll("Companies", { includeDeleted: true }),
    getAll("Platforms", { includeDeleted: true }),
    getAll("Users"),
    getAll("DailyResults"),
  ]);
  const companyById = new Map(companies.map((c) => [c.id, c]));
  const platformById = new Map(platforms.map((p) => [p.id, p]));
  const userByEmail = new Map(users.map((u) => [u.email, u.name || u.email]));
  const totals = groupMetrics(results, (r) => r.campaign_id);

  return scopeToUser(user, campaigns)
    .filter((c) => !filter.companyId || c.company_id === filter.companyId)
    .map((c) => {
      const m: Metrics = totals.get(c.id) ?? metricsOf([]);
      const company = companyById.get(c.company_id);
      return {
        ...c,
        company_name: company?.name_ar || company?.name_en || "—",
        company_currency: company?.currency || "SAR",
        platform_name: platformById.get(c.platform_id)?.name ?? "—",
        media_buyer_name: userByEmail.get(c.media_buyer) ?? c.media_buyer,
        spend: m.spend,
        results: m.results,
        cost_per_result: m.cost_per_result,
        leads: m.leads,
        cpl: m.cpl,
      };
    })
    .sort((a, b) => (b.start_date || "").localeCompare(a.start_date || ""));
}

export async function getCampaignForUser(user: AuthUser, id: string) {
  const c = await getById("Campaigns", id);
  if (!c || !canAccessCompany(user, c.company_id)) return null;
  return c;
}

export async function listAdSets(campaignId: string) {
  return (await getAll("AdSets")).filter((a) => a.campaign_id === campaignId);
}

export async function listAdAccounts(companyId?: string) {
  return (await getAll("AdAccounts")).filter((a) => !companyId || a.company_id === companyId);
}
