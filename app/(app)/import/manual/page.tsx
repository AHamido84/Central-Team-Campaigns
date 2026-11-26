import { getLocale, getTranslations } from "next-intl/server";
import { ImportTabs } from "@/components/import/import-tabs";
import { ManualEntryForm } from "@/components/import/manual-entry-form";
import { PageHeader } from "@/components/layout/page-header";
import { requirePage } from "@/lib/auth/session";
import { importSetup } from "@/lib/data/import";
import { getAll } from "@/lib/sheets";

export const metadata = { title: "Manual results" };

export default async function ManualPage() {
  const user = await requirePage("results:import");
  const locale = await getLocale();
  const [t, setup, campaigns, adSets] = await Promise.all([getTranslations(), importSetup(user, locale), getAll("Campaigns"), getAll("AdSets")]);
  const allowed = new Set(setup.companies.map((c) => c.id));
  const options = {
    companies: setup.companies.map(({ id, name }) => ({ id, name })),
    platforms: setup.platforms,
    campaigns: campaigns.filter((c) => allowed.has(c.company_id)).map(({ id, name, company_id, platform_id }) => ({ id, name, company_id, platform_id })),
    adSets: adSets.filter((a) => allowed.has(a.company_id)).map(({ id, name, campaign_id }) => ({ id, name, campaign_id })),
  };
  return (
    <>
      <PageHeader title={t("nav.import")} description={t("import.subtitle")} />
      <ImportTabs active="manual" />
      <ManualEntryForm options={options} />
    </>
  );
}
