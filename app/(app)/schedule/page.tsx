import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { ScheduleSection } from "@/components/schedule/schedule-section";
import { requirePage } from "@/lib/auth/session";
import type { SearchParams } from "@/lib/filters";

export default async function SchedulePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requirePage("schedule:view");
  const [t, sp] = await Promise.all([getTranslations(), searchParams]);
  return (
    <>
      <PageHeader title={t("nav.schedule")} description={t("schedule.intro")} />
      <ScheduleSection user={user} sp={sp} />
    </>
  );
}
