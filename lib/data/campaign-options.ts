import "server-only";
import type { AuthUser } from "@/lib/auth/permissions";
import type { CampaignFormOptions } from "@/components/campaigns/campaign-form-dialog";
import { listCompanies } from "./companies";
import { listAdAccounts } from "./campaigns";
import { listMediaBuyers, listPlatforms } from "./lookups";

export async function campaignFormOptions(user: AuthUser, locale: string): Promise<CampaignFormOptions> {
  const [companies, platforms, accounts, buyers] = await Promise.all([
    listCompanies(user),
    listPlatforms({ activeOnly: true }),
    listAdAccounts(),
    listMediaBuyers(),
  ]);
  const allowed = new Set(companies.map((c) => c.id));
  return {
    companies: companies.map((c) => ({ id: c.id, name: locale === "en" && c.name_en ? c.name_en : c.name_ar })),
    platforms: platforms.map((p) => ({ id: p.id, name: p.name })),
    adAccounts: accounts.filter((a) => allowed.has(a.company_id)).map(({ id, company_id, platform_id, account_name }) => ({ id, company_id, platform_id, account_name })),
    mediaBuyers: buyers,
  };
}
