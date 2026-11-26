import { getLocale, getTranslations } from "next-intl/server";
import { CampaignsTable } from "@/components/campaigns/campaigns-table";
import { PageHeader } from "@/components/layout/page-header";
import { can } from "@/lib/auth/permissions";
import { requirePage } from "@/lib/auth/session";
import { campaignFormOptions } from "@/lib/data/campaign-options";
import { listCampaignRows } from "@/lib/data/campaigns";

export const metadata = { title: "Campaigns" };

export default async function CampaignsPage() {
  const user = await requirePage("campaign:view");
  const locale = await getLocale();
  const [t, rows, options] = await Promise.all([getTranslations(), listCampaignRows(user), campaignFormOptions(user, locale)]);
  return (
    <>
      <PageHeader title={t("nav.campaigns")} description={t("campaigns.subtitle")} />
      <CampaignsTable rows={rows} options={options} canManage={can(user, "campaign:manage")} defaultBuyer={user.role === "MediaBuyer" ? user.email : undefined} />
    </>
  );
}
