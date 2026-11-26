import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PlatformsPanel } from "@/components/settings/platforms-panel";
import { requirePage } from "@/lib/auth/session";
import { listPlatforms } from "@/lib/data/lookups";

export default async function PlatformsPage() {
  await requirePage("settings:manage");
  const [t, platforms] = await Promise.all([getTranslations(), listPlatforms()]);
  return (
    <>
      <PageHeader title={t("platforms.title")} description={t("platforms.subtitle")} />
      <PlatformsPanel platforms={platforms} />
    </>
  );
}
