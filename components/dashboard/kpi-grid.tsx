import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import type { Kpi } from "@/lib/data/analytics";
import { formatPercent } from "@/lib/format";
import { fmtMetric } from "@/lib/metric-format";
import { cn } from "@/lib/utils";

/** Arrow shows direction; color shows whether that direction is good for this metric. */
export function KpiChange({ kpi, prevLabel }: { kpi: Kpi; prevLabel?: string }) {
  const t = useTranslations();
  const locale = useLocale();
  if (kpi.change === null) return <span className="text-xs text-muted-foreground">{kpi.prev === null ? "" : t("kpi.noCompare")}</span>;
  const up = kpi.change > 0;
  const flat = Math.abs(kpi.change) < 0.005;
  const good = kpi.higherIsBetter === null || flat ? null : kpi.higherIsBetter === up;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium", good === null ? "bg-muted text-muted-foreground" : good ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}
      title={prevLabel}
    >
      <Icon className="size-3.5" aria-hidden />
      <span className="num" dir="ltr">{(up ? "+" : "") + formatPercent(kpi.change, locale)}</span>
      <span className="sr-only">{good === null ? "" : good ? t("kpi.better") : t("kpi.worse")}</span>
    </span>
  );
}

export function KpiGrid({ kpis, currency, prevLabel, labels = {} }: { kpis: Kpi[]; currency: string; prevLabel: string; labels?: Record<string, string> }) {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
      {kpis.map((k) => (
        <Card key={k.key} className="p-4">
          <p className="truncate text-xs text-muted-foreground">{t(`metrics.${labels[k.key] ?? k.key}`)}</p>
          <p className="num mt-1.5 truncate text-xl font-semibold" title={fmtMetric(k.key, k.value, currency, locale)}>{fmtMetric(k.key, k.value, currency, locale, true)}</p>
          <div className="mt-2 flex min-h-5 flex-wrap items-center gap-1.5">
            <KpiChange kpi={k} prevLabel={prevLabel} />
            {k.prev !== null && k.change !== null && <span className="num truncate text-[11px] text-muted-foreground">{fmtMetric(k.key, k.prev, currency, locale, true)}</span>}
          </div>
        </Card>
      ))}
    </div>
  );
}
