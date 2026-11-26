import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { MappingsPanel } from "@/components/settings/mappings-panel";
import { requirePage } from "@/lib/auth/session";
import { listPlatforms } from "@/lib/data/lookups";
import { getAll } from "@/lib/sheets";

export default async function MappingsPage() {
  await requirePage("settings:manage");
  const [t, mappings, platforms] = await Promise.all([getTranslations(), getAll("ColumnMappings"), listPlatforms()]);
  const groups = platforms
    .map((p) => ({
      platformId: p.id,
      platform: p.name,
      rows: mappings.filter((m) => m.platform_id === p.id).map((m) => ({ id: m.id, column: m.source_column, target: m.target_field, updated: m.updated_at })).sort((a, b) => a.column.localeCompare(b.column)),
    }))
    .filter((g) => g.rows.length);
  return (
    <>
      <PageHeader title={t("settings.mappings.title")} description={t("settings.mappings.subtitle")} />
      <MappingsPanel groups={groups} />
    </>
  );
}
