import { notFound } from "next/navigation";
import { FileBarChart, Pencil } from "lucide-react";
import { BudgetsSection } from "@/components/budgets/budgets-section";
import { ScheduleSection } from "@/components/schedule/schedule-section";
import { ScheduleWidgets } from "@/components/schedule/schedule-widgets";
import { scheduleWidgets } from "@/lib/data/schedule";
import { CreativesSection } from "@/components/creatives/creatives-section";
import { getLocale, getTranslations } from "next-intl/server";
import { AdAccountsPanel } from "@/components/companies/ad-accounts-panel";
import { ArchiveCompanyButton } from "@/components/companies/archive-button";
import { CompanyFormDialog } from "@/components/companies/company-form-dialog";
import { CompanyLogo } from "@/components/companies/company-logo";
import { COMPANY_TABS, CompanyTabs, TAB_PERMISSION, type CompanyTab } from "@/components/companies/company-tabs";
import { CampaignsTable } from "@/components/campaigns/campaigns-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { can, hasPermission } from "@/lib/auth/permissions";
import { requirePage } from "@/lib/auth/session";
import { campaignFormOptions } from "@/lib/data/campaign-options";
import { listAdAccounts, listCampaignRows } from "@/lib/data/campaigns";
import { getCompanyForUser } from "@/lib/data/companies";
import { dashboardData, filterOptions } from "@/lib/data/analytics";
import { parseFilters, type SearchParams } from "@/lib/filters";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { listPlatforms } from "@/lib/data/lookups";

export default async function CompanyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const { id } = await params;
  const sp = await searchParams;
  const rawTab = typeof sp.tab === "string" ? sp.tab : "";
  const user = await requirePage("company:view", id);
  const company = await getCompanyForUser(user, id);
  if (!company) notFound();
  const tabs = COMPANY_TABS.filter((x) => hasPermission(user, TAB_PERMISSION[x]));
  const tab: CompanyTab = (tabs as readonly string[]).includes(rawTab) ? (rawTab as CompanyTab) : tabs[0];
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const name = locale === "en" && company.name_en ? company.name_en : company.name_ar;
  const canManage = can(user, "company:manage", id);

  let body: React.ReactNode;
  if (tab === "overview") {
    const filters = { ...parseFilters(sp), company: id };
    const [data, options, sched] = await Promise.all([dashboardData(user, filters, locale), filterOptions(user, locale), scheduleWidgets(user, locale, id)]);
    body = (
      <div className="space-y-4">
        <Card>
          <CardContent className="grid gap-4 pt-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {(["industry", "account_manager", "currency", "notes"] as const).map((k) => (
              <div key={k}>
                <p className="text-muted-foreground">{t(`companies.f.${k}`)}</p>
                <p className="mt-1 font-medium">{company[k] || "—"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <FilterBar filters={filters} options={options} hideCompany keep={["tab"]} />
        <DashboardView data={data} single canImport={can(user, "results:import", id)} schedule={<ScheduleWidgets w={sched} companyId={id} />} />
      </div>
    );
  } else if (tab === "campaigns") {
    const [rows, options] = await Promise.all([listCampaignRows(user, { companyId: id }), campaignFormOptions(user, locale)]);
    body = <CampaignsTable rows={rows} options={options} canManage={can(user, "campaign:manage", id)} fixedCompanyId={id} defaultBuyer={user.role === "MediaBuyer" ? user.email : undefined} />;
  } else if (tab === "accounts") {
    const [accounts, platforms] = await Promise.all([listAdAccounts(id), listPlatforms()]);
    body = <AdAccountsPanel companyId={id} accounts={accounts} platforms={platforms.filter((p) => p.is_active)} canManage={can(user, "campaign:manage", id)} />;
  } else if (tab === "creatives") {
    body = <CreativesSection user={user} sp={sp} fixedCompanyId={id} />;
  } else if (tab === "schedule") {
    body = <ScheduleSection user={user} sp={sp} fixedCompanyId={id} />;
  } else if (tab === "budgets") {
    body = <BudgetsSection user={user} sp={sp} fixedCompanyId={id} />;
  } else {
    const soon = { reports: [FileBarChart, 8] } as const;
    const [Icon, phase] = soon[tab];
    body = <EmptyState icon={Icon} title={t("soon.title", { section: t(`companies.tabs.${tab}`) })} body={t("soon.body", { phase: t("common.phase", { n: phase }) })} />;
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <CompanyLogo name={company.name_ar} url={company.logo_url} size={56} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
              <StatusBadge status={company.status} />
            </div>
            <p className="text-sm text-muted-foreground">{locale === "en" ? company.name_ar : company.name_en}</p>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <CompanyFormDialog company={company} trigger={<Button variant="outline"><Pencil />{t("common.edit")}</Button>} />
            <ArchiveCompanyButton id={company.id} archived={company.status === "archived"} />
          </div>
        )}
      </div>
      <CompanyTabs companyId={id} active={tab} tabs={tabs} />
      <div className="mt-6">{body}</div>
    </>
  );
}
