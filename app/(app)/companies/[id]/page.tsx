import { notFound } from "next/navigation";
import { CalendarDays, FileBarChart, LayoutDashboard, Palette, Pencil, Wallet } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { AdAccountsPanel } from "@/components/companies/ad-accounts-panel";
import { ArchiveCompanyButton } from "@/components/companies/archive-button";
import { CompanyFormDialog } from "@/components/companies/company-form-dialog";
import { CompanyLogo } from "@/components/companies/company-logo";
import { COMPANY_TABS, CompanyTabs, type CompanyTab } from "@/components/companies/company-tabs";
import { CampaignsTable } from "@/components/campaigns/campaigns-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/lib/auth/permissions";
import { requirePage } from "@/lib/auth/session";
import { campaignFormOptions } from "@/lib/data/campaign-options";
import { listAdAccounts, listCampaignRows } from "@/lib/data/campaigns";
import { companyCards, getCompanyForUser } from "@/lib/data/companies";
import { listPlatforms } from "@/lib/data/lookups";
import { formatCurrency, formatNumber } from "@/lib/format";

export default async function CompanyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const user = await requirePage("company:view", id);
  const company = await getCompanyForUser(user, id);
  if (!company) notFound();
  const tab: CompanyTab = (COMPANY_TABS as readonly string[]).includes(rawTab ?? "") ? (rawTab as CompanyTab) : "overview";
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const name = locale === "en" && company.name_en ? company.name_en : company.name_ar;
  const canManage = can(user, "company:manage", id);

  let body: React.ReactNode;
  if (tab === "overview") {
    const card = (await companyCards(user, true)).find((c) => c.company.id === id);
    body = (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>{t("companies.mtdSpend")}</CardDescription>
              <CardTitle className="num text-2xl">{formatCurrency(card?.mtdSpend ?? 0, company.currency, locale, 0)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>{t("companies.f.monthly_budget")}</CardDescription>
              <CardTitle className="num text-2xl">{formatCurrency(card?.budget ?? 0, company.currency, locale, 0)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>{t("companies.activeCampaigns")}</CardDescription>
              <CardTitle className="num text-2xl">{formatNumber(card?.activeCampaigns ?? 0, locale)}</CardTitle>
            </CardHeader>
          </Card>
        </div>
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
        <EmptyState icon={LayoutDashboard} title={t("companies.overviewSoon")} className="py-10" />
      </div>
    );
  } else if (tab === "campaigns") {
    const [rows, options] = await Promise.all([listCampaignRows(user, { companyId: id }), campaignFormOptions(user, locale)]);
    body = <CampaignsTable rows={rows} options={options} canManage={can(user, "campaign:manage", id)} fixedCompanyId={id} defaultBuyer={user.role === "MediaBuyer" ? user.email : undefined} />;
  } else if (tab === "accounts") {
    const [accounts, platforms] = await Promise.all([listAdAccounts(id), listPlatforms()]);
    body = <AdAccountsPanel companyId={id} accounts={accounts} platforms={platforms.filter((p) => p.is_active)} canManage={can(user, "campaign:manage", id)} />;
  } else {
    const soon = { creatives: [Palette, 5], schedule: [CalendarDays, 6], budgets: [Wallet, 7], reports: [FileBarChart, 8] } as const;
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
      <CompanyTabs companyId={id} active={tab} />
      <div className="mt-6">{body}</div>
    </>
  );
}
