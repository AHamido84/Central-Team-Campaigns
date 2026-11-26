import { useLocale, useTranslations } from "next-intl";
import type { campaignPacing } from "@/lib/data/campaign-analytics";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type P = NonNullable<ReturnType<typeof campaignPacing>>;

export function CampaignPacing({ p, currency }: { p: P; currency: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const pct = p.budget > 0 ? p.spent / p.budget : 0;
  const ref = p.type === "lifetime" ? (p.projected ?? 0) / p.budget : pct;
  const state = pct > 1.05 ? "over" : ref > 1.1 ? "fast" : ref < 0.8 ? "slow" : "ok";
  const color = state === "over" ? "bg-destructive" : state === "fast" ? "bg-warning" : "bg-[var(--series-1)]";
  const rows: [string, string][] = [
    [t("pacing.spent"), formatCurrency(p.spent, currency, locale, 0)],
    [p.type === "daily" ? t("pacing.expected") : t("pacing.budget"), formatCurrency(p.budget, currency, locale, 0)],
    [t("pacing.avgDaily"), formatCurrency(p.avgDaily, currency, locale, 0)],
  ];
  if (p.dailyBudget !== null) rows.push([t("pacing.dailyBudget"), formatCurrency(p.dailyBudget, currency, locale, 0)]);
  if (p.projected !== null) rows.push([t("pacing.projected"), formatCurrency(p.projected, currency, locale, 0)]);
  rows.push([t("pacing.daysRun"), p.totalDays ? `${formatNumber(Math.min(p.daysRun, p.totalDays), locale)} / ${formatNumber(p.totalDays, locale)}` : formatNumber(p.daysRun, locale)]);
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span className={cn("font-medium", state === "over" ? "text-destructive" : state === "fast" ? "text-warning" : "")}>{t(`pacing.${state}`)}</span>
          <span className="num font-semibold">{formatPercent(pct, locale)}</span>
        </div>
        <div className="h-2.5 rounded-full bg-muted">
          <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.min(100, pct * 100)}%` }} />
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="num font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
