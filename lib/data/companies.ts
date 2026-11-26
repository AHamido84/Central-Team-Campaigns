import "server-only";
import { canAccessCompany, scopeToUser, type AuthUser } from "@/lib/auth/permissions";
import { todayISO, monthStart } from "@/lib/dates";
import { metricsOf } from "@/lib/metrics";
import { getAll, getById } from "@/lib/sheets";
import type { Company } from "@/types/entities";

export async function listCompanies(user: AuthUser, opts: { includeArchived?: boolean } = {}): Promise<Company[]> {
  const all = await getAll("Companies");
  const scoped = scopeToUser(user, all.map((c) => ({ ...c, company_id: c.id })));
  return scoped
    .filter((c) => opts.includeArchived || c.status !== "archived")
    .sort((a, b) => a.name_ar.localeCompare(b.name_ar, "ar"));
}

export async function getCompanyForUser(user: AuthUser, id: string): Promise<Company | null> {
  if (!canAccessCompany(user, id)) return null;
  return getById("Companies", id);
}

export interface CompanyCardData {
  company: Company;
  mtdSpend: number;
  activeCampaigns: number;
  budget: number;
}

/** Month-to-date spend and active campaign count for the companies grid. */
export async function companyCards(user: AuthUser, includeArchived = false): Promise<CompanyCardData[]> {
  const [companies, campaigns, results, budgets] = await Promise.all([
    listCompanies(user, { includeArchived }),
    getAll("Campaigns"),
    getAll("DailyResults"),
    getAll("Budgets"),
  ]);
  const today = todayISO();
  const from = monthStart(today);
  const month = today.slice(0, 7);
  return companies.map((company) => {
    const mtd = metricsOf(results.filter((r) => r.company_id === company.id && r.date >= from && r.date <= today));
    const planned = budgets.filter((b) => b.company_id === company.id && b.month === month).reduce((s, b) => s + b.planned_budget, 0);
    return {
      company,
      mtdSpend: mtd.spend,
      activeCampaigns: campaigns.filter((c) => c.company_id === company.id && c.status === "active").length,
      // Planned budgets per platform (Phase 7) win over the company's monthly budget.
      budget: planned > 0 ? planned : company.monthly_budget,
    };
  });
}
