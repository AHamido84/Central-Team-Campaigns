import { Building2 } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { ImportTabs } from "@/components/import/import-tabs";
import { ImportWizard } from "@/components/import/import-wizard";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePage } from "@/lib/auth/session";
import { importSetup } from "@/lib/data/import";

export const metadata = { title: "Import results" };

export default async function ImportPage() {
  const user = await requirePage("results:import");
  const locale = await getLocale();
  const [t, setup] = await Promise.all([getTranslations(), importSetup(user, locale)]);
  return (
    <>
      <PageHeader title={t("nav.import")} description={t("import.subtitle")} />
      <ImportTabs active="upload" />
      {setup.companies.length === 0 ? (
        <EmptyState icon={Building2} title={t("companies.emptyTitle")} body={t("companies.emptyScoped")} />
      ) : (
        <ImportWizard {...setup} />
      )}
    </>
  );
}
