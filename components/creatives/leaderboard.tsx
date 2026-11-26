import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { leaderboard, LeaderboardMetric } from "@/lib/data/creatives";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CreativeThumb } from "./creative-thumb";

type Rows = Awaited<ReturnType<typeof leaderboard>>;
const COLS: LeaderboardMetric[] = ["cpr", "ctr", "hook", "hold", "roas"];

export function Leaderboard({ rows, metric, currency }: { rows: Rows; metric: LeaderboardMetric; currency: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const fmt = (k: LeaderboardMetric, v: number | null) => (v === null ? "–" : k === "cpr" ? formatCurrency(v, currency, locale) : k === "roas" ? `${formatNumber(v, locale, 2)}x` : formatPercent(v, locale));
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-soft">
      <Table>
        <THead>
          <TR>
            <TH className="w-10 ps-4">#</TH>
            <TH>{t("creatives.creative")}</TH>
            <TH className="text-end">{t("metrics.spend")}</TH>
            {COLS.map((k) => <TH key={k} className={cn("text-end last:pe-4", k === metric && "text-foreground")}>{t(`creatives.metric.${k}`)}</TH>)}
          </TR>
        </THead>
        <TBody>
          {rows.map((r, i) => (
            <TR key={r.id}>
              <TD className="num ps-4 font-semibold text-muted-foreground">{i + 1}</TD>
              <TD className="whitespace-normal">
                <Link href={`/creatives/${r.id}`} className="flex items-center gap-3 hover:underline">
                  <CreativeThumb c={r} className="size-11 shrink-0 rounded-md" />
                  <span className="min-w-0">
                    <span className="line-clamp-1 font-medium">{r.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.company}{r.designer && ` · ${r.designer}`}</span>
                  </span>
                </Link>
              </TD>
              <TD className="num text-end">{formatCurrency(r.perf.spend, currency, locale, 0)}</TD>
              {COLS.map((k) => <TD key={k} className={cn("num text-end last:pe-4", k === metric && "bg-brand-accent/10 font-semibold")}>{fmt(k, r.perf[k])}</TD>)}
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
