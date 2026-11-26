import { getLocale, getTranslations } from "next-intl/server";
import { DailyCharts, SpendDonut } from "@/components/dashboard/charts";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { AlertsList } from "@/components/dashboard/panels";
import { Logo } from "@/components/layout/logo";
import { PlatformDot } from "@/components/platforms/platform-badge";
import type { ReportData } from "@/lib/data/reports";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import type { MetricKey, Metrics } from "@/lib/metrics";
import { fmtMetric } from "@/lib/metric-format";
import { cn } from "@/lib/utils";

const COLS: MetricKey[] = ["spend", "impressions", "link_clicks", "link_ctr", "cpm", "results", "cost_per_result", "leads", "cpl", "roas"];

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("report-section break-inside-avoid", className)}>
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><span className="h-4 w-1 rounded-full bg-brand-accent" />{title}</h2>
      {children}
    </section>
  );
}

async function MetricTable({ rows, nameLabel, currency, extra }: { rows: { id: string; name: string; m: Metrics; sub?: string; dot?: string }[]; nameLabel: string; currency: string; extra?: boolean }) {
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const cols = extra ? COLS : COLS.filter((k) => !["impressions", "cpm"].includes(k));
  return (
    <div className="overflow-x-auto rounded-xl border bg-card print:overflow-visible">
      <table className="report-table w-full text-xs">
        <thead className="bg-brand-primary text-white">
          <tr>
            <th className="report-name px-3 py-2 text-start font-medium">{nameLabel}</th>
            {cols.map((k) => <th key={k} className="whitespace-nowrap px-2 py-2 text-end font-medium">{t(`metrics.${k}`)}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className={cn("border-t", i % 2 === 1 && "bg-muted/40")}>
              <td className="px-3 py-1.5">
                <span className="flex items-center gap-1.5 font-medium">{r.dot && <PlatformDot name={r.dot} className="size-2" />}{r.name}</span>
                {r.sub && <span className="text-[10px] text-muted-foreground">{r.sub}</span>}
              </td>
              {cols.map((k) => <td key={k} className="num whitespace-nowrap px-2 py-1.5 text-end">{fmtMetric(k, r.m[k] as number | null, currency, locale)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The report itself. Used by the preview, the share page and the PDF (which prints the share page). */
export async function ReportDocument({ r }: { r: ReportData }) {
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const p = r.params;
  const cur = r.currency;
  const has = (s: (typeof p.sections)[number]) => p.sections.includes(s);
  const dt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { dateStyle: "long", timeStyle: "short", timeZone: process.env.APP_TIME_ZONE || "Asia/Riyadh" });
  const typeLabel = t(`reports.type.${p.type}`);
  const totals = r.totals;
  return (
    <article className="report-doc space-y-6 bg-background" data-report-ready>
      <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary p-6 text-white print:rounded-none">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size={44} />
            <div>
              <p className="text-sm font-semibold">{t("app.org")}</p>
              <p className="text-xs text-white/70">{t("app.team")}</p>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {r.logo && <img src={r.logo} alt="" className="size-12 rounded-lg bg-white object-contain p-1" />}
        </div>
        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-accent">{typeLabel}</p>
          <h1 className="mt-1 text-2xl font-bold">{r.title || t("reports.allCompanies")}</h1>
          <p className="num mt-2 text-sm text-white/80">
            <span dir="ltr">{p.from} → {p.to}</span>
            {p.compare && <> · {t("dashboard.comparedTo")} <span dir="ltr">{r.dash.range.prevFrom} → {r.dash.range.prevTo}</span></>}
          </p>
        </div>
        <div className="mt-5 h-1 w-16 rounded-full bg-brand-accent" />
      </header>

      {!r.dash.hasData && <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">{t("dashboard.emptyTitle")}</p>}

      {has("kpis") && r.dash.hasData && (
        <Section title={t("reports.sections.kpis")}>
          <KpiGrid kpis={r.dash.kpis} currency={cur} prevLabel="" />
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {t("reports.summary", {
              spend: formatCurrency(totals.spend, cur, locale, 0),
              results: formatNumber(totals.results, locale),
              ctr: totals.link_ctr === null ? "–" : formatPercent(totals.link_ctr, locale),
              cpr: r.conversion.cost_per_result === null ? "–" : formatCurrency(r.conversion.cost_per_result, cur, locale),
            })}
          </p>
        </Section>
      )}

      {has("daily") && r.dash.hasData && (
        <Section title={t("dashboard.dailyTitle")} className="rounded-xl border bg-card p-4">
          <DailyCharts data={r.dash.daily} currency={cur} />
        </Section>
      )}

      {has("platforms") && r.platformLines.length > 0 && (
        <Section title={t("reports.sections.platforms")}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] print:grid-cols-1">
            <div className="rounded-xl border bg-card p-4 print:mx-auto print:w-[320px]"><SpendDonut data={r.dash.byPlatform} currency={cur} /></div>
            <MetricTable rows={r.platformLines.map((l) => ({ ...l, dot: l.name }))} nameLabel={t("filters.platform")} currency={cur} />
          </div>
        </Section>
      )}

      {r.companyLines.length > 1 && has("platforms") && (
        <Section title={t("reports.sections.companies")}>
          <MetricTable rows={r.companyLines} nameLabel={t("filters.company")} currency={cur} extra />
        </Section>
      )}

      {has("campaigns") && r.campaignLines.length > 0 && (
        <Section title={t("reports.sections.campaigns")}>
          <MetricTable rows={r.campaignLines.map((c) => ({ id: c.id, name: c.name, m: c.m, dot: c.platform, sub: `${c.platform} · ${t(`campaigns.objective.${c.objective}`)}${p.type === "company" ? "" : ` · ${c.company}`}` }))} nameLabel={t("campaigns.f.name")} currency={cur} />
        </Section>
      )}

      {has("creatives") && r.creatives.length > 0 && (
        <Section title={t("reports.sections.creatives")}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 print:grid-cols-4">
            {r.creatives.map((c, i) => (
              <div key={c.id} className="rounded-xl border bg-card p-3 text-xs">
                <p className="num text-muted-foreground">#{i + 1}</p>
                <p className="mt-1 line-clamp-2 min-h-8 font-medium">{c.title}</p>
                <dl className="mt-2 grid grid-cols-2 gap-1">
                  <dt className="text-muted-foreground">{t("metrics.cost_per_result")}</dt><dd className="num text-end font-semibold">{c.perf.cpr === null ? "–" : formatCurrency(c.perf.cpr, cur, locale)}</dd>
                  <dt className="text-muted-foreground">CTR</dt><dd className="num text-end">{c.perf.ctr === null ? "–" : formatPercent(c.perf.ctr, locale)}</dd>
                  <dt className="text-muted-foreground">{t("metrics.hook_rate")}</dt><dd className="num text-end">{c.perf.hook === null || !["video", "reel", "story", "UGC"].includes(c.type) ? "–" : formatPercent(c.perf.hook, locale)}</dd>
                </dl>
              </div>
            ))}
          </div>
        </Section>
      )}

      {has("budget") && r.budget && r.budget.plans.some((x) => x.planned > 0) && (
        <Section title={t("reports.sections.budget", { month: r.budget.month })}>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="report-table w-full text-xs">
              <thead className="bg-brand-primary text-white">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">{t("filters.company")}</th>
                  <th className="px-2 py-2 text-end font-medium">{t("budgets.planned")}</th>
                  <th className="px-2 py-2 text-end font-medium">{t("pacing.spent")}</th>
                  <th className="px-2 py-2 text-end font-medium">{t("budgets.used")}</th>
                  <th className="px-2 py-2 text-end font-medium">{t("pacing.projected")}</th>
                  <th className="px-2 py-2 text-end font-medium">{t("budgets.f.target_cpl")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("metrics.cpl")}</th>
                </tr>
              </thead>
              <tbody>
                {r.budget.plans.map((b) => (
                  <tr key={b.id} className="border-t">
                    <td className="px-3 py-1.5 font-medium">{b.name}</td>
                    <td className="num px-2 py-1.5 text-end">{formatCurrency(b.planned, b.currency, locale, 0)}</td>
                    <td className="num px-2 py-1.5 text-end">{formatCurrency(b.spent, b.currency, locale, 0)}</td>
                    <td className={cn("num px-2 py-1.5 text-end", b.planned && b.spent > b.planned && "font-semibold text-destructive")}>{b.planned ? formatPercent(b.spent / b.planned, locale) : "–"}</td>
                    <td className="num px-2 py-1.5 text-end">{formatCurrency(b.projected, b.currency, locale, 0)}</td>
                    <td className="num px-2 py-1.5 text-end">{b.target?.cpl ? formatCurrency(b.target.cpl, b.currency, locale) : "–"}</td>
                    <td className={cn("num px-3 py-1.5 text-end", b.target?.cpl && b.actual.cpl !== null && (b.actual.cpl <= b.target.cpl ? "text-success" : "text-destructive"))}>{b.actual.cpl === null ? "–" : formatCurrency(b.actual.cpl, b.currency, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {has("alerts") && (
        <Section title={t("alerts.title")} className="rounded-xl border bg-card p-4">
          <AlertsList alerts={r.dash.alerts} currency={cur} limit={12} />
        </Section>
      )}

      <footer className="flex items-center justify-between border-t pt-3 text-[11px] text-muted-foreground print:hidden">
        <span>{t("reports.generated")} <span className="num">{dt.format(new Date(r.generatedAt))}</span></span>
        <span>{t("app.name")}</span>
      </footer>
    </article>
  );
}
