import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { PageHeader } from "@/components/layout/page-header";
import { hasPermission, homeFor } from "@/lib/auth/permissions";
import { requirePage } from "@/lib/auth/session";
import { dashboardData, filterOptions } from "@/lib/data/analytics";
import { parseFilters, type SearchParams } from "@/lib/filters";
import { scheduleWidgets } from "@/lib/data/schedule";
import { ScheduleWidgets } from "@/components/schedule/schedule-widgets";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requirePage();
  if (!hasPermission(user, "dashboard:view")) redirect(homeFor(user.role));
  const [t, locale, sp] = await Promise.all([getTranslations(), getLocale(), searchParams]);
  const filters = parseFilters(sp);
  const [data, options, sched] = await Promise.all([dashboardData(user, filters, locale), filterOptions(user, locale), scheduleWidgets(user, locale, filters.company)]);
  if (filters.company && !options.companies.some((c) => c.id === filters.company)) filters.company = "";

  return (
    <>
      <PageHeader title={t("dashboard.welcome", { name: user.name })} description={t("dashboard.intro")} />
      <FilterBar filters={filters} options={options} />
      <DashboardView data={data} canImport={hasPermission(user, "results:import")} schedule={<ScheduleWidgets w={sched} />} />
    </>
  );
}
