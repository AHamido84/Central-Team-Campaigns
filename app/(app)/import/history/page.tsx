import { getTranslations } from "next-intl/server";
import { ImportHistoryTable } from "@/components/import/history-table";
import { ImportTabs } from "@/components/import/import-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { can } from "@/lib/auth/permissions";
import { requirePage } from "@/lib/auth/session";
import { importHistory } from "@/lib/data/import";

export const metadata = { title: "Import history" };

export default async function ImportHistoryPage() {
  const user = await requirePage("results:import");
  const [t, rows] = await Promise.all([getTranslations(), importHistory(user)]);
  const rollbackable = [...new Set(rows.map((r) => r.company_id))].filter((id) => can(user, "results:import", id));
  return (
    <>
      <PageHeader title={t("nav.import")} description={t("import.subtitle")} />
      <ImportTabs active="history" />
      <ImportHistoryTable rows={rows} rollbackable={rollbackable} />
    </>
  );
}
