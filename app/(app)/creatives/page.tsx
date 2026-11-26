import { getTranslations } from "next-intl/server";
import { CreativesSection } from "@/components/creatives/creatives-section";
import { PageHeader } from "@/components/layout/page-header";
import { requirePage } from "@/lib/auth/session";
import type { SearchParams } from "@/lib/filters";

export default async function CreativesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requirePage("creative:view");
  const [t, sp] = await Promise.all([getTranslations(), searchParams]);
  return (
    <>
      <PageHeader title={t("nav.creatives")} description={t("creatives.intro")} />
      <CreativesSection user={user} sp={sp} />
    </>
  );
}
