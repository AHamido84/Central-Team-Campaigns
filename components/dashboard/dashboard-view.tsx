import Link from "next/link";
import { BarChart3, Upload } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardData } from "@/lib/data/analytics";
import { daysInMonth, todayISO } from "@/lib/dates";
import { DailyCharts, SpendBars, SpendDonut } from "./charts";
import { KpiGrid } from "./kpi-grid";
import { AlertsBadge, AlertsList, NoData, PacingList, Panel, RankingTable, TopAdsTable } from "./panels";

export async function DashboardView({ data, single = false, canImport = false }: { data: DashboardData; single?: boolean; canImport?: boolean }) {
  const t = await getTranslations();
  const { currency, range } = data;
  const today = todayISO();
  const dayShare = Number(today.slice(8)) / daysInMonth(today);
  const prevLabel = t("kpi.vsPrev", { from: range.prevFrom, to: range.prevTo });

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        {t("dashboard.period")}{" "}
        <span className="num" dir="ltr">{range.from} → {range.to}</span>
        {data.kpis[0]?.prev !== null && (
          <>
            {" · "}
            {t("dashboard.comparedTo")} <span className="num" dir="ltr">{range.prevFrom} → {range.prevTo}</span>
          </>
        )}
      </p>

      {!data.hasData ? (
        <EmptyState
          icon={BarChart3}
          title={t("dashboard.emptyTitle")}
          body={t("dashboard.emptyBody")}
          action={canImport ? <Button asChild variant="accent"><Link href="/import"><Upload />{t("nav.import")}</Link></Button> : undefined}
        />
      ) : (
        <KpiGrid kpis={data.kpis} currency={currency} prevLabel={prevLabel} />
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title={t("dashboard.dailyTitle")} description={t("dashboard.dailyHint")} className="xl:col-span-2">
          {data.hasData ? <DailyCharts data={data.daily} currency={currency} /> : <NoData text={t("dashboard.noData")} />}
        </Panel>
        <Panel title={t("alerts.title")} description={t("alerts.hint")} action={<AlertsBadge count={data.alerts.length} />}>
          <AlertsList alerts={data.alerts} currency={currency} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("dashboard.byPlatform")}>{data.byPlatform.length ? <SpendDonut data={data.byPlatform} currency={currency} /> : <NoData text={t("dashboard.noData")} />}</Panel>
        {single ? (
          <Panel title={t("pacing.title")} description={t("pacing.hint")}>
            <PacingList rows={data.pacing} currency={currency} dayShare={dayShare} />
          </Panel>
        ) : (
          <Panel title={t("dashboard.byCompany")}>{data.byCompany.length ? <SpendBars data={data.byCompany} currency={currency} /> : <NoData text={t("dashboard.noData")} />}</Panel>
        )}
      </div>

      {!single && (
        <Panel title={t("pacing.title")} description={t("pacing.hint")}>
          <PacingList rows={data.pacing} currency={currency} dayShare={dayShare} className="grid gap-x-8 gap-y-4 space-y-0 md:grid-cols-2" />
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("dashboard.topCampaigns")} description={t("dashboard.rankHint")}>
          <RankingTable rows={data.topCampaigns} currency={currency} empty={t("dashboard.noData")} />
        </Panel>
        <Panel title={t("dashboard.bottomCampaigns")} description={t("dashboard.bottomHint")}>
          <RankingTable rows={data.bottomCampaigns} currency={currency} empty={t("dashboard.noData")} />
        </Panel>
      </div>
      <Panel title={t("dashboard.topAds")} description={t("dashboard.topAdsHint")}>
        <TopAdsTable rows={data.topAds} currency={currency} />
      </Panel>
    </div>
  );
}
