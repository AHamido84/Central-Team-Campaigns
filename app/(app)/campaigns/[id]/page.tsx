import Link from "next/link";
import { notFound } from "next/navigation";
import { LineChart, Pencil } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { AdSetsPanel } from "@/components/campaigns/adsets-panel";
import { CampaignFormDialog } from "@/components/campaigns/campaign-form-dialog";
import { DeleteCampaignButton } from "@/components/campaigns/delete-campaign-button";
import { PlatformBadge } from "@/components/platforms/platform-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/lib/auth/permissions";
import { requirePage } from "@/lib/auth/session";
import { campaignFormOptions } from "@/lib/data/campaign-options";
import { listAdSets, listCampaignRows } from "@/lib/data/campaigns";
import { formatCurrency } from "@/lib/format";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePage("campaign:view");
  const locale = await getLocale();
  const row = (await listCampaignRows(user)).find((c) => c.id === id);
  if (!row) notFound();
  const [t, adSets, options] = await Promise.all([getTranslations(), listAdSets(id), campaignFormOptions(user, locale)]);
  const canManage = can(user, "campaign:manage", row.company_id);
  const account = options.adAccounts.find((a) => a.id === row.ad_account_id);

  const details: [string, React.ReactNode][] = [
    [t("campaigns.f.company_id"), <Link key="c" href={`/companies/${row.company_id}`} className="hover:underline">{row.company_name}</Link>],
    [t("campaigns.f.platform_id"), <PlatformBadge key="p" name={row.platform_name} />],
    [t("campaigns.f.ad_account_id"), account?.account_name ?? "—"],
    [t("campaigns.f.objective"), t(`campaigns.objective.${row.objective}`)],
    [t("campaigns.col.dates"), <span key="d" dir="ltr" className="num">{row.start_date || "—"} → {row.end_date || "…"}</span>],
    [t("campaigns.f.budget"), <span key="b" className="num">{formatCurrency(row.budget, row.company_currency, locale, 0)} · {t(`campaigns.budgetType.${row.budget_type}`)}</span>],
    [t("campaigns.f.media_buyer"), row.media_buyer_name || "—"],
    [t("campaigns.f.external_campaign_id"), <span key="e" className="num">{row.external_campaign_id || "—"}</span>],
  ];

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{row.company_name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{row.name}</h1>
            <StatusBadge status={row.status} />
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <CampaignFormDialog campaign={row} options={options} trigger={<Button variant="outline"><Pencil />{t("common.edit")}</Button>} />
            {can(user, "company:manage", row.company_id) && <DeleteCampaignButton id={row.id} />}
          </div>
        )}
      </div>
      <div className="space-y-4">
        <Card>
          <CardContent className="grid gap-x-6 gap-y-4 pt-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {details.map(([k, v]) => (
              <div key={k}>
                <p className="text-muted-foreground">{k}</p>
                <div className="mt-1 font-medium">{v}</div>
              </div>
            ))}
            {row.notes && (
              <div className="sm:col-span-2 lg:col-span-4">
                <p className="text-muted-foreground">{t("campaigns.f.notes")}</p>
                <p className="mt-1 whitespace-pre-line">{row.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
        <AdSetsPanel campaignId={row.id} adSets={adSets} currency={row.company_currency} canManage={canManage} />
        <EmptyState icon={LineChart} title={t("campaigns.pageSoon")} className="py-10" />
      </div>
    </>
  );
}
