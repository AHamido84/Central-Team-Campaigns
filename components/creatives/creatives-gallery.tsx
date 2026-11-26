import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { CreativeRow } from "@/lib/data/creatives";
import { formatCompact, formatCurrency, formatPercent } from "@/lib/format";
import { CreativeThumb } from "./creative-thumb";
import { CreativeStatusBadge, FatigueBadge } from "./badges";

export function CreativesGallery({ rows }: { rows: CreativeRow[] }) {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
      {rows.map((c) => (
        <li key={c.id}>
          <Link href={`/creatives/${c.id}`} className="group block overflow-hidden rounded-xl border bg-card shadow-soft transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <CreativeThumb c={c} className="aspect-[4/3]" />
            <div className="space-y-2 p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <CreativeStatusBadge status={c.status} />
                {c.fatigue !== "healthy" && <FatigueBadge level={c.fatigue} />}
                <span className="num ms-auto text-[11px] text-muted-foreground">v{c.version || 1}</span>
              </div>
              <p className="line-clamp-2 min-h-10 text-sm font-medium leading-5 group-hover:underline">{c.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {c.company_name}
                {c.campaign_name && ` · ${c.campaign_name}`}
              </p>
              {c.perf ? (
                <dl className="grid grid-cols-3 gap-1 border-t pt-2 text-[11px]">
                  <div><dt className="text-muted-foreground">{t("metrics.spend")}</dt><dd className="num font-medium">{formatCompact(c.perf.spend, locale)}</dd></div>
                  <div><dt className="text-muted-foreground">CTR</dt><dd className="num font-medium">{c.perf.ctr === null ? "–" : formatPercent(c.perf.ctr, locale)}</dd></div>
                  <div><dt className="text-muted-foreground">{t("creatives.metric.cprShort")}</dt><dd className="num font-medium">{c.perf.cpr === null ? "–" : formatCurrency(c.perf.cpr, c.currency, locale)}</dd></div>
                </dl>
              ) : (
                <p className="border-t pt-2 text-[11px] text-muted-foreground">{t("creatives.noPerf")}</p>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
