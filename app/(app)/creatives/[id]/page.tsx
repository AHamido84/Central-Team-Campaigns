import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { CreativeStatusBadge, FatigueBadge } from "@/components/creatives/badges";
import { CreativeFormDialog } from "@/components/creatives/creative-form-dialog";
import { CreativeThumb } from "@/components/creatives/creative-thumb";
import { DeleteCreativeButton } from "@/components/creatives/delete-creative-button";
import { FatigueTrend } from "@/components/creatives/fatigue-trend";
import { LinkAdsDialog } from "@/components/creatives/link-ads-dialog";
import { VersionsPanel } from "@/components/creatives/versions-panel";
import { NoData, Panel } from "@/components/dashboard/panels";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { can, hasPermission } from "@/lib/auth/permissions";
import { requirePage } from "@/lib/auth/session";
import { creativeFilterOptions, getCreativeDetail, unlinkedAds } from "@/lib/data/creatives";
import { userNameMap } from "@/lib/data/lookups";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { alertThresholds } from "@/lib/settings";
import { listSchedule, scheduleOptions } from "@/lib/data/schedule";
import { AddScheduleButton } from "@/components/schedule/add-schedule-button";

export default async function CreativePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePage("creative:view");
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const d = await getCreativeDetail(user, id, locale);
  if (!d) notFound();
  const { creative: c, company, perf, fatigue } = d;
  const canManage = can(user, "creative:manage", c.company_id);
  const canLink = canManage || can(user, "campaign:manage", c.company_id);
  const canSchedule = can(user, "schedule:manage", c.company_id);
  const [options, names, th, unlinked, posts, schedOptions] = await Promise.all([
    creativeFilterOptions(user, locale),
    userNameMap(),
    alertThresholds(),
    canLink ? unlinkedAds(user, c.company_id) : Promise.resolve([]),
    listSchedule(user, { from: "0000-01-01", to: "9999-12-31", company: c.company_id }, locale).then((l) => l.filter((e) => e.creative_id === c.id)),
    canSchedule ? scheduleOptions(user, locale) : Promise.resolve(null),
  ]);
  const cur = company.currency;
  const pct = (v: number | null) => (v === null ? "–" : formatPercent(v, locale));

  const kpis: [string, string][] = perf
    ? [
        [t("metrics.spend"), formatCurrency(perf.spend, cur, locale, 0)],
        [t("metrics.impressions"), formatNumber(perf.impressions, locale)],
        [t("metrics.link_ctr"), pct(perf.ctr)],
        [t("metrics.hook_rate"), pct(perf.hook)],
        [t("metrics.hold_rate"), pct(perf.hold)],
        [t("metrics.results"), formatNumber(perf.results, locale)],
        [t("metrics.cost_per_result"), perf.cpr === null ? "–" : formatCurrency(perf.cpr, cur, locale)],
        [t("metrics.roas"), perf.roas === null ? "–" : `${formatNumber(perf.roas, locale, 2)}x`],
      ]
    : [];
  const details: [string, React.ReactNode][] = [
    [t("creatives.f.company_id"), <Link key="co" href={`/companies/${company.id}`} className="hover:underline">{company.name}</Link>],
    [t("creatives.f.campaign_id"), d.campaign ? <Link key="ca" href={`/campaigns/${d.campaign.id}`} className="hover:underline">{d.campaign.name}</Link> : "—"],
    [t("creatives.f.type"), t(`creatives.type.${c.type}`)],
    [t("creatives.f.aspect_ratio"), <span key="ar" className="num">{c.aspect_ratio}</span>],
    [t("creatives.f.designer"), c.designer || "—"],
    [t("creatives.f.copywriter"), c.copywriter || "—"],
    [t("creatives.approvedBy"), c.approved_by ? `${names[c.approved_by] ?? c.approved_by}` : "—"],
    [t("creatives.f.external_ad_id"), <span key="ad" className="num">{c.external_ad_id || "—"}</span>],
  ];

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground"><Link href="/creatives" className="hover:underline">{t("nav.creatives")}</Link> · {company.name}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{c.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CreativeStatusBadge status={c.status} />
            <FatigueBadge level={fatigue.level} />
            <span className="num text-xs text-muted-foreground">v{c.version || 1}</span>
            {c.tags.map((tag) => <span key={tag} className="rounded-full border px-2 py-0.5 text-xs">{tag}</span>)}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {canManage && <CreativeFormDialog creative={c} options={{ ...options, canApprove: hasPermission(user, "creative:approve") }} trigger={<Button variant="outline"><Pencil />{t("common.edit")}</Button>} />}
          {can(user, "creative:approve", c.company_id) && <DeleteCreativeButton id={c.id} />}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CreativeThumb c={c} fit="native" className="mx-auto max-h-[480px] w-full" />
            <div className="space-y-3 p-4 text-sm">
              {c.headline && <p className="font-semibold">{c.headline}</p>}
              {c.primary_text && <p className="whitespace-pre-line text-muted-foreground">{c.primary_text}</p>}
              <div className="flex flex-wrap items-center gap-2">
                {c.cta && <span className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">{c.cta}</span>}
                {c.file_url && (
                  <a href={c.file_url} target="_blank" rel="noreferrer" className="ms-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    {t("creatives.openFile")}<ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {details.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="truncate font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Panel
            title={t("schedule.creativePosts")}
            action={schedOptions ? <AddScheduleButton options={schedOptions} creativeId={c.id} defaultOwner={user.email} canPublish fixedCompanyId={c.company_id} variant="outline" label={t("schedule.scheduleThis")} /> : undefined}
          >
            {posts.length ? (
              <ul className="space-y-1.5 text-sm">
                {posts.map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <span className="num text-xs text-muted-foreground" dir="ltr">{p.scheduled_date} {p.scheduled_time}</span>
                    <span className="truncate">{p.platform_name}</span>
                    <span className={p.effective === "late" ? "ms-auto text-xs text-destructive" : p.effective === "published" ? "ms-auto text-xs text-success" : "ms-auto text-xs text-muted-foreground"}>{t(`schedule.status.${p.effective}`)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t("schedule.noPosts")}</p>
            )}
          </Panel>
          <Panel title={t("creatives.versions")}>
            <VersionsPanel creativeId={c.id} versions={d.versions} current={c.version} canManage={canManage} canApprove={can(user, "creative:approve", c.company_id)} names={names} />
          </Panel>
        </div>

        <div className="min-w-0 space-y-4">
          <Panel title={t("creatives.performance")} description={perf ? t("creatives.perfHint") : undefined} action={canLink ? <LinkAdsDialog creativeId={c.id} ads={unlinked} currency={cur} /> : undefined}>
            {perf ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {kpis.map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-muted/50 p-3">
                    <p className="truncate text-xs text-muted-foreground">{k}</p>
                    <p className="num mt-1 truncate text-lg font-semibold">{v}</p>
                  </div>
                ))}
              </div>
            ) : (
              <NoData text={t("creatives.noPerfLong")} />
            )}
          </Panel>
          {perf && (
            <Panel title={t("creatives.fatigueTitle")} description={t("creatives.fatigueHint", { freq: formatNumber(th.frequencyMax, locale, 1) })} action={<FatigueBadge level={fatigue.level} />}>
              {fatigue.ctrChange !== null && (
                <p className="mb-3 text-sm">
                  {t("creatives.fatigueSummary", { ctr: `${fatigue.ctrChange > 0 ? "+" : ""}${formatPercent(fatigue.ctrChange, locale)}`, freq: fatigue.frequency === null ? "–" : formatNumber(fatigue.frequency, locale, 2) })}
                </p>
              )}
              <FatigueTrend data={d.daily} freqLimit={th.frequencyMax} />
            </Panel>
          )}
          {d.byAd.length > 0 && (
            <Panel title={t("creatives.linkedAds")}>
              <div className="-mx-5">
                <Table>
                  <THead>
                    <TR>
                      <TH className="ps-5">{t("dashboard.ad")}</TH>
                      <TH className="text-end">{t("metrics.spend")}</TH>
                      <TH className="text-end">{t("metrics.link_ctr")}</TH>
                      <TH className="text-end">{t("metrics.hook_rate")}</TH>
                      <TH className="pe-5 text-end">{t("metrics.cost_per_result")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {d.byAd.map((a) => (
                      <TR key={a.campaignId + a.adName}>
                        <TD className="max-w-72 whitespace-normal ps-5">
                          <p className="font-medium">{a.adName}</p>
                          <Link href={`/campaigns/${a.campaignId}`} className="text-xs text-muted-foreground hover:underline">{a.campaign}</Link>
                        </TD>
                        <TD className="num text-end">{formatCurrency(a.perf.spend, cur, locale, 0)}</TD>
                        <TD className="num text-end">{pct(a.perf.ctr)}</TD>
                        <TD className="num text-end">{pct(a.perf.hook)}</TD>
                        <TD className="num pe-5 text-end">{a.perf.cpr === null ? "–" : formatCurrency(a.perf.cpr, cur, locale)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
