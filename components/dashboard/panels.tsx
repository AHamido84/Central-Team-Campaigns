import Link from "next/link";
import { AlertTriangle, BellRing, CheckCircle2, OctagonAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { PlatformDot } from "@/components/platforms/platform-badge";
import type { Alert, PacingRow, RankedCampaign } from "@/lib/data/analytics";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Panel({ title, description, children, className, action }: { title: string; description?: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function NoData({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>;
}

/** Month-to-date spend vs budget; the tick marks where spend should be today. */
export function PacingList({ rows, currency, dayShare, className }: { rows: PacingRow[]; currency: string; dayShare: number; className?: string }) {
  const t = useTranslations();
  const locale = useLocale();
  if (!rows.length) return <NoData text={t("dashboard.noData")} />;
  return (
    <ul className={cn("space-y-4", className)}>
      {rows.map((r) => {
        const pct = r.budget > 0 ? r.spent / r.budget : null;
        const proj = r.budget > 0 ? r.projected / r.budget : null;
        const state = pct === null ? "none" : pct > 1 ? "over" : proj !== null && proj > 1.1 ? "fast" : proj !== null && proj < 0.8 ? "slow" : "ok";
        return (
          <li key={r.id}>
            <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2 text-sm">
              <Link href={`/companies/${r.id}`} className="font-medium hover:underline">{r.name}</Link>
              <span className={cn("text-xs", state === "over" ? "text-destructive" : state === "fast" ? "text-warning" : "text-muted-foreground")}>{t(`pacing.${state}`)}</span>
              <span className="num ms-auto text-xs text-muted-foreground">
                {formatCurrency(r.spent, currency, locale, 0)}
                {r.budget > 0 && <> / {formatCurrency(r.budget, currency, locale, 0)}</>}
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-muted">
              {pct !== null && <div className={cn("h-full rounded-full", state === "over" ? "bg-destructive" : state === "fast" ? "bg-warning" : "bg-[var(--series-1)]")} style={{ width: `${Math.min(100, pct * 100)}%` }} />}
              {pct !== null && <div className="absolute -top-1 h-4 w-0.5 rounded bg-foreground/40" style={{ insetInlineStart: `${Math.min(100, dayShare * 100)}%` }} title={t("pacing.todayMark")} />}
            </div>
            {pct !== null && (
              <p className="num mt-1 text-[11px] text-muted-foreground">
                {formatPercent(pct, locale)} · {t("pacing.projected")} {formatCurrency(r.projected, currency, locale, 0)}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function RankingTable({ rows, currency, empty }: { rows: RankedCampaign[]; currency: string; empty: string }) {
  const t = useTranslations();
  const locale = useLocale();
  if (!rows.length) return <NoData text={empty} />;
  return (
    <div className="-mx-5 overflow-x-auto">
      <Table>
        <THead>
          <TR>
            <TH className="ps-5">{t("campaigns.f.name")}</TH>
            <TH className="text-end">{t("metrics.spend")}</TH>
            <TH className="text-end">{t("metrics.results")}</TH>
            <TH className="pe-5 text-end">{t("metrics.cost_per_result")}</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((r) => (
            <TR key={r.id}>
              <TD className="max-w-56 whitespace-normal ps-5">
                <Link href={`/campaigns/${r.id}`} className="block truncate font-medium hover:underline">{r.name}</Link>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><PlatformDot name={r.platform} className="size-2" />{r.platform} ·{r.company}</span>
              </TD>
              <TD className="num text-end">{formatCurrency(r.spend, currency, locale, 0)}</TD>
              <TD className="num text-end">{formatNumber(r.results, locale)}</TD>
              <TD className={cn("num pe-5 text-end font-medium", r.cpr === null && "text-destructive")}>{r.cpr === null ? t("dashboard.noResults") : formatCurrency(r.cpr, currency, locale)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

export function TopAdsTable({ rows, currency }: { rows: { key: string; name: string; company: string; spend: number; results: number; cpr: number | null; ctr: number | null }[]; currency: string }) {
  const t = useTranslations();
  const locale = useLocale();
  if (!rows.length) return <NoData text={t("dashboard.noData")} />;
  return (
    <div className="-mx-5 overflow-x-auto">
      <Table>
        <THead>
          <TR>
            <TH className="ps-5">{t("dashboard.ad")}</TH>
            <TH className="text-end">{t("metrics.spend")}</TH>
            <TH className="text-end">{t("metrics.link_ctr")}</TH>
            <TH className="pe-5 text-end">{t("metrics.cost_per_result")}</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((r) => (
            <TR key={r.key}>
              <TD className="max-w-64 whitespace-normal ps-5">
                <p className="truncate font-medium" title={r.name}>{r.name}</p>
                <span className="text-xs text-muted-foreground">{r.company}</span>
              </TD>
              <TD className="num text-end">{formatCurrency(r.spend, currency, locale, 0)}</TD>
              <TD className="num text-end">{r.ctr === null ? "–" : formatPercent(r.ctr, locale)}</TD>
              <TD className="num pe-5 text-end font-medium">{r.cpr === null ? "–" : formatCurrency(r.cpr, currency, locale)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

function alertValue(a: Alert, currency: string, locale: string) {
  switch (a.type) {
    case "overBudget":
    case "cplAboveTarget":
      return { value: formatCurrency(a.value, currency, locale, a.type === "overBudget" ? 0 : 2), threshold: formatCurrency(a.threshold, currency, locale, a.type === "overBudget" ? 0 : 2) };
    case "lowCtr":
      return { value: formatPercent(a.value, locale), threshold: formatPercent(a.threshold, locale) };
    case "highFrequency":
      return { value: formatNumber(a.value, locale, 2), threshold: formatNumber(a.threshold, locale, 1) };
    case "zeroResults":
      return { value: formatCurrency(a.value, currency, locale, 0), threshold: formatNumber(a.threshold, locale) };
    default:
      return { value: a.value < 0 ? "∞" : formatNumber(a.value, locale), threshold: formatNumber(a.threshold, locale) };
  }
}

/** Status colors with an icon and a label, never color alone. */
export function AlertsList({ alerts, currency, limit = 8 }: { alerts: Alert[]; currency: string; limit?: number }) {
  const t = useTranslations();
  const locale = useLocale();
  if (!alerts.length)
    return (
      <p className="flex items-center gap-2 py-4 text-sm text-success">
        <CheckCircle2 className="size-4" />
        {t("alerts.none")}
      </p>
    );
  return (
    <ul className="divide-y">
      {alerts.slice(0, limit).map((a, i) => {
        const Icon = a.severity === "critical" ? OctagonAlert : AlertTriangle;
        const v = alertValue(a, currency, locale);
        return (
          <li key={i}>
            <Link href={a.href} className="flex items-start gap-3 py-2.5 hover:bg-muted/50 -mx-2 rounded-lg px-2">
              <Icon className={cn("mt-0.5 size-4 shrink-0", a.severity === "critical" ? "text-destructive" : "text-warning")} aria-hidden />
              <div className="min-w-0 text-sm">
                <p className="font-medium">
                  <span className="sr-only">{t(`alerts.severity.${a.severity}`)}: </span>
                  {t(`alerts.type.${a.type}`)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.campaign ? `${a.campaign} · ` : ""}
                  {a.company}
                </p>
                <p className="num text-xs text-muted-foreground">{t(`alerts.detail.${a.type}`, v)}</p>
              </div>
            </Link>
          </li>
        );
      })}
      {alerts.length > limit && <li className="pt-2 text-xs text-muted-foreground">{t("alerts.more", { n: alerts.length - limit })}</li>}
    </ul>
  );
}

export function AlertsBadge({ count }: { count: number }) {
  return count ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
      <BellRing className="size-3" />
      <span className="num">{count}</span>
    </span>
  ) : null;
}
